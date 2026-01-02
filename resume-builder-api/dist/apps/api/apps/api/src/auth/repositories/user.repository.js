"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("../schemas/user.schema");
let UserRepository = class UserRepository {
    constructor(userModel) {
        this.userModel = userModel;
        this.SALT_ROUNDS = 12;
    }
    async create(data) {
        const passwordHash = await this.hashPassword(data.password);
        const user = new this.userModel({
            email: data.email.toLowerCase(),
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
        });
        return user.save();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            return null;
        }
        return this.userModel.findById(id).exec();
    }
    async findByEmail(email) {
        return this.userModel.findOne({ email: email.toLowerCase() }).exec();
    }
    async findByPasswordResetToken(token) {
        return this.userModel
            .findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: new Date() },
        })
            .exec();
    }
    async update(id, data) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            return null;
        }
        return this.userModel
            .findByIdAndUpdate(id, { $set: data }, { new: true })
            .exec();
    }
    async updatePassword(id, newPassword) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            return null;
        }
        const passwordHash = await this.hashPassword(newPassword);
        return this.userModel
            .findByIdAndUpdate(id, {
            $set: {
                passwordHash,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        }, { new: true })
            .exec();
    }
    async setRefreshToken(id, refreshToken) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            return null;
        }
        const refreshTokenHash = refreshToken
            ? await this.hashToken(refreshToken)
            : null;
        return this.userModel
            .findByIdAndUpdate(id, { $set: { refreshTokenHash } }, { new: true })
            .exec();
    }
    async setPasswordResetToken(id, token, expiresAt) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            return null;
        }
        return this.userModel
            .findByIdAndUpdate(id, {
            $set: {
                passwordResetToken: token,
                passwordResetExpires: expiresAt,
            },
        }, { new: true })
            .exec();
    }
    async delete(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            return false;
        }
        const result = await this.userModel.deleteOne({ _id: id }).exec();
        return result.deletedCount === 1;
    }
    async emailExists(email) {
        const count = await this.userModel
            .countDocuments({ email: email.toLowerCase() })
            .exec();
        return count > 0;
    }
    async validatePassword(user, password) {
        return bcrypt.compare(password, user.passwordHash);
    }
    async validateRefreshToken(user, refreshToken) {
        if (!user.refreshTokenHash) {
            return false;
        }
        return bcrypt.compare(refreshToken, user.refreshTokenHash);
    }
    async hashPassword(password) {
        return bcrypt.hash(password, this.SALT_ROUNDS);
    }
    async hashToken(token) {
        return bcrypt.hash(token, this.SALT_ROUNDS);
    }
};
exports.UserRepository = UserRepository;
exports.UserRepository = UserRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], UserRepository);
//# sourceMappingURL=user.repository.js.map