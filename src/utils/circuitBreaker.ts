import { supabase } from '@/integrations/supabase/client';

interface CircuitBreakerConfig {
  maxFailures: number;
  resetTimeout: number;
  timeout: number;
}

const defaultConfig: CircuitBreakerConfig = {
  maxFailures: 3,
  resetTimeout: 10000, // 10 seconds to prevent rapid retries
  timeout: 1000, // 1 second for faster failure detection
};

class CircuitBreaker {
  private failures = 0;
  private lastFailure: number | null = null;
  private readonly config: CircuitBreakerConfig;
  private readonly operationName: string;

  constructor(operationName: string, config?: Partial<CircuitBreakerConfig>) {
    this.operationName = operationName;
    this.config = { ...defaultConfig, ...config };
  }

  private isCircuitOpen(): boolean {
    if (this.failures >= this.config.maxFailures) {
      if (this.lastFailure && Date.now() - this.lastFailure < this.config.resetTimeout) {
        console.warn(`[${this.operationName}] Circuit is open - too many failures`);
        return true;
      }
      this.reset();
    }
    return false;
  }

  private recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
    console.error(`[${this.operationName}] Failure recorded, total: ${this.failures}`);
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailure = null;
    console.log(`[${this.operationName}] Circuit reset`);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isCircuitOpen()) {
      throw new Error(`[${this.operationName}] Circuit is open - too many failures`);
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`[${this.operationName}] Timeout after ${this.config.timeout}ms`)), this.config.timeout)
        )
      ]);
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
}

// Create circuit breakers for common operations with optimized timeouts
const circuitBreakers = {
  auth: new CircuitBreaker('Auth', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
  profile: new CircuitBreaker('Profile', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
  products: {
    level1: new CircuitBreaker('Products.Level1', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
    level2: new CircuitBreaker('Products.Level2', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
    level3: new CircuitBreaker('Products.Level3', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
    level4: new CircuitBreaker('Products.Level4', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
    chassis: new CircuitBreaker('Products.Chassis', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
  },
  bom: {
    create: new CircuitBreaker('BOM.Create', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
    update: new CircuitBreaker('BOM.Update', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
    delete: new CircuitBreaker('BOM.Delete', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
  },
  sessions: new CircuitBreaker('Sessions', { maxFailures: 2, timeout: 1000, resetTimeout: 10000 }),
};

// Export utility functions
export const withCircuitBreaker = async <T>(
  operationName: keyof typeof circuitBreakers | keyof typeof circuitBreakers.products | keyof typeof circuitBreakers.bom,
  operation: () => Promise<T>
): Promise<T> => {
  const breaker = circuitBreakers.products[operationName as keyof typeof circuitBreakers.products] ||
                  circuitBreakers.bom[operationName as keyof typeof circuitBreakers.bom] ||
                  circuitBreakers[operationName as keyof typeof circuitBreakers];

  if (!breaker) {
    throw new Error(`No circuit breaker configured for operation: ${operationName}`);
  }

  return breaker.execute(operation);
};

// Example usage:
// const level1Products = await withCircuitBreaker('level1', () => supabase.from('products_lvl1').select('*'));
// const profile = await withCircuitBreaker('profile', () => supabase.from('profiles').select('*').single());

// Expose circuit breakers for debugging
if (typeof window !== 'undefined') {
  (window as any).circuitBreakers = circuitBreakers;
}

export default circuitBreakers;
