import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';

// Configuration modules
import { DatabaseModule } from '@/config/database/database.module';
import { LoggerModule } from '@/config/logger/logger.module';

// Feature modules
import { HealthModule } from '@/modules/health/health.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { GroupsModule } from '@/modules/groups/groups.module';
import { SeriesModule } from '@/modules/series/series.module';
import { DevelopmentModule } from '@/modules/development/development.module';

// Shared modules
import { SharedModule } from '@/shared/shared.module';

// Configuration validation
import configuration from '@/config/configuration';
import { validationSchema } from '@/config/validation';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
      expandVariables: true,
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    
    // Health checks
    TerminusModule,
    
    // Configuration modules
    DatabaseModule,
    LoggerModule,
    
    // Feature modules
    HealthModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    GroupsModule,
    SeriesModule,
    DevelopmentModule,
    
    // Shared modules
    SharedModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {} 