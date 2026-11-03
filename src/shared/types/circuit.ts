export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface CircuitValidationIssue {
  severity: ValidationSeverity;
  code:
    | 'MISSING_CONNECTIONS'
    | 'INVALID_PIN_CONNECTION'
    | 'FLOATING_INPUT'
    | 'SHORT_CIRCUIT'
    | 'MISSING_GROUND'
    | 'NO_CURRENT_LIMITING_RESISTOR'
    | 'INCOMPLETE_CIRCUIT'
    | 'UNKNOWN_PIN'
    | 'GENERAL_WARNING';
  message: string;
  componentIds?: string[];
  pinIds?: string[];
}

export interface CircuitValidationResult {
  isValid: boolean;
  issues: CircuitValidationIssue[];
}

export interface NetNode {
  componentId: string;
  pinId: string;
}

export interface ElectricalNet {
  id: string;
  nodes: NetNode[];
  isPower: boolean;
  isGround: boolean;
  voltage?: number;
  drivingPin?: NetNode;
}
