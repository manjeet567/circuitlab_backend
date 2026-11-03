import { describe, it, expect } from 'vitest';
import { CircuitGraph } from '../graph/circuit-graph.js';
import { validateCircuit } from '../graph/validator.js';
import { PlacedComponent, Wire } from '../types/component.js';

describe('Circuit Graph & Validation', () => {
  it('detects short circuit when 3V3 is wired directly to GND', () => {
    const components: PlacedComponent[] = [
      {
        id: 'esp32_1',
        type: 'esp32',
        name: 'ESP32 NodeMCU',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        properties: {},
      },
    ];

    const wires: Wire[] = [
      {
        id: 'w1',
        color: '#ff0000',
        from: { componentId: 'esp32_1', pinId: '3v3' },
        to: { componentId: 'esp32_1', pinId: 'gnd1' },
      },
    ];

    const graph = new CircuitGraph(components, wires);
    const validation = validateCircuit(graph);

    expect(validation.isValid).toBe(false);
    expect(validation.issues.some((i) => i.code === 'SHORT_CIRCUIT')).toBe(true);
  });

  it('detects LED without a current-limiting resistor across power and ground', () => {
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
        id: 'led_1',
        type: 'led',
        name: 'Red LED',
        position: [2, 0, 0],
        rotation: [0, 0, 0],
        properties: { color: 'red', forwardVoltage: 2.0, maxCurrent: 20 },
      },
    ];

    const wires: Wire[] = [
      {
        id: 'w1',
        color: '#ff0000',
        from: { componentId: 'esp32_1', pinId: '3v3' },
        to: { componentId: 'led_1', pinId: 'anode' },
      },
      {
        id: 'w2',
        color: '#000000',
        from: { componentId: 'led_1', pinId: 'cathode' },
        to: { componentId: 'esp32_1', pinId: 'gnd1' },
      },
    ];

    const graph = new CircuitGraph(components, wires);
    const validation = validateCircuit(graph);

    expect(validation.isValid).toBe(false);
    expect(validation.issues.some((i) => i.code === 'NO_CURRENT_LIMITING_RESISTOR')).toBe(true);
  });

  it('validates a correct circuit with resistor and LED in series with breadboard', () => {
    const components: PlacedComponent[] = [
      {
        id: 'esp32_1',
        type: 'esp32',
        name: 'ESP32',
        position: [-4, 0, 0],
        rotation: [0, 0, 0],
        properties: {},
      },
      {
        id: 'bb_1',
        type: 'breadboard',
        name: 'Breadboard',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        properties: {},
      },
      {
        id: 'res_1',
        type: 'resistor',
        name: '220 Ohm Resistor',
        position: [0, 0, 1],
        rotation: [0, 0, 0],
        properties: { resistance: 220 },
      },
      {
        id: 'led_1',
        type: 'led',
        name: 'Red LED',
        position: [0, 0, 3],
        rotation: [0, 0, 0],
        properties: { color: 'red', forwardVoltage: 2.0 },
      },
    ];

    // Circuit: ESP32 GPIO2 -> BB Hole A1 -> BB Hole B1 -> Resistor Lead 1
    // Resistor Lead 2 -> BB Hole A10 -> BB Hole B10 -> LED Anode
    // LED Cathode -> BB Hole A15 -> ESP32 GND
    const wires: Wire[] = [
      // Wire 1: GPIO2 to BB A1
      {
        id: 'w1',
        color: '#3b82f6',
        from: { componentId: 'esp32_1', pinId: 'gpio2' },
        to: { componentId: 'bb_1', pinId: 'hole_a1' },
      },
      // Wire 2: Resistor Pin 1 to BB B1 (internal to BB row 1)
      {
        id: 'w2',
        color: '#3b82f6',
        from: { componentId: 'res_1', pinId: 'pin1' },
        to: { componentId: 'bb_1', pinId: 'hole_b1' },
      },
      // Wire 3: Resistor Pin 2 to BB A10
      {
        id: 'w3',
        color: '#3b82f6',
        from: { componentId: 'res_1', pinId: 'pin2' },
        to: { componentId: 'bb_1', pinId: 'hole_a10' },
      },
      // Wire 4: LED Anode to BB B10 (internal to BB row 10)
      {
        id: 'w4',
        color: '#3b82f6',
        from: { componentId: 'led_1', pinId: 'anode' },
        to: { componentId: 'bb_1', pinId: 'hole_b10' },
      },
      // Wire 5: LED Cathode to BB A15
      {
        id: 'w5',
        color: '#000000',
        from: { componentId: 'led_1', pinId: 'cathode' },
        to: { componentId: 'bb_1', pinId: 'hole_a15' },
      },
      // Wire 6: BB B15 to ESP32 GND
      {
        id: 'w6',
        color: '#000000',
        from: { componentId: 'bb_1', pinId: 'hole_b15' },
        to: { componentId: 'esp32_1', pinId: 'gnd1' },
      },
    ];

    const graph = new CircuitGraph(components, wires);
    const validation = validateCircuit(graph);

    expect(validation.isValid).toBe(true);
    expect(validation.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });
});
