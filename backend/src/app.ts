import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { apiRouter } from './routes/api';
import { deadlineEngine } from './services/deadlineEngine';
import { storage } from './services/storage';
import { loadSampleData } from './services/sampleData';

export const app = express();

// Security and utility middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Request timestamp header
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Application-Name', 'TeamTrack');
  next();
});

// Mount API routes for both direct and prefixed mounts
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/v1', apiRouter);
app.use('/', apiRouter);

// Centralized error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]', err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'An internal server error occurred.';
  res.status(status).json({
    error: message,
    status,
    timestamp: new Date().toISOString(),
  });
});

// Start background deadline engine on application boot
deadlineEngine.start(5);

// If brand new deployment with empty data, populate sample demonstration dataset once
storage.getAllTasks().then(async (tasks) => {
  if (tasks.length === 0) {
    try {
      console.log('[TeamTrack] Brand new workspace detected. Initializing demonstration data...');
      await loadSampleData();
    } catch (err) {
      console.error('[TeamTrack] Error initializing sample data:', err);
    }
  }
});
