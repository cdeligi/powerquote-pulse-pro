import fs from 'fs';
import path from 'path';

const productDefaultsPath = path.join(process.cwd(), 'src/data/productDefaults.ts');
const content = fs.readFileSync(productDefaultsPath, 'utf-8');

// Add parent_product_id and product_level to all Level3Product entries
const fixedContent = content
  .replace(/\{(\s*)id:/g, '{$1id:')
  .replace(/(\s*)parentProductId: '([^']+)',/g, '$1parentProductId: \'$2\',\n$1parent_product_id: \'$2\',')
  .replace(/(\s*)enabled: true,(\s*)partNumber:/g, '$1enabled: true,\n$1product_level: 3 as const,$2partNumber:');

fs.writeFileSync(productDefaultsPath, fixedContent);
console.log('Fixed product defaults');