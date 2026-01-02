/**
 * Feature: resume-builder-auto-sender
 * Property 9: JWT Token Validation
 * Validates: Requirements 9.5
 *
 * For any protected API endpoint, requests without valid JWT tokens
 * or with expired/blacklisted tokens should be rejected with 401 status.
 */

import * as fc from 'fast-check';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from '../services/token.service';
import { JwtPayload } from '../strategies/jwt.strategy';

describe('Property 9: JWT Token Validation', () => {
  let tokenService: TokenService;
  let jwtService: JwtService;
  const JWT_SECRET = 'test-secret-key-for-testing';

  beforeAll(() => {
    jwtService = new JwtService({
      secret: JWT_SECRET,
      signOptions: { algorithm: 'HS256' },
    });

    const configService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          JWT_SECRET: JWT_SECRET,
          JWT_ACCESS_EXPIRES_IN: 900, // 15 minutes
          JWT_REFRESH_EXPIRES_IN: 604800, // 7 days
        };
        return config[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    tokenService = new TokenService(jwtService, configService);
  });

  // Arbitrary for generating valid user IDs (MongoDB ObjectId format)
  const userIdArb = fc.hexaString({ minLength: 24, maxLength: 24 });

  // Arbitrary for generating valid email addresses
  const emailArb = fc.emailAddress();

  describe('Valid token generation and verification', () => {
    it('should generate valid access tokens that can be verified', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, emailArb, async (userId, email) => {
          const tokens = await tokenService.generateTokens(userId, email);

          // Access token should be verifiable
          const payload = await tokenService.verifyToken(tokens.accessToken);
          expect(payload).not.toBeNull();
          expect(payload?.sub).toBe(userId);
          expect(payload?.email).toBe(email);
          expect(payload?.type).toBe('access');
        }),
        { numRuns: 100 },
      );
    });

    it('should generate valid refresh tokens that can be verified', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, emailArb, async (userId, email) => {
          const tokens = await tokenService.generateTokens(userId, email);

          // Refresh token should be verifiable
          const payload = await tokenService.verifyToken(tokens.refreshToken);
          expect(payload).not.toBeNull();
          expect(payload?.sub).toBe(userId);
          expect(payload?.email).toBe(email);
          expect(payload?.type).toBe('refresh');
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Invalid token rejection', () => {
    // Arbitrary for generating random strings that are not valid JWTs
    const invalidTokenArb = fc.oneof(
      fc.string({ minLength: 1, maxLength: 100 }), // Random strings
      fc.constant(''), // Empty string
      fc.constant('invalid.token.here'), // Invalid JWT format
      fc.constant('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature'), // Malformed JWT
    );

    it('should reject invalid tokens', async () => {
      await fc.assert(
        fc.asyncProperty(invalidTokenArb, async (invalidToken) => {
          const payload = await tokenService.verifyToken(invalidToken);
          expect(payload).toBeNull();
        }),
        { numRuns: 100 },
      );
    });

    it('should reject tokens signed with wrong secret', async () => {
      const wrongSecretJwtService = new JwtService({
        secret: 'wrong-secret-key',
        signOptions: { algorithm: 'HS256' },
      });

      await fc.assert(
        fc.asyncProperty(userIdArb, emailArb, async (userId, email) => {
          // Generate token with wrong secret
          const wrongToken = await wrongSecretJwtService.signAsync({
            sub: userId,
            email,
            type: 'access',
          });

          // Should fail verification with correct secret
          const payload = await tokenService.verifyToken(wrongToken);
          expect(payload).toBeNull();
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Token expiration detection', () => {
    it('should correctly identify expired tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          emailArb,
          fc.integer({ min: 1, max: 1000000 }), // Past timestamp offset in seconds
          async (userId, email, pastOffset) => {
            const expiredPayload: JwtPayload = {
              sub: userId,
              email,
              type: 'access',
              exp: Math.floor(Date.now() / 1000) - pastOffset, // Expired
            };

            expect(tokenService.isTokenExpired(expiredPayload)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should correctly identify non-expired tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          emailArb,
          fc.integer({ min: 60, max: 1000000 }), // Future timestamp offset in seconds
          async (userId, email, futureOffset) => {
            const validPayload: JwtPayload = {
              sub: userId,
              email,
              type: 'access',
              exp: Math.floor(Date.now() / 1000) + futureOffset, // Not expired
            };

            expect(tokenService.isTokenExpired(validPayload)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Token type validation', () => {
    it('should generate tokens with correct types', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, emailArb, async (userId, email) => {
          const tokens = await tokenService.generateTokens(userId, email);

          const accessPayload = await tokenService.verifyToken(tokens.accessToken);
          const refreshPayload = await tokenService.verifyToken(tokens.refreshToken);

          // Access token should have type 'access'
          expect(accessPayload?.type).toBe('access');

          // Refresh token should have type 'refresh'
          expect(refreshPayload?.type).toBe('refresh');
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Token decode without verification', () => {
    it('should decode tokens without verification', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, emailArb, async (userId, email) => {
          const tokens = await tokenService.generateTokens(userId, email);

          // Should be able to decode without verification
          const decoded = await tokenService.decodeToken(tokens.accessToken);
          expect(decoded).not.toBeNull();
          expect(decoded?.sub).toBe(userId);
          expect(decoded?.email).toBe(email);
        }),
        { numRuns: 100 },
      );
    });
  });
});
