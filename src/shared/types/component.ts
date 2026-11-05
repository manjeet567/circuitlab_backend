export type ComponentType =
  | 'esp32'
  | 'led'
  | 'resistor'
  | 'push_button'
  | 'dht22'
  | 'breadboard'
  | 'oled'
  | 'power_supply';

export type PinType =
  | 'power'
  | 'ground'
  | 'gpio'
  | 'analog'
  | 'digital'
  | 'passive'
  | 'input'
  | 'output';

export interface PinDefinition {
  id: string;
  name: string;
  type: PinType;
  position: [number, number, number]; // Local coordinates [x, y, z] relative to component origin
  gpioNumber?: number;
  description?: string;
  breadboardGroup?: string; // If breadboard terminal hole
}

export interface LEDProperties {
  color: 'red' | 'green' | 'blue' | 'yellow' | 'white';
  forwardVoltage: number; // in Volts (e.g., 2.0V)
  maxCurrent: number;     // in mA (e.g., 20mA)
}

export interface ResistorProperties {
  resistance: number;     // in Ohms (e.g., 220, 1000, 10000)
  tolerance: number;      // percentage, e.g., 5%
  powerRating?: number;   // Watts, e.g. 0.25W
}

export interface PushButtonProperties {
  isPressed: boolean;
  pullMode: 'pullup' | 'pulldown' | 'none';
}

export interface DHT22Properties {
  temperature: number;    // Celsius (-40 to 80)
  humidity: number;       // % (0 to 100)
}

export interface ESP32Properties {
  boardName: string;
  gpioStates: Record<number, 'HIGH' | 'LOW'>;
  gpioModes: Record<number, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'>;
}

export interface BreadboardProperties {
  rows: number;           // typically 30 or 60
  cols: number;           // typically 10 (a-e, f-j)
  hasPowerRails: boolean;
}

export type AnyComponentProperties =
  | LEDProperties
  | ResistorProperties
  | PushButtonProperties
  | DHT22Properties
  | ESP32Properties
  | BreadboardProperties
  | Record<string, any>;

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number]; // Euler angles [rx, ry, rz] in radians
  properties: AnyComponentProperties;
}

export interface WirePinReference {
  componentId: string;
  pinId: string;
}

export interface Wire {
  id: string;
  color: string;
  from: WirePinReference;
  to: WirePinReference;
  style?: 'straight' | 'curved';
}
