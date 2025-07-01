import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  async isHealthy() {
    return {
      app: {
        status: 'up',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: this.configService.get('nodeEnv'),
        version: process.env.npm_package_version || '1.0.0',
      },
    };
  }

  getStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get('nodeEnv'),
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      pid: process.pid,
    };
  }
} 