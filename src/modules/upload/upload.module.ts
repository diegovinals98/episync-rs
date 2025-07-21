import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { S3UploadService } from "../users/s3-upload.service";
import { UploadController } from "./upload.controller";

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [S3UploadService],
  exports: [S3UploadService],
})
export class UploadModule {}
