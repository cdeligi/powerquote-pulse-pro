import { writeFileSync } from 'fs';
import {
  DEFAULT_LEVEL1_PRODUCTS,
  DEFAULT_LEVEL2_PRODUCTS,
  DEFAULT_LEVEL3_PRODUCTS
} from '../src/data/productDefaults';

function escape(value: string): string {
  return value.replace(/'/g, "''");
}

function buildProductValues(products: any[]): string {
  return products
    .map(p => `('${p.id}', '${escape(p.name)}', '${escape(p.description)}', '${escape(p.category || '')}', '${escape(p.type)}', ${p.price}, ${p.cost ?? 0}, true)`) // basic fields
    .join(',\n');
}

const level1Sql = buildProductValues(DEFAULT_LEVEL1_PRODUCTS);
const level2Sql = buildProductValues(DEFAULT_LEVEL2_PRODUCTS);
const level3Sql = buildProductValues(DEFAULT_LEVEL3_PRODUCTS);

const relationshipL1L2 = DEFAULT_LEVEL2_PRODUCTS.map(p => `('${p.parentProductId}', '${p.id}')`).join(',\n');
const relationshipL2L3 = DEFAULT_LEVEL3_PRODUCTS.map(p => `('${p.parentProductId}', '${p.id}')`).join(',\n');

const sql = `-- Generated product inserts\nINSERT INTO public.products (id, name, description, category, subcategory, price, cost, is_active) VALUES\n${level1Sql},\n${level2Sql},\n${level3Sql};\n\nINSERT INTO public.level1_level2_relationships (level1_product_id, level2_product_id) VALUES\n${relationshipL1L2};\n\nINSERT INTO public.level2_level3_relationships (level2_product_id, level3_product_id) VALUES\n${relationshipL2L3};\n`;

writeFileSync('generated-product-inserts.sql', sql);
console.log('Wrote generated-product-inserts.sql');
