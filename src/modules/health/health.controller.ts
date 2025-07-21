import { Controller, Get, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { HealthService } from "./health.service";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({
    status: 200,
    description: "Application is healthy",
    schema: {
      properties: {
        status: { type: "string", example: "ok" },
        timestamp: { type: "string", format: "date-time" },
        uptime: { type: "number", example: 123.456 },
      },
    },
  })
  getHealth() {
    return this.healthService.getStatus();
  }
}

@Controller()
export class SupportController {
  @Get("support")
  @ApiOperation({ summary: "Support page" })
  @ApiResponse({
    status: 200,
    description: "Support page served",
  })
  getSupportPage(@Res() res: Response) {
    res.sendFile("support.html", { root: "./public" });
  }
}
