import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

export const SKIP_SANITIZATION_KEY = 'skipSanitization';

// Common SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(--)|(\/\*)|(\*\/)/g,
  /(;|\||&)/g,
  /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/gi,
  /'\s*(OR|AND)\s*'?\d+'\s*=\s*'?\d+/gi,
  /(\bOR\b|\bAND\b)\s*'[^']*'\s*=\s*'[^']*'/gi,
];

// Common XSS patterns
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

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]]/g,
  /\$\([^)]*\)/g,
  /`[^`]*`/g,
];

export interface SanitizationResult {
  isValid: boolean;
  sanitizedValue: any;
  threats: string[];
}

@Injectable()
export class SanitizationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Check if sanitization should be skipped
    const skipSanitization = this.reflector.getAllAndOverride<boolean>(
      SKIP_SANITIZATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipSanitization) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();

    // Sanitize request body
    if (request.body && typeof request.body === 'object') {
      const bodyResult = this.sanitizeObject(request.body);
      if (!bodyResult.isValid) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Request contains potentially malicious content',
          threats: bodyResult.threats,
        });
      }
      request.body = bodyResult.sanitizedValue;
    }

    // Sanitize query parameters (modify in place since request.query is getter-only)
    if (request.query && typeof request.query === 'object') {
      const queryResult = this.sanitizeObject(request.query);
      if (!queryResult.isValid) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Query parameters contain potentially malicious content',
          threats: queryResult.threats,
        });
      }
      // Modify in place instead of reassigning
      Object.keys(request.query).forEach(key => {
        if (queryResult.sanitizedValue[key] !== undefined) {
          request.query[key] = queryResult.sanitizedValue[key];
        }
      });
    }

    // Sanitize URL parameters (modify in place since request.params is getter-only)
    if (request.params && typeof request.params === 'object') {
      const paramsResult = this.sanitizeObject(request.params);
      if (!paramsResult.isValid) {
        throw new BadRequestException({
          statusCode: 400,
          error: 'Bad Request',
          message: 'URL parameters contain potentially malicious content',
          threats: paramsResult.threats,
        });
      }
      // Modify in place instead of reassigning
      Object.keys(request.params).forEach(key => {
        if (paramsResult.sanitizedValue[key] !== undefined) {
          request.params[key] = paramsResult.sanitizedValue[key];
        }
      });
    }

    return next.handle();
  }

  sanitizeObject(obj: any, path: string = ''): SanitizationResult {
    const threats: string[] = [];
    
    if (obj === null || obj === undefined) {
      return { isValid: true, sanitizedValue: obj, threats };
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, path);
    }

    if (Array.isArray(obj)) {
      const sanitizedArray: any[] = [];
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
      const sanitizedObj: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        // Sanitize the key itself
        const keyResult = this.sanitizeString(key, `${path}.key`);
        if (!keyResult.isValid) {
          threats.push(...keyResult.threats);
        }
        
        // Sanitize the value
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

    // For numbers, booleans, etc., return as-is
    return { isValid: true, sanitizedValue: obj, threats };
  }

  sanitizeString(value: string, path: string = ''): SanitizationResult {
    const threats: string[] = [];
    let sanitized = value;

    // Check for SQL injection
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        threats.push(`SQL injection pattern detected at ${path}`);
        // Reset lastIndex for global patterns
        pattern.lastIndex = 0;
      }
    }

    // Check for XSS
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(value)) {
        threats.push(`XSS pattern detected at ${path}`);
        pattern.lastIndex = 0;
      }
    }

    // Check for command injection (only for certain contexts)
    // We're more lenient here as some characters are valid in passwords, etc.
    const dangerousCommandPatterns = [
      /\$\([^)]*\)/g,  // $(command)
      /`[^`]*`/g,       // `command`
    ];
    
    for (const pattern of dangerousCommandPatterns) {
      if (pattern.test(value)) {
        threats.push(`Command injection pattern detected at ${path}`);
        pattern.lastIndex = 0;
      }
    }

    // Sanitize HTML entities for XSS prevention
    sanitized = this.escapeHtml(sanitized);

    return {
      isValid: threats.length === 0,
      sanitizedValue: threats.length > 0 ? sanitized : value,
      threats,
    };
  }

  private escapeHtml(str: string): string {
    const htmlEntities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
    };
    
    return str.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
  }

  /**
   * Static method for testing purposes
   */
  static detectThreats(value: string): string[] {
    const threats: string[] = [];

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
}
