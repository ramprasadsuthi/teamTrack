import path from 'path';
import fs from 'fs';
import express from 'express';
import { app } from './app';
import { CONFIG } from './config/index';
import { deadlineEngine } from './services/deadlineEngine';

// Serve frontend static build if available
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`[TeamTrack Server] Running on http://0.0.0.0:${CONFIG.PORT}`);
  console.log(`[TeamTrack Storage] Persistent JSON data directory: ${CONFIG.DATA_DIR}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('[TeamTrack Server] Shutting down gracefully...');
  deadlineEngine.stop();
  server.close(() => {
    console.log('[TeamTrack Server] Closed active connections. Bye.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
