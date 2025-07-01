import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'LOGGER',
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get('nodeEnv') === 'production' ? 'info' : 'debug';
        
        const transports: winston.transport[] = [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.colorize(),
              winston.format.printf(({ timestamp, level, message, context, trace }) => {
                return `${timestamp} [${context}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
              }),
            ),
          }),
        ];

        // Add file transport in production
        if (configService.get('nodeEnv') === 'production') {
          const fileTransport = new winston.transports.DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json(),
            ),
          });
          transports.push(fileTransport);
        }

        return winston.createLogger({
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
          ),
          transports,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['LOGGER'],
})
export class LoggerModule {} 