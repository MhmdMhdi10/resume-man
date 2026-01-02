import {
  Controller,
  Post,
  Body,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  PasswordResetRequestDto,
  PasswordResetDto,
  IAuthTokens,
  IUser,
} from '@app/shared';
import { AuthService } from '../services/auth.service';
import { Public } from '../decorators/public.decorator';
import { CurrentUser, CurrentUserData } from '../decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<IAuthTokens> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<IAuthTokens> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<IAuthTokens> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: CurrentUserData): Promise<void> {
    await this.authService.logout(user.userId);
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
  ): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(dto.email);
    // Always return success to prevent email enumeration
    return { message: 'If the email exists, a reset link has been sent' };
  }

  @Public()
  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: PasswordResetDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset successfully' };
  }

  @Get('me')
  async getCurrentUser(@CurrentUser() user: CurrentUserData): Promise<IUser> {
    return this.authService.getCurrentUser(user.userId);
  }
}
