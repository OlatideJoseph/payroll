import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [ UsersModule, TypeOrmModule.forRoot({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'payroll',
    password: 'payroll',
    database: 'payroll',
    autoLoadEntities: true,
    synchronize: true,
  }), CompanyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
