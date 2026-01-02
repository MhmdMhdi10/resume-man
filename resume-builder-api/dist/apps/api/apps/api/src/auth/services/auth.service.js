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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const user_repository_1 = require("../repositories/user.repository");
const token_service_1 = require("./token.service");
let AuthService = class AuthService {
    constructor(userRepository, tokenService, configService) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
        this.configService = configService;
        this.passwordResetExpiresIn = this.configService.get('PASSWORD_RESET_EXPIRES_IN', 3600000);
    }
    async register(dto) {
        const existingUser = await this.userRepository.findByEmail(dto.email);
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const user = await this.userRepository.create({
            email: dto.email,
            password: dto.password,
            firstName: dto.firstName,
            lastName: dto.lastName,
        });
        const tokens = await this.tokenService.generateTokens(user._id.toString(), user.email);
        await this.userRepository.setRefreshToken(user._id.toString(), tokens.refreshToken);
        return tokens;
    }
    async login(dto) {
        const user = await this.userRepository.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await this.userRepository.validatePassword(user, dto.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const tokens = await this.tokenService.generateTokens(user._id.toString(), user.email);
        await this.userRepository.setRefreshToken(user._id.toString(), tokens.refreshToken);
        return tokens;
    }
    async refreshToken(refreshToken) {
        const payload = await this.tokenService.verifyToken(refreshToken);
        if (!payload || payload.type !== 'refresh') {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = await this.userRepository.findById(payload.sub);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isValid = await this.userRepository.validateRefreshToken(user, refreshToken);
        if (!isValid) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const tokens = await this.tokenService.generateTokens(user._id.toString(), user.email);
        await this.userRepository.setRefreshToken(user._id.toString(), tokens.refreshToken);
        return tokens;
    }
    async logout(userId) {
        await this.userRepository.setRefreshToken(userId, null);
    }
    async requestPasswordReset(email) {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            return;
        }
        const resetToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date(Date.now() + this.passwordResetExpiresIn);
        await this.userRepository.setPasswordResetToken(user._id.toString(), resetToken, expiresAt);
    }
    async resetPassword(token, newPassword) {
        const user = await this.userRepository.findByPasswordResetToken(token);
        if (!user) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        await this.userRepository.updatePassword(user._id.toString(), newPassword);
        await this.userRepository.setRefreshToken(user._id.toString(), null);
    }
    async getCurrentUser(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        token_service_1.TokenService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map