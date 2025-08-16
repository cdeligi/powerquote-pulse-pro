export type Role = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'ADMIN' | 'FINANCE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
  type: 'auth' | 'session' | 'profile';
}

export interface Feature {
  key: string;
  label: string;
  description: string;
}

export interface UserFeatureOverride {
  id: string;
  user_id: string;
  feature_key: string;
  allowed: boolean | null; // null means no override
}

export interface PermissionContext {
  userRole: Role;
  userOverrides: UserFeatureOverride[];
  roleDefaults: Record<string, boolean>;
}