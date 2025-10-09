import { getSupabaseClient } from "@/integrations/supabase/client";
import { Role } from "@/types/auth";

const supabase = getSupabaseClient();

export interface RoleMetadata {
  role_name: Role;
  display_name: string;
  description: string;
  created_at: string;
}

class RoleService {
  private static instance: RoleService | null = null;
  private roles: RoleMetadata[] = [];

  private static readonly DEFAULT_ROLES: RoleMetadata[] = [
    {
      role_name: "LEVEL_1",
      display_name: "Level 1 - Channel Partners",
      description: "Access for external channel partners.",
      created_at: "1970-01-01T00:00:00.000Z",
    },
    {
      role_name: "LEVEL_2",
      display_name: "Level 2 - Qualitrol Sales",
      description: "Access for Qualitrol sales team members.",
      created_at: "1970-01-01T00:00:00.000Z",
    },
    {
      role_name: "LEVEL_3",
      display_name: "Level 3 - Directors",
      description: "Access for department directors and managers.",
      created_at: "1970-01-01T00:00:00.000Z",
    },
    {
      role_name: "ADMIN",
      display_name: "Admin - Administrators",
      description: "Full administrative access to the system.",
      created_at: "1970-01-01T00:00:00.000Z",
    },
    {
      role_name: "FINANCE",
      display_name: "Finance - Finance Team",
      description: "Access for the finance department.",
      created_at: "1970-01-01T00:00:00.000Z",
    },
  ];

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

      if (data && data.length > 0) {
        this.roles = data;
      } else {
        console.warn('No role metadata found in database, using defaults.');
        this.roles = RoleService.DEFAULT_ROLES.map((role) => ({ ...role }));
      }
      return this.roles;
    } catch (error) {
      console.error('Error fetching roles:', error);
      this.roles = RoleService.DEFAULT_ROLES.map((role) => ({ ...role }));
      return this.roles;
    }
  }

  getRolesSync(): RoleMetadata[] {
    if (!this.roles.length) {
      this.roles = RoleService.DEFAULT_ROLES.map((role) => ({ ...role }));
    }
    return [...this.roles];
  }
}

export const roleService = RoleService.getInstance();