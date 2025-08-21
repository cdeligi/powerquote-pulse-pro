// Re-export all interfaces from the interfaces file for backward compatibility
export * from './product/interfaces';
export * from './product/sensor-config';
export * from './product/quote-types';
export * from './product/type-guards';
export * from './product/part-number-utils';
export * from './product/chassis-types';

// Explicit re-exports for commonly used types including Level 4
export type {
  AnalogSensorType,
  AnalogSensorOption,
  BushingTapModelOption,
} from './product/sensor-config';

export type {
  Level4Configuration,
  Level4ConfigurationField,
  Level4DropdownOption,
  Level4SharedOption
} from './level4';

export { 
  ANALOG_SENSOR_TYPES, 
  ANALOG_SENSOR_DESCRIPTIONS,
  DEFAULT_ANALOG_SENSORS,
  DEFAULT_BUSHING_TAP_MODELS
} from './product/sensor-config';
