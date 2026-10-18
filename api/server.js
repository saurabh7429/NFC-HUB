import express from 'express';
import cors from 'cors';
import path from 'path';
import { getRootDir, loadAppConfig } from './config.js';
import { businessesRouter } from './routes/businesses.js';
import { configRouter } from './routes/config.js';
import { themesRouter } from './routes/themes.js';

export function createApp() {
  const app = express();
  const rootDir = getRootDir();

  app.use(cors());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.use('/api/businesses', businessesRouter);
  app.use('/api/config', configRouter);
  app.use('/api/themes', themesRouter);

  // Serve static admin UI at /a/ and root redirect
  app.use('/a', express.static(path.join(rootDir, 'a')));
  app.get('/', (req, res) => {
    res.redirect('/a/');
  });

  // Serve businesses directly for local preview at /b/
  app.use('/b', express.static(path.join(rootDir, 'b')));

  // Serve themes at /t/
  app.use('/t', express.static(path.join(rootDir, 't')));

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  });

  return app;
}

export function startServer() {
  const config = loadAppConfig();
  const app = createApp();
  const { port, host } = config.server || { port: 3000, host: '127.0.0.1' };

  return app.listen(port, host, () => {
    console.log(`\n======================================================`);
    console.log(`  NFC-HUB Management Platform (Local Manager API)`);
    console.log(`  Admin Dashboard : http://${host}:${port}/a/`);
    console.log(`  Business Preview: http://${host}:${port}/b/<id>/`);
    console.log(`  Bound to        : ${host}:${port} (Private Localhost)`);
    console.log(`======================================================\n`);
  });
}

// Start immediately if executed directly
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}
