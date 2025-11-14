/**
 * Custom Next.js Server with Socket.IO
 * Required for Socket.IO integration
 *
 * Run with: ts-node server.ts
 * Or add to package.json: "dev": "ts-node server.ts"
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { initializeSocketServer } from './src/services/socket/socket-server';
import { startBlockchainSync } from './src/services/blockchain-sync/sync-manager';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Initialize Socket.IO
  initializeSocketServer(httpServer);

  // Start blockchain sync automatically (runs in the same process as Socket.IO)
  setTimeout(() => {
    startBlockchainSync()
      .then(() => console.log('✅ Blockchain sync started'))
      .catch((error) => console.error('❌ Failed to start blockchain sync:', error));
  }, 2000); // Wait 2 seconds for Socket.IO to fully initialize

  // Start server
  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
    });
  });
});
