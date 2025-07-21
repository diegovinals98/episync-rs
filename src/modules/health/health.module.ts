import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController, SupportController } from "./health.controller";
import { HealthService } from "./health.service";

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController, SupportController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
