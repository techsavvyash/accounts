export const config = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/accounts',
  CORS_ORIGINS: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  POSTHOG_API_KEY: process.env.POSTHOG_API_KEY || '',
  POSTHOG_HOST: process.env.POSTHOG_HOST || 'https://app.posthog.com',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  S3_BUCKET: process.env.S3_BUCKET || 'accounts-files',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Heimdall Authentication Service (Required)
  HEIMDALL_URL: process.env.HEIMDALL_URL || 'http://localhost:8080',
  HEIMDALL_TENANT_ID: process.env.HEIMDALL_TENANT_ID || '',
}