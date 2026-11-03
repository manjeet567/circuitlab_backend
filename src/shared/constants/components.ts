import { ComponentType, PinDefinition, AnyComponentProperties } from '../types/component.js';

export const COMPONENT_METADATA: Record<
  ComponentType,
  {
    name: string;
    category: 'microcontroller' | 'sensor' | 'actuator' | 'passive' | 'input' | 'prototyping';
    description: string;
    pins: PinDefinition[];
    defaultProperties: AnyComponentProperties;
    dimensions: [number, number, number]; // width, height, depth in scene units
  }
> = {
  esp32: {
    name: 'ESP32 NodeMCU',
    category: 'microcontroller',
    description: '30-pin ESP-WROOM-32 Wi-Fi & Bluetooth development board with rich GPIO.',
    dimensions: [5.2, 0.3, 2.8],
    pins: [
      // Left row (top to bottom, x = -1.2, y = -0.15)
      { id: '3v3', name: '3V3', type: 'power', position: [-1.2, -0.15, -1.75], description: '3.3V Power Out' },
      { id: 'en', name: 'EN', type: 'passive', position: [-1.2, -0.15, -1.5], description: 'Reset / Enable' },
      { id: 'gpio36', name: 'GPIO36 / VP', type: 'gpio', gpioNumber: 36, position: [-1.2, -0.15, -1.25] },
      { id: 'gpio39', name: 'GPIO39 / VN', type: 'gpio', gpioNumber: 39, position: [-1.2, -0.15, -1.0] },
      { id: 'gpio34', name: 'GPIO34', type: 'gpio', gpioNumber: 34, position: [-1.2, -0.15, -0.75] },
      { id: 'gpio35', name: 'GPIO35', type: 'gpio', gpioNumber: 35, position: [-1.2, -0.15, -0.5] },
      { id: 'gpio32', name: 'GPIO32', type: 'gpio', gpioNumber: 32, position: [-1.2, -0.15, -0.25] },
      { id: 'gpio33', name: 'GPIO33', type: 'gpio', gpioNumber: 33, position: [-1.2, -0.15, 0.0] },
      { id: 'gpio25', name: 'GPIO25', type: 'gpio', gpioNumber: 25, position: [-1.2, -0.15, 0.25] },
      { id: 'gpio26', name: 'GPIO26', type: 'gpio', gpioNumber: 26, position: [-1.2, -0.15, 0.5] },
      { id: 'gpio27', name: 'GPIO27', type: 'gpio', gpioNumber: 27, position: [-1.2, -0.15, 0.75] },
      { id: 'gpio14', name: 'GPIO14', type: 'gpio', gpioNumber: 14, position: [-1.2, -0.15, 1.0] },
      { id: 'gpio12', name: 'GPIO12', type: 'gpio', gpioNumber: 12, position: [-1.2, -0.15, 1.25] },
      { id: 'gnd1', name: 'GND', type: 'ground', position: [-1.2, -0.15, 1.5], description: 'Ground' },
      { id: 'gpio13', name: 'GPIO13', type: 'gpio', gpioNumber: 13, position: [-1.2, -0.15, 1.75] },

      // Right row (top to bottom, x = 1.2, y = -0.15)
      { id: 'vin', name: 'VIN (5V)', type: 'power', position: [1.2, -0.15, -1.75], description: '5V Power Input/Output' },
      { id: 'gnd2', name: 'GND', type: 'ground', position: [1.2, -0.15, -1.5], description: 'Ground' },
      { id: 'gpio23', name: 'GPIO23', type: 'gpio', gpioNumber: 23, position: [1.2, -0.15, -1.25] },
      { id: 'gpio22', name: 'GPIO22', type: 'gpio', gpioNumber: 22, position: [1.2, -0.15, -1.0] },
      { id: 'gpio1', name: 'GPIO1 / TX0', type: 'gpio', gpioNumber: 1, position: [1.2, -0.15, -0.75] },
      { id: 'gpio3', name: 'GPIO3 / RX0', type: 'gpio', gpioNumber: 3, position: [1.2, -0.15, -0.5] },
      { id: 'gpio21', name: 'GPIO21', type: 'gpio', gpioNumber: 21, position: [1.2, -0.15, -0.25] },
      { id: 'gpio19', name: 'GPIO19', type: 'gpio', gpioNumber: 19, position: [1.2, -0.15, 0.0] },
      { id: 'gpio18', name: 'GPIO18', type: 'gpio', gpioNumber: 18, position: [1.2, -0.15, 0.25] },
      { id: 'gpio5', name: 'GPIO5', type: 'gpio', gpioNumber: 5, position: [1.2, -0.15, 0.5] },
      { id: 'gpio17', name: 'GPIO17 / TX2', type: 'gpio', gpioNumber: 17, position: [1.2, -0.15, 0.75] },
      { id: 'gpio16', name: 'GPIO16 / RX2', type: 'gpio', gpioNumber: 16, position: [1.2, -0.15, 1.0] },
      { id: 'gpio4', name: 'GPIO4', type: 'gpio', gpioNumber: 4, position: [1.2, -0.15, 1.25] },
      { id: 'gpio2', name: 'GPIO2', type: 'gpio', gpioNumber: 2, position: [1.2, -0.15, 1.5] },
      { id: 'gpio15', name: 'GPIO15', type: 'gpio', gpioNumber: 15, position: [1.2, -0.15, 1.75] },
    ],
    defaultProperties: {
      boardName: 'ESP32 NodeMCU',
      gpioStates: { 2: 'LOW', 4: 'LOW', 5: 'LOW', 18: 'LOW', 19: 'LOW', 21: 'LOW', 22: 'LOW', 23: 'LOW' },
      gpioModes: { 2: 'OUTPUT', 4: 'INPUT', 5: 'OUTPUT', 18: 'OUTPUT', 19: 'OUTPUT', 21: 'OUTPUT', 22: 'OUTPUT', 23: 'OUTPUT' },
    },
  },

  led: {
    name: '5mm LED',
    category: 'actuator',
    description: 'Light Emitting Diode with anode (+) and cathode (-) leads.',
    dimensions: [0.6, 0.9, 0.6],
    pins: [
      { id: 'anode', name: 'Anode (+)', type: 'passive', position: [-0.15, -0.45, 0], description: 'Positive lead (longer pin)' },
      { id: 'cathode', name: 'Cathode (-)', type: 'passive', position: [0.15, -0.45, 0], description: 'Negative lead (shorter pin, flat rim)' },
    ],
    defaultProperties: {
      color: 'red',
      forwardVoltage: 2.0,
      maxCurrent: 20,
    },
  },

  resistor: {
    name: 'Through-Hole Resistor',
    category: 'passive',
    description: '1/4W axial lead metal film resistor with 4-band EIA color code.',
    dimensions: [1.6, 0.4, 0.4],
    pins: [
      { id: 'pin1', name: 'Lead 1', type: 'passive', position: [-0.7, 0, 0] },
      { id: 'pin2', name: 'Lead 2', type: 'passive', position: [0.7, 0, 0] },
    ],
    defaultProperties: {
      resistance: 220,
      tolerance: 5,
    },
  },

  push_button: {
    name: 'Tactile Push Button',
    category: 'input',
    description: 'Normally-open momentary tactile push switch (6x6mm).',
    dimensions: [0.8, 0.5, 0.8],
    pins: [
      { id: 'pin1a', name: 'Terminal 1A', type: 'passive', position: [-0.35, -0.2, -0.25] },
      { id: 'pin1b', name: 'Terminal 1B', type: 'passive', position: [-0.35, -0.2, 0.25] },
      { id: 'pin2a', name: 'Terminal 2A', type: 'passive', position: [0.35, -0.2, -0.25] },
      { id: 'pin2b', name: 'Terminal 2B', type: 'passive', position: [0.35, -0.2, 0.25] },
    ],
    defaultProperties: {
      isPressed: false,
      pullMode: 'pullup',
    },
  },

  dht22: {
    name: 'DHT22 AM2302 Sensor',
    category: 'sensor',
    description: 'Digital humidity and temperature sensor with calibrated output.',
    dimensions: [1.5, 2.0, 0.8],
    pins: [
      { id: 'vcc', name: 'Pin 1: VCC (3.3-5V)', type: 'power', position: [-0.375, -0.9, 0] },
      { id: 'data', name: 'Pin 2: DATA', type: 'gpio', position: [-0.125, -0.9, 0] },
      { id: 'nc', name: 'Pin 3: NC', type: 'passive', position: [0.125, -0.9, 0], description: 'Do not connect' },
      { id: 'gnd', name: 'Pin 4: GND', type: 'ground', position: [0.375, -0.9, 0] },
    ],
    defaultProperties: {
      temperature: 24.5,
      humidity: 50.0,
    },
  },

  breadboard: {
    name: 'Half-Size Breadboard',
    category: 'prototyping',
    description: 'Solderless breadboard with 30 rows of 5-hole terminal strips and dual power rails.',
    dimensions: [8.2, 0.8, 5.5],
    pins: [], // Breadboard pins are dynamically generated by breadboard generator
    defaultProperties: {
      rows: 30,
      cols: 10,
      hasPowerRails: true,
    },
  },
};

export const WIRE_COLORS = [
  { name: 'Red (+ / VCC)', hex: '#ef4444' },
  { name: 'Black (GND)', hex: '#1f2937' },
  { name: 'Blue (Signals / Data)', hex: '#3b82f6' },
  { name: 'Green (Digital I/O)', hex: '#10b981' },
  { name: 'Yellow (Clock / Analog)', hex: '#eab308' },
  { name: 'Orange (Special / Control)', hex: '#f97316' },
  { name: 'White', hex: '#f3f4f6' },
  { name: 'Purple', hex: '#a855f7' },
];
