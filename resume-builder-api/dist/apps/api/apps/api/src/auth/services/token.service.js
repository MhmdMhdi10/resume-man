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
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
let TokenService = class TokenService {
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
        this.accessTokenExpiresIn = this.configService.get('JWT_ACCESS_EXPIRES_IN', 900);
        this.refreshTokenExpiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN', 604800);
    }
    async generateTokens(userId, email) {
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
    async generateAccessToken(userId, email) {
        const payload = {
            sub: userId,
            email,
            type: 'access',
        };
        return this.jwtService.signAsync(payload, {
            expiresIn: this.accessTokenExpiresIn,
        });
    }
    async generateRefreshToken(userId, email) {
        const payload = {
            sub: userId,
            email,
            type: 'refresh',
        };
        return this.jwtService.signAsync(payload, {
            expiresIn: this.refreshTokenExpiresIn,
        });
    }
    async verifyToken(token) {
        try {
            return await this.jwtService.verifyAsync(token);
        }
        catch {
            return null;
        }
    }
    async decodeToken(token) {
        try {
            return this.jwtService.decode(token);
        }
        catch {
            return null;
        }
    }
    isTokenExpired(payload) {
        if (!payload.exp) {
            return true;
        }
        return Date.now() >= payload.exp * 1000;
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], TokenService);
//# sourceMappingURL=token.service.js.map