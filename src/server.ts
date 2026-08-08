import { createServer } from 'http';
import { app } from './app';
import { initializeDatabase } from './config/db';
import { env } from './config/env';
import { seedDatabase } from './seed';
import { createSocketServer } from './sockets';

async function startServer() {
  await initializeDatabase();
  await seedDatabase();

  const httpServer = createServer(app);
  createSocketServer(httpServer);

  httpServer.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Minimi Agri backend listening on :${env.port} (${env.nodeEnv})`);
  });
}

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error);
  process.exit(1);
});
