import { supabase } from "@/integrations/supabase/client";
import { Role } from "@/types/auth";

export interface RoleMetadata {
  role_name: Role;
  display_name: string;
  description: string;
  created_at: string;
}

class RoleService {
  private static instance: RoleService | null = null;
  private roles: RoleMetadata[] = [];

  private constructor() {}

  static getInstance(): RoleService {
    if (!RoleService.instance) {
      RoleService.instance = new RoleService();
    }
    return RoleService.instance;
  }

  async fetchRoles(): Promise<RoleMetadata[]> {
    try {
      const { data, error } = await supabase
        .from('role_metadata')
        .select('*')
        .order('role_name', { ascending: true });

      if (error) throw error;

      this.roles = data || [];
      return this.roles;
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  }

  getRolesSync(): RoleMetadata[] {
    return [...this.roles];
  }
}

export const roleService = RoleService.getInstance();