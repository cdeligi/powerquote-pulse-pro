import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkProductsTable() {
  try {
    console.log('🔍 Checking products table schema...');
    
    // Get table columns information
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_columns_info', { table_name: 'products' });
    
    if (columnsError) {
      console.error('❌ Error getting columns info:', columnsError);
      
      // Fallback: Try a different approach to get table info
      console.log('Trying alternative method to get table info...');
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'products');
        
      if (error) {
        console.error('❌ Alternative method failed:', error);
        return;
      }
      
      console.log('📋 Products table columns (via information_schema):');
      console.table(data.map(col => ({
        column_name: col.column_name,
        data_type: col.data_type,
        is_nullable: col.is_nullable,
        column_default: col.column_default
      })));
    } else {
      console.log('📋 Products table columns:');
      console.table(columns);
    }
    
    // Try to get a sample product to see its structure
    console.log('\n🔍 Fetching a sample level 3 product...');
    const { data: sampleProduct, error: sampleError } = await supabase
      .from('products')
      .select('*')
      .eq('product_level', 3)
      .limit(1)
      .single();
      
    if (sampleError) {
      console.error('❌ Error fetching sample product:', sampleError);
    } else {
      console.log('📋 Sample level 3 product:');
      console.log(JSON.stringify(sampleProduct, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkProductsTable();
