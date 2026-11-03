import { CircuitGraph } from '../graph/circuit-graph.js';
import { validateCircuit } from '../graph/validator.js';
import {
  SimulationStatus,
  SimulationEvent,
  LEDSimulationState,
  ResistorSimulationState,
  PushButtonSimulationState,
  DHT22SimulationState,
  ESP32SimulationState,
} from '../types/simulation.js';
import { PlacedComponent, Wire } from '../types/component.js';

export class SimulationEngine {
  private status: SimulationStatus = 'stopped';
  private graph: CircuitGraph;
  private componentStates: Map<string, any> = new Map();
  private events: SimulationEvent[] = [];
  private stepCount: number = 0;
  private onStateChange?: (states: Record<string, any>, events: SimulationEvent[]) => void;

  constructor(components: PlacedComponent[] = [], wires: Wire[]) {
    this.graph = new CircuitGraph(components, wires);
    this.reset();
  }

  public setOnStateChange(cb: (states: Record<string, any>, events: SimulationEvent[]) => void) {
    this.onStateChange = cb;
  }

  public updateCircuit(components: PlacedComponent[], wires: Wire[]) {
    this.graph.updateGraph(components, wires);
    if (this.status === 'running') {
      this.step();
    }
  }

  public getStatus(): SimulationStatus {
    return this.status;
  }

  public getEvents(): SimulationEvent[] {
    return [...this.events];
  }

  public getComponentStates(): Record<string, any> {
    const obj: Record<string, any> = {};
    for (const [id, state] of this.componentStates.entries()) {
      obj[id] = { ...state };
    }
    return obj;
  }

  public getComponentState<T = any>(componentId: string): T | undefined {
    return this.componentStates.get(componentId);
  }

  public start(): { success: boolean; issues: any[] } {
    const validation = validateCircuit(this.graph);

    this.logEvent(
      'system',
      'Simulation started.',
      { valid: validation.isValid, issueCount: validation.issues.length }
    );

    if (!validation.isValid) {
      this.status = 'error';
      for (const issue of validation.issues) {
        if (issue.severity === 'error') {
          this.logEvent('error', issue.message);
        }
      }
      this.notify();
      return { success: false, issues: validation.issues };
    }

    this.status = 'running';
    this.step();
    return { success: true, issues: validation.issues };
  }

  public stop() {
    this.status = 'stopped';
    this.logEvent('system', 'Simulation stopped.');
    this.resetComponentOutputs();
    this.notify();
  }

  public reset() {
    this.status = 'stopped';
    this.stepCount = 0;
    this.events = [];
    this.componentStates.clear();

    // Initialize states from placed components
    for (const comp of this.graph.getAllComponents()) {
      if (comp.type === 'esp32') {
        const props = comp.properties as any;
        const initialEsp: ESP32SimulationState = {
          gpioOutputs: { ...(props?.gpioStates || { 2: 'LOW' }) },
          gpioInputs: {},
          gpioModes: { ...(props?.gpioModes || { 2: 'OUTPUT' }) },
        };
        this.componentStates.set(comp.id, initialEsp);
      } else if (comp.type === 'led') {
        const initialLed: LEDSimulationState = {
          lit: false,
          forwardVoltage: (comp.properties as any)?.forwardVoltage || 2.0,
          current_mA: 0,
          brightness: 0,
        };
        this.componentStates.set(comp.id, initialLed);
      } else if (comp.type === 'resistor') {
        const initialRes: ResistorSimulationState = {
          voltageDrop: 0,
          current_mA: 0,
        };
        this.componentStates.set(comp.id, initialRes);
      } else if (comp.type === 'push_button') {
        const initialBtn: PushButtonSimulationState = {
          pressed: (comp.properties as any)?.isPressed || false,
          closed: (comp.properties as any)?.isPressed || false,
        };
        this.componentStates.set(comp.id, initialBtn);
      } else if (comp.type === 'dht22') {
        const initialDht: DHT22SimulationState = {
          temperature: (comp.properties as any)?.temperature ?? 24.0,
          humidity: (comp.properties as any)?.humidity ?? 50.0,
          active: false,
        };
        this.componentStates.set(comp.id, initialDht);
      }
    }

    this.logEvent('system', 'Simulation environment reset to initial state.');
    this.notify();
  }

  /**
   * Set ESP32 GPIO pin mode (INPUT or OUTPUT)
   */
  public setPinMode(esp32Id: string, pinNumber: number, mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP') {
    const esp = this.componentStates.get(esp32Id) as ESP32SimulationState;
    if (esp) {
      esp.gpioModes[pinNumber] = mode;
      this.logEvent('gpio', `ESP32 GPIO${pinNumber} mode set to ${mode}`);
      if (this.status === 'running') this.step();
    }
  }

  /**
   * Write ESP32 GPIO output (HIGH or LOW)
   */
  public digitalWrite(esp32Id: string, pinNumber: number, value: 'HIGH' | 'LOW') {
    const esp = this.componentStates.get(esp32Id) as ESP32SimulationState;
    if (esp) {
      const prev = esp.gpioOutputs[pinNumber];
      esp.gpioOutputs[pinNumber] = value;
      if (prev !== value) {
        this.logEvent('gpio', `ESP32 GPIO${pinNumber} set to ${value}`);
      }
      if (this.status === 'running') this.step();
    }
  }

  /**
   * Toggle button press / release
   */
  public setButtonState(buttonId: string, isPressed: boolean) {
    const btn = this.componentStates.get(buttonId) as PushButtonSimulationState;
    if (btn) {
      btn.pressed = isPressed;
      btn.closed = isPressed;
      this.logEvent(
        'button',
        `Push button (${buttonId}) ${isPressed ? 'PRESSED' : 'RELEASED'}`
      );
      if (this.status === 'running') this.step();
    }
  }

  /**
   * Update DHT22 environment sensor properties
   */
  public setSensorEnvironment(dhtId: string, temperature: number, humidity: number) {
    const dht = this.componentStates.get(dhtId) as DHT22SimulationState;
    if (dht) {
      dht.temperature = temperature;
      dht.humidity = humidity;
      if (this.status === 'running' && dht.active) {
        this.logEvent(
          'sensor',
          `DHT22 (${dhtId}) reading: ${temperature.toFixed(1)}°C, ${humidity.toFixed(1)}% RH`
        );
      }
      this.notify();
    }
  }

  /**
   * Solves the circuit electrical states:
   * 1. Resolves all nets taking into account closed switches (buttons).
   * 2. Evaluates ESP32 inputs.
   * 3. Evaluates DHT22 active state.
   * 4. Evaluates LED currents and illumination.
   */
  public step() {
    this.stepCount++;
    const nets = this.graph.computeNets();
    const components = this.graph.getAllComponents();

    // 1. Resolve Push Buttons: If button is pressed, its terminals connect their nets
    // For each pressed button, merge the nets of terminal 1 and terminal 2
    const pressedButtons = components.filter((c) => {
      if (c.type !== 'push_button') return false;
      const st = this.componentStates.get(c.id) as PushButtonSimulationState;
      return st?.pressed;
    });

    // Helper: determine if pin A and pin B are electrically connected considering pressed buttons
    const areConnectedWithSwitches = (
      compA: string,
      pinA: string,
      compB: string,
      pinB: string,
      visited: Set<string> = new Set()
    ): boolean => {
      const key = `${compA}:${pinA}`;
      if (visited.has(key)) return false;
      visited.add(key);

      if (this.graph.arePinsElectricallyConnected(compA, pinA, compB, pinB)) {
        return true;
      }

      // Check through pressed buttons
      for (const btn of pressedButtons) {
        // Button terminal 1 is pin1a/pin1b, terminal 2 is pin2a/pin2b
        const atTerm1 =
          this.graph.arePinsElectricallyConnected(compA, pinA, btn.id, 'pin1a') ||
          this.graph.arePinsElectricallyConnected(compA, pinA, btn.id, 'pin1b');
        const atTerm2 =
          this.graph.arePinsElectricallyConnected(compA, pinA, btn.id, 'pin2a') ||
          this.graph.arePinsElectricallyConnected(compA, pinA, btn.id, 'pin2b');

        if (atTerm1) {
          if (areConnectedWithSwitches(btn.id, 'pin2a', compB, pinB, visited)) return true;
        } else if (atTerm2) {
          if (areConnectedWithSwitches(btn.id, 'pin1a', compB, pinB, visited)) return true;
        }
      }
      return false;
    };

    // Helper to find if a pin reaches ground
    const pinReachesGround = (comp: string, pin: string): boolean => {
      for (const c of components) {
        if (c.type === 'esp32') {
          if (areConnectedWithSwitches(comp, pin, c.id, 'gnd1')) return true;
          if (areConnectedWithSwitches(comp, pin, c.id, 'gnd2')) return true;
        }
      }
      return false;
    };

    // Helper to find if a pin reaches a HIGH source (3.3V or active HIGH GPIO)
    const pinReachesHighSource = (
      comp: string,
      pin: string
    ): { reachesHigh: boolean; sourceVoltage: number; sourcePin?: string } => {
      for (const c of components) {
        if (c.type === 'esp32') {
          // Direct 3V3
          if (areConnectedWithSwitches(comp, pin, c.id, '3v3')) {
            return { reachesHigh: true, sourceVoltage: 3.3, sourcePin: '3v3' };
          }
          // Direct VIN (5V)
          if (areConnectedWithSwitches(comp, pin, c.id, 'vin')) {
            return { reachesHigh: true, sourceVoltage: 5.0, sourcePin: 'vin' };
          }
          // Check GPIO outputs
          const espState = this.componentStates.get(c.id) as ESP32SimulationState;
          if (espState) {
            for (const [gpioStr, val] of Object.entries(espState.gpioOutputs)) {
              const gpioNum = parseInt(gpioStr, 10);
              const mode = espState.gpioModes[gpioNum] || 'OUTPUT';
              if (mode === 'OUTPUT' && val === 'HIGH') {
                if (areConnectedWithSwitches(comp, pin, c.id, `gpio${gpioNum}`)) {
                  return { reachesHigh: true, sourceVoltage: 3.3, sourcePin: `gpio${gpioNum}` };
                }
              }
            }
          }
        }
      }
      return { reachesHigh: false, sourceVoltage: 0 };
    };

    // 2. Evaluate ESP32 Inputs (e.g. Buttons connected to GPIO)
    for (const c of components) {
      if (c.type === 'esp32') {
        const espState = this.componentStates.get(c.id) as ESP32SimulationState;
        if (!espState) continue;

        for (const [gpioStr, mode] of Object.entries(espState.gpioModes)) {
          const gpioNum = parseInt(gpioStr, 10);
          if (mode === 'INPUT' || mode === 'INPUT_PULLUP') {
            const reachesGnd = pinReachesGround(c.id, `gpio${gpioNum}`);
            const reachesHigh = pinReachesHighSource(c.id, `gpio${gpioNum}`).reachesHigh;

            let readValue: 'HIGH' | 'LOW' = 'LOW';
            if (reachesHigh) {
              readValue = 'HIGH';
            } else if (reachesGnd) {
              readValue = 'LOW';
            } else if (mode === 'INPUT_PULLUP') {
              // Default to HIGH when not pulled down to GND
              readValue = 'HIGH';
            }

            const prev = espState.gpioInputs[gpioNum];
            espState.gpioInputs[gpioNum] = readValue;
            if (prev !== undefined && prev !== readValue) {
              this.logEvent('gpio', `ESP32 GPIO${gpioNum} read input: ${readValue}`);
            }
          }
        }
      }
    }

    // 3. Evaluate DHT22 Sensor
    for (const c of components) {
      if (c.type === 'dht22') {
        const dhtState = this.componentStates.get(c.id) as DHT22SimulationState;
        if (!dhtState) continue;

        const hasVcc = pinReachesHighSource(c.id, 'vcc').reachesHigh;
        const hasGnd = pinReachesGround(c.id, 'gnd');
        const isActive = hasVcc && hasGnd;

        const prevActive = dhtState.active;
        dhtState.active = isActive;

        if (!prevActive && isActive) {
          this.logEvent(
            'sensor',
            `DHT22 (${c.name}) initialized. Temp: ${dhtState.temperature}°C, Humidity: ${dhtState.humidity}%`
          );
        }
      }
    }

    // 4. Evaluate LEDs and Resistors
    for (const led of components) {
      if (led.type !== 'led') continue;
      const ledState = this.componentStates.get(led.id) as LEDSimulationState;
      if (!ledState) continue;

      // In a forward-biased LED circuit:
      // Path 1: Source -> Anode -> Cathode -> Resistor -> GND
      // Path 2: Source -> Resistor -> Anode -> Cathode -> GND
      // Check for Resistors in the circuit
      const resistors = components.filter((comp) => comp.type === 'resistor');

      let isIlluminated = false;
      let calculatedCurrent_mA = 0;
      let voltageSupply = 0;

      // Check configuration A: Anode connected to resistor, resistor to HIGH source, Cathode to GND
      for (const res of resistors) {
        const resState = this.componentStates.get(res.id) as ResistorSimulationState;
        const rVal = (res.properties as any)?.resistance || 220;

        // Anode to Resistor lead1, Resistor lead2 to HIGH source, Cathode to GND
        const anodeToLead1 = areConnectedWithSwitches(led.id, 'anode', res.id, 'pin1');
        const anodeToLead2 = areConnectedWithSwitches(led.id, 'anode', res.id, 'pin2');
        const cathodeToLead1 = areConnectedWithSwitches(led.id, 'cathode', res.id, 'pin1');
        const cathodeToLead2 = areConnectedWithSwitches(led.id, 'cathode', res.id, 'pin2');

        const cathodeToGnd = pinReachesGround(led.id, 'cathode');
        const anodeToGnd = pinReachesGround(led.id, 'anode');

        if (anodeToLead1 && cathodeToGnd) {
          const high = pinReachesHighSource(res.id, 'pin2');
          if (high.reachesHigh) {
            voltageSupply = high.sourceVoltage;
            calculatedCurrent_mA = Math.max(0, ((voltageSupply - ledState.forwardVoltage) / rVal) * 1000);
            if (calculatedCurrent_mA > 1.0) {
              isIlluminated = true;
              if (resState) {
                resState.current_mA = calculatedCurrent_mA;
                resState.voltageDrop = voltageSupply - ledState.forwardVoltage;
              }
            }
          }
        } else if (anodeToLead2 && cathodeToGnd) {
          const high = pinReachesHighSource(res.id, 'pin1');
          if (high.reachesHigh) {
            voltageSupply = high.sourceVoltage;
            calculatedCurrent_mA = Math.max(0, ((voltageSupply - ledState.forwardVoltage) / rVal) * 1000);
            if (calculatedCurrent_mA > 1.0) {
              isIlluminated = true;
              if (resState) {
                resState.current_mA = calculatedCurrent_mA;
                resState.voltageDrop = voltageSupply - ledState.forwardVoltage;
              }
            }
          }
        } else if (cathodeToLead1 && !anodeToGnd) {
          // Anode to High, Cathode to Resistor, Resistor to GND
          const high = pinReachesHighSource(led.id, 'anode');
          const lead2ToGnd = pinReachesGround(res.id, 'pin2');
          if (high.reachesHigh && lead2ToGnd) {
            voltageSupply = high.sourceVoltage;
            calculatedCurrent_mA = Math.max(0, ((voltageSupply - ledState.forwardVoltage) / rVal) * 1000);
            if (calculatedCurrent_mA > 1.0) {
              isIlluminated = true;
              if (resState) {
                resState.current_mA = calculatedCurrent_mA;
                resState.voltageDrop = voltageSupply - ledState.forwardVoltage;
              }
            }
          }
        } else if (cathodeToLead2 && !anodeToGnd) {
          const high = pinReachesHighSource(led.id, 'anode');
          const lead1ToGnd = pinReachesGround(res.id, 'pin1');
          if (high.reachesHigh && lead1ToGnd) {
            voltageSupply = high.sourceVoltage;
            calculatedCurrent_mA = Math.max(0, ((voltageSupply - ledState.forwardVoltage) / rVal) * 1000);
            if (calculatedCurrent_mA > 1.0) {
              isIlluminated = true;
              if (resState) {
                resState.current_mA = calculatedCurrent_mA;
                resState.voltageDrop = voltageSupply - ledState.forwardVoltage;
              }
            }
          }
        }
      }

      // Check if directly connected without resistor (though warned in validator)
      if (!isIlluminated) {
        const directHigh = pinReachesHighSource(led.id, 'anode');
        const directGnd = pinReachesGround(led.id, 'cathode');
        if (directHigh.reachesHigh && directGnd) {
          isIlluminated = true;
          calculatedCurrent_mA = 50; // high current warning
        }
      }

      const prevLit = ledState.lit;
      ledState.lit = isIlluminated;
      ledState.current_mA = isIlluminated ? calculatedCurrent_mA : 0;
      ledState.brightness = isIlluminated ? Math.min(1.0, calculatedCurrent_mA / 20) : 0;

      if (prevLit !== isIlluminated) {
        this.logEvent(
          'led',
          `LED (${led.name}) is now ${isIlluminated ? 'ON (illuminated)' : 'OFF'} [${calculatedCurrent_mA.toFixed(1)} mA]`
        );
      }
    }

    this.notify();
  }

  private resetComponentOutputs() {
    for (const [id, state] of this.componentStates.entries()) {
      if (state.lit !== undefined) {
        state.lit = false;
        state.current_mA = 0;
        state.brightness = 0;
      }
      if (state.voltageDrop !== undefined) {
        state.voltageDrop = 0;
        state.current_mA = 0;
      }
    }
  }

  private logEvent(type: SimulationEvent['type'], message: string, data?: Record<string, any>) {
    const event: SimulationEvent = {
      id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      type,
      message,
      data,
    };
    this.events.unshift(event);
    if (this.events.length > 200) {
      this.events.pop();
    }
  }

  private notify() {
    if (this.onStateChange) {
      this.onStateChange(this.getComponentStates(), this.getEvents());
    }
  }
}
