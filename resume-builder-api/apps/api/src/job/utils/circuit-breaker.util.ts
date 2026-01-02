import { Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  failureWindowMs: number;
  openDurationMs: number;
  halfOpenMaxAttempts: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureWindowMs: 60000,
  openDurationMs: 30000,
  halfOpenMaxAttempts: 1,
};

export interface CircuitBreakerState {
  state: CircuitState;
  failures: number[];
  lastStateChange: number;
  halfOpenAttempts: number;
}

export class CircuitBreaker<T> {
  private readonly logger: Logger;
  private readonly config: CircuitBreakerConfig;
  private circuitState: CircuitBreakerState;
  private fallbackFn?: () => Promise<T>;

  constructor(
    private readonly name: string,
    config: Partial<CircuitBreakerConfig> = {},
    fallbackFn?: () => Promise<T>,
  ) {
    this.logger = new Logger(`CircuitBreaker:${name}`);
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.fallbackFn = fallbackFn;
    this.circuitState = {
      state: CircuitState.CLOSED,
      failures: [],
      lastStateChange: Date.now(),
      halfOpenAttempts: 0,
    };
  }

  async execute(fn: () => Promise<T>): Promise<T> {
    this.cleanupOldFailures();

    if (this.circuitState.state === CircuitState.OPEN) {
      if (this.shouldTransitionToHalfOpen()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        this.logger.warn(`Circuit is OPEN, rejecting request`);
        return this.handleOpenCircuit();
      }
    }

    if (this.circuitState.state === CircuitState.HALF_OPEN) {
      if (this.circuitState.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.logger.warn(`Half-open attempts exhausted, circuit remains OPEN`);
        this.transitionTo(CircuitState.OPEN);
        return this.handleOpenCircuit();
      }
      this.circuitState.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.circuitState.state === CircuitState.HALF_OPEN) {
      this.logger.log(`Request succeeded in HALF_OPEN state, closing circuit`);
      this.transitionTo(CircuitState.CLOSED);
    }
    // In CLOSED state, success doesn't change anything
  }

  private onFailure(): void {
    this.circuitState.failures.push(Date.now());

    if (this.circuitState.state === CircuitState.HALF_OPEN) {
      this.logger.warn(`Request failed in HALF_OPEN state, opening circuit`);
      this.transitionTo(CircuitState.OPEN);
      return;
    }

    // In CLOSED state, check if we should open
    if (this.circuitState.failures.length >= this.config.failureThreshold) {
      this.logger.warn(
        `Failure threshold (${this.config.failureThreshold}) reached, opening circuit`,
      );
      this.transitionTo(CircuitState.OPEN);
    }
  }

  private transitionTo(newState: CircuitState): void {
    this.logger.log(`Circuit transitioning from ${this.circuitState.state} to ${newState}`);
    this.circuitState.state = newState;
    this.circuitState.lastStateChange = Date.now();

    if (newState === CircuitState.CLOSED) {
      this.circuitState.failures = [];
      this.circuitState.halfOpenAttempts = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      this.circuitState.halfOpenAttempts = 0;
    }
  }

  private shouldTransitionToHalfOpen(): boolean {
    const timeSinceOpen = Date.now() - this.circuitState.lastStateChange;
    return timeSinceOpen >= this.config.openDurationMs;
  }

  private cleanupOldFailures(): void {
    const cutoff = Date.now() - this.config.failureWindowMs;
    this.circuitState.failures = this.circuitState.failures.filter(
      (timestamp) => timestamp > cutoff,
    );
  }

  private async handleOpenCircuit(): Promise<T> {
    if (this.fallbackFn) {
      this.logger.log(`Using fallback function`);
      return this.fallbackFn();
    }
    throw new CircuitOpenError(this.name);
  }

  getState(): CircuitState {
    return this.circuitState.state;
  }

  getFailureCount(): number {
    this.cleanupOldFailures();
    return this.circuitState.failures.length;
  }

  reset(): void {
    this.circuitState = {
      state: CircuitState.CLOSED,
      failures: [],
      lastStateChange: Date.now(),
      halfOpenAttempts: 0,
    };
  }
}

export class CircuitOpenError extends Error {
  constructor(circuitName: string) {
    super(`Circuit breaker '${circuitName}' is open`);
    this.name = 'CircuitOpenError';
  }
}
