
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'level1' | 'level2' | 'admin' | 'finance';
  department?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
