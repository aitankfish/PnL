/**
 * Next.js Instrumentation Hook
 * Initializes Socket.IO server when Next.js starts
 * Works with standard `next dev` command
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createServer } = await import('http');
    const { initializeSocketServer } = await import('./services/socket/socket-server');

    // Get Next.js server instance
    // Note: This is a simplified approach that works with Next.js App Router
    const httpServer = createServer();

    // Initialize Socket.IO
    initializeSocketServer(httpServer);

    // Start listening on Socket.IO port (separate from Next.js)
    const socketPort = parseInt(process.env.SOCKET_PORT || '3001', 10);
    httpServer.listen(socketPort, () => {
      console.log(`✅ Socket.IO server running on port ${socketPort}`);
    });
  }
}
