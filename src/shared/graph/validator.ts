import { CircuitGraph } from './circuit-graph.js';
import { CircuitValidationResult, CircuitValidationIssue } from '../types/circuit.js';
import { COMPONENT_METADATA } from '../constants/components.js';

export function validateCircuit(graph: CircuitGraph): CircuitValidationResult {
  const issues: CircuitValidationIssue[] = [];
  const components = graph.getAllComponents();
  const wires = graph.getAllWires();
  const nets = graph.computeNets();

  if (components.length === 0) {
    return {
      isValid: true,
      issues: [],
    };
  }

  // 1. Check for Short Circuits (VCC and GND in the same net!)
  for (const net of nets) {
    if (net.hasVCC && net.hasGND) {
      issues.push({
        severity: 'error',
        code: 'SHORT_CIRCUIT',
        message: `Short circuit detected! Power (VCC/3V3) is directly connected to Ground in ${net.id}.`,
        componentIds: net.pins.map((p) => p.componentId),
      });
    }
  }

  // 2. Check for missing ground when power or ESP32 exists
  const hasESP32 = components.some((c) => c.type === 'esp32');
  const gndNetExists = nets.some((n) => n.hasGND);
  if (hasESP32 && !gndNetExists && wires.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'MISSING_GROUND',
      message: 'Circuit is missing a Ground (GND) connection back to the ESP32.',
    });
  }

  // 3. Inspect individual components
  for (const comp of components) {
    if (comp.type === 'breadboard') continue;

    const meta = COMPONENT_METADATA[comp.type];
    if (!meta) continue;

    // Check if component has any wires/connections at all
    const connectedPins = meta.pins.filter((pin) => {
      const net = graph.findNetForPin(comp.id, pin.id, nets);
      return !!net && net.pins.length > 1;
    });

    if (connectedPins.length === 0 && components.length > 1) {
      issues.push({
        severity: 'warning',
        code: 'MISSING_CONNECTIONS',
        message: `${comp.name} (${comp.id}) is placed but has no connections.`,
        componentIds: [comp.id],
      });
      continue;
    }

    // 4. LED Specific Validation
    if (comp.type === 'led') {
      const anodeNet = graph.findNetForPin(comp.id, 'anode', nets);
      const cathodeNet = graph.findNetForPin(comp.id, 'cathode', nets);

      if (!anodeNet || !cathodeNet || anodeNet.pins.length <= 1 || cathodeNet.pins.length <= 1) {
        issues.push({
          severity: 'info',
          code: 'INCOMPLETE_CIRCUIT',
          message: `LED (${comp.name}) circuit is incomplete. Both anode and cathode must be connected.`,
          componentIds: [comp.id],
        });
      } else if (anodeNet.id === cathodeNet.id) {
        issues.push({
          severity: 'warning',
          code: 'INVALID_PIN_CONNECTION',
          message: `LED (${comp.name}) anode and cathode are shorted together on the same electrical net.`,
          componentIds: [comp.id],
        });
      } else {
        // Check for current limiting resistor in series with LED
        // If anode has direct VCC and cathode has direct GND (or vice-versa), warn NO_CURRENT_LIMITING_RESISTOR
        const directPowerToAnode = anodeNet.hasVCC || anodeNet.gpioPins.length > 0;
        const directGndToCathode = cathodeNet.hasGND;
        const directPowerToCathode = cathodeNet.hasVCC || cathodeNet.gpioPins.length > 0;
        const directGndToAnode = anodeNet.hasGND;

        // Check if resistor is connected in series with this LED
        const resistors = components.filter((c) => c.type === 'resistor');
        const hasSeriesResistor = resistors.some((r) => {
          const r1Net = graph.findNetForPin(r.id, 'pin1', nets);
          const r2Net = graph.findNetForPin(r.id, 'pin2', nets);
          return (
            (r1Net && (r1Net.id === anodeNet.id || r1Net.id === cathodeNet.id)) ||
            (r2Net && (r2Net.id === anodeNet.id || r2Net.id === cathodeNet.id))
          );
        });

        if (((directPowerToAnode && directGndToCathode) || (directPowerToCathode && directGndToAnode)) && !hasSeriesResistor) {
          issues.push({
            severity: 'error',
            code: 'NO_CURRENT_LIMITING_RESISTOR',
            message: `LED (${comp.name}) is connected across power and ground without a current-limiting resistor! This would burn out a real LED.`,
            componentIds: [comp.id],
          });
        }
      }
    }

    // 5. DHT22 Validation
    if (comp.type === 'dht22') {
      const vccNet = graph.findNetForPin(comp.id, 'vcc', nets);
      const gndNet = graph.findNetForPin(comp.id, 'gnd', nets);
      const dataNet = graph.findNetForPin(comp.id, 'data', nets);

      if (!vccNet?.hasVCC) {
        issues.push({
          severity: 'warning',
          code: 'INCOMPLETE_CIRCUIT',
          message: `DHT22 (${comp.name}) Pin 1 (VCC) must be connected to 3.3V or VIN.`,
          componentIds: [comp.id],
        });
      }
      if (!gndNet?.hasGND) {
        issues.push({
          severity: 'warning',
          code: 'INCOMPLETE_CIRCUIT',
          message: `DHT22 (${comp.name}) Pin 4 (GND) must be connected to Ground.`,
          componentIds: [comp.id],
        });
      }
      if (!dataNet || dataNet.gpioPins.length === 0) {
        issues.push({
          severity: 'info',
          code: 'FLOATING_INPUT',
          message: `DHT22 (${comp.name}) Pin 2 (DATA) is not connected to an ESP32 GPIO pin.`,
          componentIds: [comp.id],
        });
      }
    }

    // 6. Push Button Validation
    if (comp.type === 'push_button') {
      const net1 = graph.findNetForPin(comp.id, 'pin1a', nets) || graph.findNetForPin(comp.id, 'pin1b', nets);
      const net2 = graph.findNetForPin(comp.id, 'pin2a', nets) || graph.findNetForPin(comp.id, 'pin2b', nets);

      if ((!net1 || net1.pins.length <= 1) && (!net2 || net2.pins.length <= 1)) {
        issues.push({
          severity: 'info',
          code: 'MISSING_CONNECTIONS',
          message: `Push button (${comp.name}) has no connected terminals.`,
          componentIds: [comp.id],
        });
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    isValid: !hasErrors,
    issues,
  };
}
