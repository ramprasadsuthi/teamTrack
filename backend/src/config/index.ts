import path from 'path';

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATA_DIR: process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(process.cwd(), 'data'),
  DEFAULT_TIMEZONE: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  SCHEMA_VERSION: '1.0.0',
};
