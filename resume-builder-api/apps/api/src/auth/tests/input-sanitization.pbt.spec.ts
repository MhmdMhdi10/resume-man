/**
 * Feature: resume-builder-auto-sender
 * Property 7: Input Validation and Sanitization
 * Validates: Requirements 9.2, 9.4
 *
 * For any incoming API request with potentially malicious input (SQL injection,
 * XSS, command injection patterns), the API_Gateway should sanitize the input
 * and reject invalid requests.
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, BadRequestException, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { SanitizationInterceptor } from '../interceptors/sanitization.interceptor';

describe('Input Sanitization Property Tests', () => {
  let interceptor: SanitizationInterceptor;

  const createMockContext = (body?: any, query?: any, params?: any): ExecutionContext => {
    const mockRequest = {
      body: body || {},
      query: query || {},
      params: params || {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (): CallHandler => ({
    handle: () => of({ success: true }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SanitizationInterceptor,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    interceptor = module.get<SanitizationInterceptor>(SanitizationInterceptor);
  });

  // SQL Injection attack generators
  const sqlInjectionArbitrary = fc.oneof(
    fc.constant("'; DROP TABLE users; --"),
    fc.constant("1' OR '1'='1"),
    fc.constant("1; SELECT * FROM users"),
    fc.constant("admin'--"),
    fc.constant("1 UNION SELECT * FROM passwords"),
    fc.constant("'; DELETE FROM users WHERE '1'='1"),
    fc.constant("1' AND 1=1 --"),
    fc.constant("' OR 1=1 /*"),
    fc.constant("'; EXEC xp_cmdshell('dir'); --"),
    fc.constant("1'; TRUNCATE TABLE users; --"),
  );

  // XSS attack generators
  const xssArbitrary = fc.oneof(
    fc.constant('<script>alert("XSS")</script>'),
    fc.constant('<img src="x" onerror="alert(1)">'),
    fc.constant('<svg onload="alert(1)">'),
    fc.constant('javascript:alert(1)'),
    fc.constant('<iframe src="javascript:alert(1)"></iframe>'),
    fc.constant('<body onload="alert(1)">'),
    fc.constant('<div onclick="alert(1)">click</div>'),
    fc.constant('data:text/html,<script>alert(1)</script>'),
    fc.constant('<img src=x onerror=alert(1)>'),
    fc.constant('vbscript:msgbox("XSS")'),
  );

  // Command injection generators
  const commandInjectionArbitrary = fc.oneof(
    fc.constant('$(cat /etc/passwd)'),
    fc.constant('`cat /etc/passwd`'),
    fc.constant('$(rm -rf /)'),
    fc.constant('`whoami`'),
    fc.constant('$(id)'),
  );

  // Safe input generators - only alphanumeric and basic punctuation
  // Excludes characters that could form SQL injection patterns (like --, /*, etc.)
  // and command injection patterns (like $, `, (, ), etc.)
  const safeStringArbitrary = fc.stringOf(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?@#%^_+=:'.split('')
    ),
    { minLength: 1, maxLength: 100 }
  ).filter(s => {
    // Additional filter to ensure no SQL comment patterns
    return !s.includes('--') && !s.includes('/*') && !s.includes('*/');
  });

  // Safe field name generator
  const safeFieldNameArbitrary = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
    { minLength: 1, maxLength: 20 }
  );

  /**
   * Property: SQL injection patterns should be detected and rejected
   */
  it('should detect and reject SQL injection patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        sqlInjectionArbitrary,
        safeFieldNameArbitrary,
        async (maliciousInput, fieldName) => {
          const context = createMockContext({ [fieldName]: maliciousInput });
          const handler = createMockCallHandler();

          let threwException = false;
          let exceptionType: any = null;

          try {
            await lastValueFrom(interceptor.intercept(context, handler));
          } catch (error) {
            threwException = true;
            exceptionType = error;
          }

          // Should throw BadRequestException for SQL injection
          expect(threwException).toBe(true);
          expect(exceptionType).toBeInstanceOf(BadRequestException);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: XSS patterns should be detected and rejected
   */
  it('should detect and reject XSS patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        xssArbitrary,
        safeFieldNameArbitrary,
        async (maliciousInput, fieldName) => {
          const context = createMockContext({ [fieldName]: maliciousInput });
          const handler = createMockCallHandler();

          let threwException = false;
          let exceptionType: any = null;

          try {
            await lastValueFrom(interceptor.intercept(context, handler));
          } catch (error) {
            threwException = true;
            exceptionType = error;
          }

          expect(threwException).toBe(true);
          expect(exceptionType).toBeInstanceOf(BadRequestException);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Command injection patterns should be detected and rejected
   */
  it('should detect and reject command injection patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        commandInjectionArbitrary,
        safeFieldNameArbitrary,
        async (maliciousInput, fieldName) => {
          const context = createMockContext({ [fieldName]: maliciousInput });
          const handler = createMockCallHandler();

          let threwException = false;
          let exceptionType: any = null;

          try {
            await lastValueFrom(interceptor.intercept(context, handler));
          } catch (error) {
            threwException = true;
            exceptionType = error;
          }

          expect(threwException).toBe(true);
          expect(exceptionType).toBeInstanceOf(BadRequestException);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Safe inputs should be allowed through
   */
  it('should allow safe inputs through', async () => {
    await fc.assert(
      fc.asyncProperty(
        safeStringArbitrary,
        safeFieldNameArbitrary,
        async (safeInput, fieldName) => {
          const context = createMockContext({ [fieldName]: safeInput });
          const handler = createMockCallHandler();

          let threwException = false;

          try {
            const result = await lastValueFrom(interceptor.intercept(context, handler));
            expect(result).toEqual({ success: true });
          } catch (error) {
            threwException = true;
          }

          // Should NOT throw for safe inputs
          expect(threwException).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Nested objects should be sanitized recursively
   */
  it('should sanitize nested objects recursively', async () => {
    await fc.assert(
      fc.asyncProperty(
        sqlInjectionArbitrary,
        fc.integer({ min: 1, max: 5 }),
        async (maliciousInput, depth) => {
          // Create nested object with malicious input at specified depth
          let nestedObj: any = { value: maliciousInput };
          for (let i = 0; i < depth; i++) {
            nestedObj = { nested: nestedObj };
          }

          const context = createMockContext(nestedObj);
          const handler = createMockCallHandler();

          let threwException = false;
          let exceptionType: any = null;

          try {
            await lastValueFrom(interceptor.intercept(context, handler));
          } catch (error) {
            threwException = true;
            exceptionType = error;
          }

          expect(threwException).toBe(true);
          expect(exceptionType).toBeInstanceOf(BadRequestException);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Arrays should be sanitized
   */
  it('should sanitize arrays containing malicious content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(xssArbitrary, { minLength: 1, maxLength: 5 }),
        async (maliciousArray) => {
          const context = createMockContext({ items: maliciousArray });
          const handler = createMockCallHandler();

          let threwException = false;
          let exceptionType: any = null;

          try {
            await lastValueFrom(interceptor.intercept(context, handler));
          } catch (error) {
            threwException = true;
            exceptionType = error;
          }

          expect(threwException).toBe(true);
          expect(exceptionType).toBeInstanceOf(BadRequestException);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Query parameters should be sanitized
   */
  it('should sanitize query parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        sqlInjectionArbitrary,
        safeFieldNameArbitrary,
        async (maliciousInput, paramName) => {
          const context = createMockContext({}, { [paramName]: maliciousInput });
          const handler = createMockCallHandler();

          let threwException = false;
          let exceptionType: any = null;

          try {
            await lastValueFrom(interceptor.intercept(context, handler));
          } catch (error) {
            threwException = true;
            exceptionType = error;
          }

          expect(threwException).toBe(true);
          expect(exceptionType).toBeInstanceOf(BadRequestException);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: URL parameters should be sanitized
   */
  it('should sanitize URL parameters', async () => {
    await fc.assert(
      fc.asyncProperty(
        xssArbitrary,
        safeFieldNameArbitrary,
        async (maliciousInput, paramName) => {
          const context = createMockContext({}, {}, { [paramName]: maliciousInput });
          const handler = createMockCallHandler();

          let threwException = false;
          let exceptionType: any = null;

          try {
            await lastValueFrom(interceptor.intercept(context, handler));
          } catch (error) {
            threwException = true;
            exceptionType = error;
          }

          expect(threwException).toBe(true);
          expect(exceptionType).toBeInstanceOf(BadRequestException);
        },
      ),
      { numRuns: 100 },
    );
  });
});
