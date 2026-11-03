export type SimulationStatus = 'stopped' | 'running' | 'paused' | 'error';

export type SimulationEventType =
  | 'system'
  | 'gpio'
  | 'led'
  | 'button'
  | 'sensor'
  | 'warning'
  | 'error';

export interface SimulationEvent {
  id: string;
  timestamp: number;
  type: SimulationEventType;
  message: string;
  data?: Record<string, any>;
}

export interface LEDSimulationState {
  lit: boolean;
  forwardVoltage: number;
  current_mA: number;
  brightness: number; // 0 to 1
}

export interface ResistorSimulationState {
  voltageDrop: number;
  current_mA: number;
}

export interface PushButtonSimulationState {
  pressed: boolean;
  closed: boolean;
}

export interface DHT22SimulationState {
  temperature: number;
  humidity: number;
  active: boolean;
}

export interface ESP32SimulationState {
  gpioOutputs: Record<number, 'HIGH' | 'LOW'>;
  gpioInputs: Record<number, 'HIGH' | 'LOW'>;
  gpioModes: Record<number, 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP'>;
}

export interface SimulationState {
  status: SimulationStatus;
  startedAt?: number;
  stepCount: number;
  componentStates: Record<string, any>;
  events: SimulationEvent[];
}
