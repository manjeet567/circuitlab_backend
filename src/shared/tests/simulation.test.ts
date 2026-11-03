import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../simulation/engine.js';
import { PlacedComponent, Wire } from '../types/component.js';

describe('Simulation Engine', () => {
  it('controls LED illumination based on ESP32 GPIO HIGH/LOW state', () => {
    const components: PlacedComponent[] = [
      {
        id: 'esp32_1',
        type: 'esp32',
        name: 'ESP32',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        properties: {},
      },
      {
        id: 'res_1',
        type: 'resistor',
        name: '220 Ohm',
        position: [2, 0, 0],
        rotation: [0, 0, 0],
        properties: { resistance: 220 },
      },
      {
        id: 'led_1',
        type: 'led',
        name: 'Blue LED',
        position: [4, 0, 0],
        rotation: [0, 0, 0],
        properties: { color: 'blue', forwardVoltage: 2.2 },
      },
    ];

    const wires: Wire[] = [
      {
        id: 'w1',
        color: '#3b82f6',
        from: { componentId: 'esp32_1', pinId: 'gpio2' },
        to: { componentId: 'res_1', pinId: 'pin1' },
      },
      {
        id: 'w2',
        color: '#3b82f6',
        from: { componentId: 'res_1', pinId: 'pin2' },
        to: { componentId: 'led_1', pinId: 'anode' },
      },
      {
        id: 'w3',
        color: '#000000',
        from: { componentId: 'led_1', pinId: 'cathode' },
        to: { componentId: 'esp32_1', pinId: 'gnd1' },
      },
    ];

    const engine = new SimulationEngine(components, wires);
    const startResult = engine.start();
    expect(startResult.success).toBe(true);

    // Initial state: GPIO2 is LOW -> LED should be OFF
    let ledState = engine.getComponentState('led_1');
    expect(ledState.lit).toBe(false);

    // Turn GPIO2 HIGH -> LED should turn ON
    engine.digitalWrite('esp32_1', 2, 'HIGH');
    ledState = engine.getComponentState('led_1');
    expect(ledState.lit).toBe(true);
    expect(ledState.current_mA).toBeGreaterThan(0);

    // Turn GPIO2 LOW -> LED turns OFF
    engine.digitalWrite('esp32_1', 2, 'LOW');
    ledState = engine.getComponentState('led_1');
    expect(ledState.lit).toBe(false);

    // Stop simulation resets outputs
    engine.digitalWrite('esp32_1', 2, 'HIGH');
    expect(engine.getComponentState('led_1').lit).toBe(true);
    engine.stop();
    expect(engine.getComponentState('led_1').lit).toBe(false);
  });

  it('reads push button state transitions and updates ESP32 input', () => {
    const components: PlacedComponent[] = [
      {
        id: 'esp32_1',
        type: 'esp32',
        name: 'ESP32',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        properties: {},
      },
      {
        id: 'btn_1',
        type: 'push_button',
        name: 'Button',
        position: [2, 0, 0],
        rotation: [0, 0, 0],
        properties: {},
      },
    ];

    // Wire: GPIO4 -> Button Pin 1A, Button Pin 2A -> ESP32 GND
    const wires: Wire[] = [
      {
        id: 'w1',
        color: '#10b981',
        from: { componentId: 'esp32_1', pinId: 'gpio4' },
        to: { componentId: 'btn_1', pinId: 'pin1a' },
      },
      {
        id: 'w2',
        color: '#000000',
        from: { componentId: 'btn_1', pinId: 'pin2a' },
        to: { componentId: 'esp32_1', pinId: 'gnd1' },
      },
    ];

    const engine = new SimulationEngine(components, wires);
    engine.setPinMode('esp32_1', 4, 'INPUT_PULLUP');
    engine.start();

    // Default: Button released -> Internal pullup reads HIGH
    let esp = engine.getComponentState('esp32_1');
    expect(esp.gpioInputs[4]).toBe('HIGH');

    // Press button -> Pulls GPIO4 to GND -> Reads LOW
    engine.setButtonState('btn_1', true);
    esp = engine.getComponentState('esp32_1');
    expect(esp.gpioInputs[4]).toBe('LOW');

    // Release button -> Reads HIGH again
    engine.setButtonState('btn_1', false);
    esp = engine.getComponentState('esp32_1');
    expect(esp.gpioInputs[4]).toBe('HIGH');
  });

  it('activates DHT22 sensor when powered and logs telemetry', () => {
    const components: PlacedComponent[] = [
      {
        id: 'esp32_1',
        type: 'esp32',
        name: 'ESP32',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        properties: {},
      },
      {
        id: 'dht_1',
        type: 'dht22',
        name: 'DHT22',
        position: [3, 0, 0],
        rotation: [0, 0, 0],
        properties: { temperature: 28.5, humidity: 62.0 },
      },
    ];

    const wires: Wire[] = [
      {
        id: 'w1',
        color: '#ef4444',
        from: { componentId: 'esp32_1', pinId: '3v3' },
        to: { componentId: 'dht_1', pinId: 'vcc' },
      },
      {
        id: 'w2',
        color: '#000000',
        from: { componentId: 'esp32_1', pinId: 'gnd1' },
        to: { componentId: 'dht_1', pinId: 'gnd' },
      },
    ];

    const engine = new SimulationEngine(components, wires);
    engine.start();

    const dhtState = engine.getComponentState('dht_1');
    expect(dhtState.active).toBe(true);
    expect(dhtState.temperature).toBe(28.5);
    expect(dhtState.humidity).toBe(62.0);

    // Update sensor environment readings
    engine.setSensorEnvironment('dht_1', 31.0, 75.0);
    const updated = engine.getComponentState('dht_1');
    expect(updated.temperature).toBe(31.0);
    expect(updated.humidity).toBe(75.0);
  });
});
