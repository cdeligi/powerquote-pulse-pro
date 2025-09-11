import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

// Files to update with their specific imports
const filesToUpdate = [
  'services/roleService.ts',
  'services/departmentService.ts',
  'services/productDataService.ts',
  'services/level4Service.ts',
  'hooks/usePermissions.ts',
  'hooks/useQuotes.tsx',
  'components/admin/UserRequestsTab.tsx',
  'components/admin/UserPermissionsTab.tsx',
  'components/admin/ProductSyncManager.tsx',
  'components/admin/LegalDocumentModal.tsx',
  'components/admin/AdminSettings.tsx',
  'components/admin/AuditLogTab.tsx',
  'components/admin/PermissionsOverview.tsx',
  'components/admin/EnhancedQuoteApprovalDashboard.tsx',
  'components/admin/UserManagement.tsx',
  'components/admin/UserManagementEnhanced.tsx',
  'components/auth/UserRegistrationForm.tsx',
  'components/admin/QuoteFieldConfiguration.tsx',
  'components/bom/AnalogCardConfigurator.tsx',
  'components/bom/BOMBuilder.tsx',
  'utils/loadingDebug.ts',
  'utils/qtmsValidation.ts'
];

// Process each file
filesToUpdate.forEach(relativePath => {
  const filePath = path.join(srcDir, relativePath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping non-existent file: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the import and add the singleton instance
  content = content.replace(
    /import\s*\{\s*supabase\s*(?:,\s*supabaseAdmin\s*)?(?:,\s*isAdminAvailable\s*)?\}\s*from\s*['"]@\/integrations\/supabase\/client['"]/g,
    'import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";\n\nconst supabase = getSupabaseClient();\nconst supabaseAdmin = getSupabaseAdminClient();'
  );
  
  // Handle cases where only supabase is imported
  content = content.replace(
    /import\s*{\s*supabase\s*}\s*from\s*['"]@\/integrations\/supabase\/client['"]/g,
    'import { getSupabaseClient } from "@/integrations/supabase/client";\n\nconst supabase = getSupabaseClient();'
  );
  
  // Handle direct imports from @supabase/supabase-js
  if (content.includes('from \'@supabase/supabase-js\'') || content.includes('from "@supabase/supabase-js"')) {
    content = content.replace(
      /import\s*\{\s*([^}]+)\s*}\s*from\s*['"]@supabase\/supabase-js['"]/g,
      'import { getSupabaseClient } from "@/integrations/supabase/client";\nimport { $1 } from "@supabase/supabase-js";\n\nconst supabase = getSupabaseClient();'
    );
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated: ${relativePath}`);
});

console.log('All files have been updated to use the singleton pattern.');
