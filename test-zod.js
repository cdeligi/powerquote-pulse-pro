// Simple test file to verify Zod installation
import { z } from 'zod';

console.log('Zod version:', z.VERSION);

const schema = z.object({
  name: z.string(),
  age: z.number()
});

const result = schema.safeParse({ name: 'Test', age: 25 });

if (result.success) {
  console.log('✅ Zod is working correctly!');
  console.log('Parsed data:', result.data);
} else {
  console.error('❌ Zod validation failed:', result.error);
}
