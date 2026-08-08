import { seedDatabase } from '../src/seed';

seedDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
