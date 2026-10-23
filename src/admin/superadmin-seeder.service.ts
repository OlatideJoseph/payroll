import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

/** Seeds a SUPERADMIN user from env on startup, if configured and absent. */
@Injectable()
export class SuperadminSeederService implements OnModuleInit {
  private readonly logger = new Logger(SuperadminSeederService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('SUPERADMIN_EMAIL');
    const password = this.config.get<string>('SUPERADMIN_PASSWORD');
    if (!email || !password) {
      this.logger.warn(
        'SUPERADMIN_EMAIL/PASSWORD not set; skipping superadmin seed.',
      );
      return;
    }
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await this.usersService.createWithRole({
      email,
      firstName: 'Super',
      lastName: 'Admin',
      password: passwordHash,
      role: UserRole.SUPERADMIN,
      emailVerified: true,
    });
    this.logger.log(`Seeded superadmin ${email}`);
  }
}
