// Re-export all interfaces from the interfaces file for backward compatibility
export * from "./product/interfaces";
export * from "./product/quote-types";
export * from "./product/type-guards";
export * from "./product/sensor-config";
export * from "./product/part-number-utils";
export * from "./product/chassis-types";

export { 
  ANALOG_SENSOR_TYPES, 
  ANALOG_SENSOR_DESCRIPTIONS,
  DEFAULT_ANALOG_SENSORS,
  DEFAULT_BUSHING_TAP_MODELS
} from './product/sensor-config';
