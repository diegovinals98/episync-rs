import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserPushToken } from "./entities/user-push-token.entity";
import { User } from "./entities/user.entity";
import { S3UploadService } from "./s3-upload.service";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPushToken]), ConfigModule],
  controllers: [UsersController],
  providers: [UsersService, S3UploadService],
  exports: [UsersService],
})
export class UsersModule {}
