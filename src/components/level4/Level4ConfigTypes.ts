// Level 4 Configuration Types and Helpers

export interface DropdownOption {
  id: string;
  name: string;
  url: string;
}

export interface FixedSettings {
  numberOfInputs: number;
}

export interface VariableSettings {
  maxInputs: number;
}

export interface Level4Config {
  id: string;
  fieldLabel: string;
  mode: 'fixed' | 'variable';
  fixed?: FixedSettings;
  variable?: VariableSettings;
  options: DropdownOption[];
}

// Helper functions
export function uid(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function emptyFixedConfig(): Level4Config {
  return {
    id: uid(),
    fieldLabel: "Configure Options",
    mode: "fixed",
    fixed: { numberOfInputs: 1 },
    options: []
  };
}

export function emptyVariableConfig(): Level4Config {
  return {
    id: uid(),
    fieldLabel: "Configure Options",
    mode: "variable",
    variable: { maxInputs: 3 },
    options: []
  };
}

export function validateConfig(config: Level4Config): string[] {
  const errors: string[] = [];
  
  if (!config.fieldLabel?.trim()) {
    errors.push("Field label is required");
  }
  
  if (config.mode === 'fixed') {
    if (!config.fixed?.numberOfInputs || config.fixed.numberOfInputs < 1) {
      errors.push("Fixed mode requires a valid number of inputs");
    }
  } else if (config.mode === 'variable') {
    if (!config.variable?.maxInputs || config.variable.maxInputs < 1) {
      errors.push("Variable mode requires a valid maximum inputs");
    }
  }
  
  if (config.options.length === 0) {
    errors.push("At least one option is required");
  }
  
  return errors;
}