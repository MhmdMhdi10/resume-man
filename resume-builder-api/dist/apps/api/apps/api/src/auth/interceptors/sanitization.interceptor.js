"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizationInterceptor = exports.SKIP_SANITIZATION_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
exports.SKIP_SANITIZATION_KEY = 'skipSanitization';
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--)|(\/\*)|(\*\/)/g,
    /(;|\||&)/g,
    /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/gi,
    /'\s*(OR|AND)\s*'?\d+'\s*=\s*'?\d+/gi,
    /(\bOR\b|\bAND\b)\s*'[^']*'\s*=\s*'[^']*'/gi,
];
const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<\s*img[^>]+onerror\s*=/gi,
    /<\s*svg[^>]+onload\s*=/gi,
    /data:\s*text\/html/gi,
    /vbscript:/gi,
];
const COMMAND_INJECTION_PATTERNS = [
    /[;&|`$(){}[\]]/g,
    /\$\([^)]*\)/g,
    /`[^`]*`/g,
];
let SanitizationInterceptor = class SanitizationInterceptor {
    constructor(reflector) {
        this.reflector = reflector;
    }
    intercept(context, next) {
        const skipSanitization = this.reflector.getAllAndOverride(exports.SKIP_SANITIZATION_KEY, [context.getHandler(), context.getClass()]);
        if (skipSanitization) {
            return next.handle();
        }
        const request = context.switchToHttp().getRequest();
        if (request.body && typeof request.body === 'object') {
            const bodyResult = this.sanitizeObject(request.body);
            if (!bodyResult.isValid) {
                throw new common_1.BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'Request contains potentially malicious content',
                    threats: bodyResult.threats,
                });
            }
            request.body = bodyResult.sanitizedValue;
        }
        if (request.query && typeof request.query === 'object') {
            const queryResult = this.sanitizeObject(request.query);
            if (!queryResult.isValid) {
                throw new common_1.BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'Query parameters contain potentially malicious content',
                    threats: queryResult.threats,
                });
            }
            request.query = queryResult.sanitizedValue;
        }
        if (request.params && typeof request.params === 'object') {
            const paramsResult = this.sanitizeObject(request.params);
            if (!paramsResult.isValid) {
                throw new common_1.BadRequestException({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'URL parameters contain potentially malicious content',
                    threats: paramsResult.threats,
                });
            }
            request.params = paramsResult.sanitizedValue;
        }
        return next.handle();
    }
    sanitizeObject(obj, path = '') {
        const threats = [];
        if (obj === null || obj === undefined) {
            return { isValid: true, sanitizedValue: obj, threats };
        }
        if (typeof obj === 'string') {
            return this.sanitizeString(obj, path);
        }
        if (Array.isArray(obj)) {
            const sanitizedArray = [];
            for (let i = 0; i < obj.length; i++) {
                const result = this.sanitizeObject(obj[i], `${path}[${i}]`);
                if (!result.isValid) {
                    threats.push(...result.threats);
                }
                sanitizedArray.push(result.sanitizedValue);
            }
            return {
                isValid: threats.length === 0,
                sanitizedValue: sanitizedArray,
                threats
            };
        }
        if (typeof obj === 'object') {
            const sanitizedObj = {};
            for (const key of Object.keys(obj)) {
                const keyResult = this.sanitizeString(key, `${path}.key`);
                if (!keyResult.isValid) {
                    threats.push(...keyResult.threats);
                }
                const valueResult = this.sanitizeObject(obj[key], `${path}.${key}`);
                if (!valueResult.isValid) {
                    threats.push(...valueResult.threats);
                }
                sanitizedObj[keyResult.sanitizedValue] = valueResult.sanitizedValue;
            }
            return {
                isValid: threats.length === 0,
                sanitizedValue: sanitizedObj,
                threats
            };
        }
        return { isValid: true, sanitizedValue: obj, threats };
    }
    sanitizeString(value, path = '') {
        const threats = [];
        let sanitized = value;
        for (const pattern of SQL_INJECTION_PATTERNS) {
            if (pattern.test(value)) {
                threats.push(`SQL injection pattern detected at ${path}`);
                pattern.lastIndex = 0;
            }
        }
        for (const pattern of XSS_PATTERNS) {
            if (pattern.test(value)) {
                threats.push(`XSS pattern detected at ${path}`);
                pattern.lastIndex = 0;
            }
        }
        const dangerousCommandPatterns = [
            /\$\([^)]*\)/g,
            /`[^`]*`/g,
        ];
        for (const pattern of dangerousCommandPatterns) {
            if (pattern.test(value)) {
                threats.push(`Command injection pattern detected at ${path}`);
                pattern.lastIndex = 0;
            }
        }
        sanitized = this.escapeHtml(sanitized);
        return {
            isValid: threats.length === 0,
            sanitizedValue: threats.length > 0 ? sanitized : value,
            threats,
        };
    }
    escapeHtml(str) {
        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
        };
        return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
    }
    static detectThreats(value) {
        const threats = [];
        for (const pattern of SQL_INJECTION_PATTERNS) {
            if (pattern.test(value)) {
                threats.push('sql_injection');
                pattern.lastIndex = 0;
                break;
            }
        }
        for (const pattern of XSS_PATTERNS) {
            if (pattern.test(value)) {
                threats.push('xss');
                pattern.lastIndex = 0;
                break;
            }
        }
        const commandPatterns = [/\$\([^)]*\)/g, /`[^`]*`/g];
        for (const pattern of commandPatterns) {
            if (pattern.test(value)) {
                threats.push('command_injection');
                pattern.lastIndex = 0;
                break;
            }
        }
        return threats;
    }
};
exports.SanitizationInterceptor = SanitizationInterceptor;
exports.SanitizationInterceptor = SanitizationInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], SanitizationInterceptor);
//# sourceMappingURL=sanitization.interceptor.js.map