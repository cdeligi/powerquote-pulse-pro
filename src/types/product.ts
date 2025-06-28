
// Re-export all interfaces from the interfaces file for backward compatibility
export * from './product/interfaces';
export * from './product/sensor-config';
export * from './product/quote-types';
export * from './product/type-guards';
export * from './product/part-number-utils';

// Explicit re-exports for commonly used types including Level 4
export type { 
  AnalogSensorType, 
  AnalogSensorOption, 
  BushingTapModelOption,
  Level4Product,
  Level4ConfigurationOption
} from './product/interfaces';

export { 
  ANALOG_SENSOR_TYPES, 
  ANALOG_SENSOR_DESCRIPTIONS,
  DEFAULT_ANALOG_SENSORS,
  DEFAULT_BUSHING_TAP_MODELS
} from './product/sensor-config';
