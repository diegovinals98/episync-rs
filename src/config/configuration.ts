export default () => ({
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 3306,
    username: process.env.DATABASE_USERNAME || 'root',
    password: process.env.DATABASE_PASSWORD || 'password',
    database: process.env.DATABASE_NAME || 'family_series_track',
    synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  
  // External APIs
  aidbox: {
    url: process.env.AIDBOX_URL,
    clientId: process.env.AIDBOX_CLIENT_ID,
    clientSecret: process.env.AIDBOX_CLIENT_SECRET,
  },
  
  particle: {
    url: process.env.PARTICLE_URL,
    apiKey: process.env.PARTICLE_API_KEY,
  },
  
  // Notifications
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  
  expo: {
    accessToken: process.env.EXPO_ACCESS_TOKEN,
  },
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS || '*',
  
  // Rate limiting
  throttler: {
    ttl: parseInt(process.env.THROTTLER_TTL, 10) || 60000,
    limit: parseInt(process.env.THROTTLER_LIMIT, 10) || 100,
  },
  
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || 'your-tmdb-api-key',
  },
}); 