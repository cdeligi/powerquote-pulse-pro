
// Re-export all interfaces from the interfaces file for backward compatibility
export * from './product/interfaces';
export * from './product/sensor-config';
export * from './product/quote-types';
export * from './product/type-guards';
export * from './product/part-number-utils';

// Explicit re-exports for commonly used types
export type { 
  AnalogSensorType, 
  AnalogSensorOption, 
  BushingTapModelOption 
} from './product/sensor-config';

export { 
  ANALOG_SENSOR_TYPES, 
  ANALOG_SENSOR_DESCRIPTIONS,
  DEFAULT_ANALOG_SENSORS,
  DEFAULT_BUSHING_TAP_MODELS
} from './product/sensor-config';
