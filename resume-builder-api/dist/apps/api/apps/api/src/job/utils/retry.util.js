"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RETRY_CONFIG = void 0;
exports.calculateDelay = calculateDelay;
exports.sleep = sleep;
exports.withRetry = withRetry;
exports.Retry = Retry;
exports.DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    jitterFactor: 0.1,
};
function calculateDelay(attempt, config) {
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
    const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
    const jitterFactor = config.jitterFactor ?? 0.1;
    const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
    return Math.max(0, Math.round(cappedDelay + jitter));
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn, config = exports.DEFAULT_RETRY_CONFIG, logger) {
    const delays = [];
    let lastError;
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            const data = await fn();
            return {
                success: true,
                data,
                attempts: attempt + 1,
                delays,
            };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < config.maxRetries) {
                const delay = calculateDelay(attempt, config);
                delays.push(delay);
                logger?.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`);
                await sleep(delay);
            }
        }
    }
    return {
        success: false,
        error: lastError,
        attempts: config.maxRetries + 1,
        delays,
    };
}
function Retry(config = {}) {
    const fullConfig = { ...exports.DEFAULT_RETRY_CONFIG, ...config };
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const logger = this.logger;
            const result = await withRetry(() => originalMethod.apply(this, args), fullConfig, logger);
            if (result.success) {
                return result.data;
            }
            throw result.error;
        };
        return descriptor;
    };
}
//# sourceMappingURL=retry.util.js.map