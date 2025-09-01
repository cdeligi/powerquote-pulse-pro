import { supabase } from "@/integrations/supabase/client";

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

class DepartmentService {
  private static instance: DepartmentService | null = null;
  private departments: Department[] = [];

  private constructor() {}

  static getInstance(): DepartmentService {
    if (!DepartmentService.instance) {
      DepartmentService.instance = new DepartmentService();
    }
    return DepartmentService.instance;
  }

  async fetchDepartments(): Promise<Department[]> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      this.departments = data || [];
      return this.departments;
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }

  async createDepartment(name: string): Promise<Department | null> {
    try {
      const { data, error } = await supabase
        .from('departments')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;

      // No local cache manipulation here. The caller will re-fetch.
      return data;
    } catch (error) {
      console.error('Error creating department:', error);
      return null;
    }
  }

  getDepartmentsSync(): Department[] {
    return [...this.departments];
  }
}

export const departmentService = DepartmentService.getInstance();