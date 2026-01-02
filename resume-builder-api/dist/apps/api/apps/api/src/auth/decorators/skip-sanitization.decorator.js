"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipSanitization = void 0;
const common_1 = require("@nestjs/common");
const sanitization_interceptor_1 = require("../interceptors/sanitization.interceptor");
const SkipSanitization = () => (0, common_1.SetMetadata)(sanitization_interceptor_1.SKIP_SANITIZATION_KEY, true);
exports.SkipSanitization = SkipSanitization;
//# sourceMappingURL=skip-sanitization.decorator.js.map