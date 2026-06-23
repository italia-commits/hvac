import { app } from './app';
import { env, testConnection } from './config';

// Daily scheduler for agreement expiration workflows
const SCHEDULER_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function startScheduler(): Promise<void> {
  const { runExpirationCheck, processExpiredAgreements } = await import('./services/scheduler');
  
  // Run initial check on startup
  try {
    console.log('[SCHEDULER] Running initial expiration check...');
    const result = await runExpirationCheck();
    const expiredCount = await processExpiredAgreements();
    console.log(`[SCHEDULER] Initial check: ${result.total_processed} actions, ${expiredCount} expired/renewed`);
  } catch (error) {
    console.error('[SCHEDULER] Initial check failed:', (error as Error).message);
  }

  // Schedule daily checks
  setInterval(async () => {
    try {
      console.log('[SCHEDULER] Running scheduled expiration check...');
      const result = await runExpirationCheck();
      const expiredCount = await processExpiredAgreements();
      console.log(`[SCHEDULER] Check complete: ${result.total_processed} actions, ${expiredCount} expired/renewed`);
    } catch (error) {
      console.error('[SCHEDULER] Scheduled check failed:', (error as Error).message);
    }
  }, SCHEDULER_INTERVAL_MS);

  console.log(`[SCHEDULER] Daily expiration check scheduled (every ${SCHEDULER_INTERVAL_MS / 3600000}h)`);
}

async function start(): Promise<void> {
  // Test database connection
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.warn('WARNING: Database connection failed. Server will start but DB operations will fail.');
  }

  // Start the agreement expiration scheduler
  if (dbConnected) {
    startScheduler().catch(err => console.error('[SCHEDULER] Failed to start:', err.message));
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
