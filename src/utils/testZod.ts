// Test file to verify Zod import
import { z } from 'zod';

// Simple schema to test if Zod is working
const testSchema = z.object({
  name: z.string(),
  age: z.number()
});

// Test the schema
try {
  const result = testSchema.parse({ name: "Test", age: 25 });
  console.log("✅ Zod is working correctly!");
  console.log("Parsed data:", result);
} catch (error) {
  console.error("❌ Error with Zod:", error);
}

export {};
