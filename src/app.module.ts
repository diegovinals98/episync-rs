import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TerminusModule } from "@nestjs/terminus";
import { ThrottlerModule } from "@nestjs/throttler";

// Configuration modules
import { DatabaseModule } from "@/config/database/database.module";
import { LoggerModule } from "@/config/logger/logger.module";

// Feature modules
import { AuthModule } from "@/modules/auth/auth.module";
import { DevelopmentModule } from "@/modules/development/development.module";
import { GroupsModule } from "@/modules/groups/groups.module";
import { HealthModule } from "@/modules/health/health.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { SeriesModule } from "@/modules/series/series.module";
import { UsersModule } from "@/modules/users/users.module";
import { WebSocketsModule } from "@/modules/websockets/websockets.module";

// Shared modules
import { SharedModule } from "@/shared/shared.module";

// Configuration validation
import configuration from "@/config/configuration";
import { validationSchema } from "@/config/validation";

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: [".env.local", ".env"],
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
    WebSocketsModule,

    // Shared modules
    SharedModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
