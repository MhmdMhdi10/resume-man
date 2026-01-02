import { SetMetadata } from '@nestjs/common';
import { SKIP_SANITIZATION_KEY } from '../interceptors/sanitization.interceptor';

/**
 * Decorator to skip input sanitization for a route or controller
 * Use with caution - only for routes that handle raw data intentionally
 */
export const SkipSanitization = () => SetMetadata(SKIP_SANITIZATION_KEY, true);
