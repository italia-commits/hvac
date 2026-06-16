import { app } from './app';
import { env, testConnection } from './config';

async function start(): Promise<void> {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('WARNING: Database connection failed. Server will start but DB operations will fail.');
  }

  // Start server
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║              HVAC RenewIQ API Server                  ║
╠════════════════════════════════════════════════════════╣
║  Status:  Running                                      ║
║  Port:    ${String(env.port).padEnd(45)}║
║  Env:     ${env.nodeEnv.padEnd(45)}║
║  DB:      ${(dbConnected ? 'Connected' : 'DISCONNECTED').padEnd(45)}║
╚════════════════════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // Force shutdown after 10s
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
