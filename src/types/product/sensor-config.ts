/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

export interface AnalogSensorOption {
  id: string;
  name: string;
  description: string;
}

export interface BushingTapModelOption {
  id: string;
  name: string;
}

export const DEFAULT_ANALOG_SENSORS: AnalogSensorOption[] = [
  { id: 'pt100-rtd', name: 'Pt100/RTD', description: '100 ohm Platinum (Pt100), 10 ohm Copper (Cu10) RTD' },
  { id: 'current-sensor', name: 'Current Sensor', description: 'Clamp-on CT : 0 - 5A, 10A, 20A, 100A' },
  { id: 'dc-current-loops', name: 'DC Current Loops', description: '0 - 1 or 4 - 20 mA DC' },
  { id: 'dc-voltage', name: 'DC Voltage', description: '0 - 100 mV DC or 0 - 10 VDC' },
  { id: 'ac-voltage', name: 'AC Voltage', description: '0 - 140 VAC and 0 - 320 VAC; 50/60 Hz' },
  { id: 'potentiometer', name: 'Potentiometer', description: '1500 - 15,000 ohms' },
  { id: 'switch-contact-dry', name: 'Switch Contact (dry)', description: 'Open/Closed' },
  { id: 'switch-contact-opto', name: 'Switch Contact (opto-isolated)', description: '>80V or >130V Open, jumper selectable; optically isolated' },
];

export const ANALOG_SENSOR_TYPES = DEFAULT_ANALOG_SENSORS.map(s => s.name) as const;
export type AnalogSensorType = typeof ANALOG_SENSOR_TYPES[number];

export const ANALOG_SENSOR_DESCRIPTIONS: Record<AnalogSensorType, string> = DEFAULT_ANALOG_SENSORS.reduce(
  (acc, s) => {
    acc[s.name as AnalogSensorType] = s.description;
    return acc;
  },
  {} as Record<AnalogSensorType, string>
);

export const DEFAULT_BUSHING_TAP_MODELS: BushingTapModelOption[] = [
  { id: 'standard', name: 'Standard' },
  { id: 'high-accuracy', name: 'High Accuracy' },
  { id: 'high-frequency', name: 'High Frequency' },
  { id: 'custom', name: 'Custom' },
];

export const TM1_CUSTOMIZATION_OPTIONS = ['Moisture Sensor', '4-20mA bridge'] as const;
