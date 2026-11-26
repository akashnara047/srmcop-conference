import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import healthHandler from './api/email/health.ts';
import sendHandler from './api/email/send.ts';
import allocationHandler from './api/email/allocation.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const isProduction = process.env.NODE_ENV === 'production';

  // Parse JSON strictly on API routes (supports 4 MB PDF payloads safely)
  app.use('/api', express.json({ limit: '6mb' }));

  app.all('/api/email/health', async (req, res) => {
    try {
      await healthHandler(req, res);
    } catch (err) {
      console.error('[server] Unhandled /api/email/health error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal email health service error.',
        });
      }
    }
  });

  app.all('/api/email/send', async (req, res) => {
    try {
      await sendHandler(req, res);
    } catch (err) {
      console.error('[server] Unhandled /api/email/send error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal email dispatch service error.',
        });
      }
    }
  });

  app.all('/api/email/allocation', async (req, res) => {
    try {
      await allocationHandler(req, res);
    } catch (err) {
      console.error('[server] Unhandled /api/email/allocation error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal allocation email dispatch service error.',
        });
      }
    }
  });

  // Never fall through unknown /api/* routes to SPA index.html
  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found.',
    });
  });

  // Serve static downloadable presentation templates with explicit MIME types and
  // Content-Disposition headers before Vite/SPA middlewares (prevents empty MIME types
  // or HTML SPA fallback responses for missing files).
  app.get('/downloads/:filename', (req, res) => {
    const safeName = path.basename(String(req.params.filename || ''));
    if (!safeName || safeName !== req.params.filename) {
      res.status(400).send('Invalid filename.');
      return;
    }

    const candidates = isProduction
      ? [
          path.resolve(__dirname, 'dist', 'downloads', safeName),
          path.resolve(__dirname, 'public', 'downloads', safeName),
        ]
      : [path.resolve(__dirname, 'public', 'downloads', safeName)];

    const targetPath = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (!targetPath) {
      res.status(404).send('Template file not found.');
      return;
    }

    const ext = path.extname(safeName).toLowerCase();
    if (ext === '.pptx') {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
    } else if (ext === '.ppt') {
      res.setHeader('Content-Type', 'application/vnd.ms-powerpoint');
    }
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.sendFile(targetPath);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SRMCON 2027 server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SRMCON 2027 server:', err);
  process.exit(1);
});
