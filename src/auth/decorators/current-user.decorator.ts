import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { User } from '../../users/entities/user.entity';

/**
 * Resolves the authenticated user (set by JwtStrategy.validate) from the request.
 * Pass a key to pull a single field, e.g. @CurrentUser('id').
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: User }>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
