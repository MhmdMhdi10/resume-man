"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipRateLimit = exports.RateLimit = void 0;
const common_1 = require("@nestjs/common");
const rate_limit_guard_1 = require("../guards/rate-limit.guard");
const RateLimit = (options) => (0, common_1.SetMetadata)(rate_limit_guard_1.RATE_LIMIT_KEY, options);
exports.RateLimit = RateLimit;
const SkipRateLimit = () => (0, common_1.SetMetadata)(rate_limit_guard_1.SKIP_RATE_LIMIT_KEY, true);
exports.SkipRateLimit = SkipRateLimit;
//# sourceMappingURL=rate-limit.decorator.js.map