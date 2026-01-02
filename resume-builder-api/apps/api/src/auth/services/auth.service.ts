import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { IAuthTokens, IUser } from '@app/shared';
import { RegisterDto, LoginDto } from '@app/shared';
import { UserRepository } from '../repositories/user.repository';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly passwordResetExpiresIn: number;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {
    // Default: 1 hour for password reset token
    this.passwordResetExpiresIn = this.configService.get<number>(
      'PASSWORD_RESET_EXPIRES_IN',
      3600000,
    );
  }

  async register(dto: RegisterDto): Promise<IAuthTokens> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Create user
    const user = await this.userRepository.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      user._id.toString(),
      user.email,
    );

    // Store refresh token hash
    await this.userRepository.setRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );

    return tokens;
  }

  async login(dto: LoginDto): Promise<IAuthTokens> {
    // Find user by email
    const user = await this.userRepository.findByEmail(dto.email);

    // Return generic error to prevent email enumeration
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await this.userRepository.validatePassword(
      user,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      user._id.toString(),
      user.email,
    );

    // Store refresh token hash
    await this.userRepository.setRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );

    return tokens;
  }

  async refreshToken(refreshToken: string): Promise<IAuthTokens> {
    // Verify the refresh token
    const payload = await this.tokenService.verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find user
    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Validate refresh token against stored hash
    const isValid = await this.userRepository.validateRefreshToken(
      user,
      refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.tokenService.generateTokens(
      user._id.toString(),
      user.email,
    );

    // Update stored refresh token hash
    await this.userRepository.setRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    // Clear refresh token
    await this.userRepository.setRefreshToken(userId, null);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.passwordResetExpiresIn);

    // Store reset token
    await this.userRepository.setPasswordResetToken(
      user._id.toString(),
      resetToken,
      expiresAt,
    );

    // TODO: Send email with reset link
    // In production, this would send an email with the reset token
    // For now, we just store the token
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findByPasswordResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password and clear reset token
    await this.userRepository.updatePassword(user._id.toString(), newPassword);

    // Clear any existing refresh tokens (force re-login)
    await this.userRepository.setRefreshToken(user._id.toString(), null);
  }

  async getCurrentUser(userId: string): Promise<IUser> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
