import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/entities/user.entity";
import { DevelopmentController } from "./development.controller";
import { DevelopmentService } from "./development.service";

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [DevelopmentController],
  providers: [DevelopmentService],
  exports: [DevelopmentService],
})
export class DevelopmentModule {}
