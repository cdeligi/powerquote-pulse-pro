// Level 4 Configuration Types and Helpers

import { v4 as uuidv4 } from 'uuid';
import { z } from "zod";
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
  return uuidv4();
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

export const DropdownOptionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, { message: "Option name cannot be empty." }),
  url: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal("")),
});

export const Level4ConfigSchema = z.object({
  id: z.string().min(1),
  fieldLabel: z.string().min(1, { message: "Field Label is required." }),
  mode: z.enum(["fixed", "variable"]),
  fixed: z.object({ 
    numberOfInputs: z.number({ invalid_type_error: "Number of inputs must be a number." }).int().min(1) 
  }).optional(),
  variable: z.object({ 
    maxInputs: z.number({ invalid_type_error: "Maximum inputs must be a number." }).int().min(1) 
  }).optional(),
  options: z.array(DropdownOptionSchema).min(1, { message: "At least one dropdown option is required." }),
}).refine(
  (v) => (v.mode === "fixed" && v.fixed) || (v.mode === "variable" && v.variable),
  { message: "Fixed mode requires 'numberOfInputs' OR Variable mode requires 'maxInputs'." }
);

export function validateConfig(config: Level4Config): string[] {
  const result = Level4ConfigSchema.safeParse(config);
  if (result.success) {
    return [];
  }
  return result.error.issues.map(issue => issue.message);
}