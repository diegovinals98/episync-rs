import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(4000),
  
  // Database
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(3306),
  DB_USERNAME: Joi.string().default('root'),
  DB_PASSWORD: Joi.string().default(''),
  DB_NAME: Joi.string().default('family_series_track'),
  
  // JWT
  JWT_SECRET: Joi.string().default('super-secret-key'),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  
  // External APIs
  AIDBOX_URL: Joi.string().optional(),
  AIDBOX_CLIENT_ID: Joi.string().optional(),
  AIDBOX_CLIENT_SECRET: Joi.string().optional(),
  
  PARTICLE_URL: Joi.string().optional(),
  PARTICLE_API_KEY: Joi.string().optional(),
  
  // Notifications
  EMAIL_HOST: Joi.string().optional(),
  EMAIL_PORT: Joi.number().default(587),
  EMAIL_SECURE: Joi.boolean().default(false),
  EMAIL_USER: Joi.string().optional(),
  EMAIL_PASS: Joi.string().optional(),
  
  EXPO_ACCESS_TOKEN: Joi.string().optional(),
  
  // CORS
  CORS_ORIGINS: Joi.string().default('*'),
  
  // Rate limiting
  THROTTLER_TTL: Joi.number().default(60000),
  THROTTLER_LIMIT: Joi.number().default(100),
}); 