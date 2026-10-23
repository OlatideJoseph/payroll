import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

/** Authenticates machine callers via a static `x-worker-token` header. */
@Injectable()
export class WorkerGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.headers['x-worker-token'];
    const expected = this.config.get<string>('WORKER_API_KEY');
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid worker token');
    }
    return true;
  }
}
