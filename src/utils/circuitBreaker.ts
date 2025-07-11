import { supabase } from '@/integrations/supabase/client';

interface CircuitBreakerConfig {
  maxFailures: number;
  resetTimeout: number;
  timeout: number;
}

const defaultConfig: CircuitBreakerConfig = {
  maxFailures: 3,
  resetTimeout: 5000, // 5 seconds
  timeout: 3000, // 3 seconds
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

// Create circuit breakers for common operations
const circuitBreakers = {
  auth: new CircuitBreaker('Auth', { maxFailures: 3, timeout: 3000 }),
  profile: new CircuitBreaker('Profile', { maxFailures: 3, timeout: 3000 }),
  products: new CircuitBreaker('Products', { maxFailures: 5, timeout: 5000 }),
  sessions: new CircuitBreaker('Sessions', { maxFailures: 3, timeout: 3000 }),
};

// Export utility functions
export const withCircuitBreaker = <T>(
  operationName: keyof typeof circuitBreakers,
  operation: () => Promise<T>
): Promise<T> => {
  return circuitBreakers[operationName].execute(operation);
};

// Example usage:
// const profile = await withCircuitBreaker('profile', () => supabase.from('profiles').select('*').single());

// Expose circuit breakers for debugging
if (typeof window !== 'undefined') {
  (window as any).circuitBreakers = circuitBreakers;
}

export default circuitBreakers;
