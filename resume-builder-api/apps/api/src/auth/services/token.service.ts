import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IAuthTokens } from '@app/shared';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class TokenService {
  private readonly accessTokenExpiresIn: number;
  private readonly refreshTokenExpiresIn: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Default: 15 minutes for access token
    this.accessTokenExpiresIn = this.configService.get<number>(
      'JWT_ACCESS_EXPIRES_IN',
      900,
    );
    // Default: 7 days for refresh token
    this.refreshTokenExpiresIn = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_IN',
      604800,
    );
  }

  async generateTokens(userId: string, email: string): Promise<IAuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email),
      this.generateRefreshToken(userId, email),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTokenExpiresIn,
    };
  }

  async generateAccessToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  async generateRefreshToken(userId: string, email: string): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.refreshTokenExpiresIn,
    });
  }

  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  async decodeToken(token: string): Promise<JwtPayload | null> {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch {
      return null;
    }
  }

  isTokenExpired(payload: JwtPayload): boolean {
    if (!payload.exp) {
      return true;
    }
    return Date.now() >= payload.exp * 1000;
  }
}
