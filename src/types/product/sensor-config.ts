
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

export const TM1_CUSTOMIZATION_OPTIONS = ['Moisture Sensor', '4-20mA bridge'] as const;
