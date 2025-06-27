
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

// Create the sensor types array properly
export const ANALOG_SENSOR_TYPES = [
  'Pt100/RTD',
  'Current Sensor',
  'DC Current Loops',
  'DC Voltage',
  'AC Voltage',
  'Potentiometer',
  'Switch Contact (dry)',
  'Switch Contact (opto-isolated)'
] as const;

export type AnalogSensorType = typeof ANALOG_SENSOR_TYPES[number];

export const ANALOG_SENSOR_DESCRIPTIONS: Record<AnalogSensorType, string> = {
  'Pt100/RTD': '100 ohm Platinum (Pt100), 10 ohm Copper (Cu10) RTD',
  'Current Sensor': 'Clamp-on CT : 0 - 5A, 10A, 20A, 100A',
  'DC Current Loops': '0 - 1 or 4 - 20 mA DC',
  'DC Voltage': '0 - 100 mV DC or 0 - 10 VDC',
  'AC Voltage': '0 - 140 VAC and 0 - 320 VAC; 50/60 Hz',
  'Potentiometer': '1500 - 15,000 ohms',
  'Switch Contact (dry)': 'Open/Closed',
  'Switch Contact (opto-isolated)': '>80V or >130V Open, jumper selectable; optically isolated'
};

export const DEFAULT_BUSHING_TAP_MODELS: BushingTapModelOption[] = [
  { id: 'standard', name: 'Standard' },
  { id: 'high-accuracy', name: 'High Accuracy' },
  { id: 'high-frequency', name: 'High Frequency' },
  { id: 'custom', name: 'Custom' },
];

export const TM1_CUSTOMIZATION_OPTIONS = ['Moisture Sensor', '4-20mA bridge'] as const;
