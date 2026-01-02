"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitOpenError = exports.CircuitBreaker = exports.DEFAULT_CIRCUIT_BREAKER_CONFIG = exports.CircuitState = void 0;
const common_1 = require("@nestjs/common");
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
exports.DEFAULT_CIRCUIT_BREAKER_CONFIG = {
    failureThreshold: 5,
    failureWindowMs: 60000,
    openDurationMs: 30000,
    halfOpenMaxAttempts: 1,
};
class CircuitBreaker {
    constructor(name, config = {}, fallbackFn) {
        this.name = name;
        this.logger = new common_1.Logger(`CircuitBreaker:${name}`);
        this.config = { ...exports.DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
        this.fallbackFn = fallbackFn;
        this.circuitState = {
            state: CircuitState.CLOSED,
            failures: [],
            lastStateChange: Date.now(),
            halfOpenAttempts: 0,
        };
    }
    async execute(fn) {
        this.cleanupOldFailures();
        if (this.circuitState.state === CircuitState.OPEN) {
            if (this.shouldTransitionToHalfOpen()) {
                this.transitionTo(CircuitState.HALF_OPEN);
            }
            else {
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
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        if (this.circuitState.state === CircuitState.HALF_OPEN) {
            this.logger.log(`Request succeeded in HALF_OPEN state, closing circuit`);
            this.transitionTo(CircuitState.CLOSED);
        }
    }
    onFailure() {
        this.circuitState.failures.push(Date.now());
        if (this.circuitState.state === CircuitState.HALF_OPEN) {
            this.logger.warn(`Request failed in HALF_OPEN state, opening circuit`);
            this.transitionTo(CircuitState.OPEN);
            return;
        }
        if (this.circuitState.failures.length >= this.config.failureThreshold) {
            this.logger.warn(`Failure threshold (${this.config.failureThreshold}) reached, opening circuit`);
            this.transitionTo(CircuitState.OPEN);
        }
    }
    transitionTo(newState) {
        this.logger.log(`Circuit transitioning from ${this.circuitState.state} to ${newState}`);
        this.circuitState.state = newState;
        this.circuitState.lastStateChange = Date.now();
        if (newState === CircuitState.CLOSED) {
            this.circuitState.failures = [];
            this.circuitState.halfOpenAttempts = 0;
        }
        else if (newState === CircuitState.HALF_OPEN) {
            this.circuitState.halfOpenAttempts = 0;
        }
    }
    shouldTransitionToHalfOpen() {
        const timeSinceOpen = Date.now() - this.circuitState.lastStateChange;
        return timeSinceOpen >= this.config.openDurationMs;
    }
    cleanupOldFailures() {
        const cutoff = Date.now() - this.config.failureWindowMs;
        this.circuitState.failures = this.circuitState.failures.filter((timestamp) => timestamp > cutoff);
    }
    async handleOpenCircuit() {
        if (this.fallbackFn) {
            this.logger.log(`Using fallback function`);
            return this.fallbackFn();
        }
        throw new CircuitOpenError(this.name);
    }
    getState() {
        return this.circuitState.state;
    }
    getFailureCount() {
        this.cleanupOldFailures();
        return this.circuitState.failures.length;
    }
    reset() {
        this.circuitState = {
            state: CircuitState.CLOSED,
            failures: [],
            lastStateChange: Date.now(),
            halfOpenAttempts: 0,
        };
    }
}
exports.CircuitBreaker = CircuitBreaker;
class CircuitOpenError extends Error {
    constructor(circuitName) {
        super(`Circuit breaker '${circuitName}' is open`);
        this.name = 'CircuitOpenError';
    }
}
exports.CircuitOpenError = CircuitOpenError;
//# sourceMappingURL=circuit-breaker.util.js.map