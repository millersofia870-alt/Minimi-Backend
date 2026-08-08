import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase, pool } from './config/db';
import * as admins from './db/admins.repo';
import * as farmers from './db/farmers.repo';
import * as vets from './db/vets.repo';

export async function seedDatabase() {
  await initializeDatabase();

  const adminUsername = process.env.ADMIN_SEED_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'change-me-now';

  const existingAdmin = await admins.findByUsername(adminUsername);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await admins.create(adminUsername, passwordHash);
    console.log(`Seeded admin account: ${adminUsername}`);
  } else {
    console.log(`Admin account "${adminUsername}" already exists, skipping.`);
  }

  let demoVet = await vets.findByIdNumberOrPhone('30000001', '254700000001');
  if (!demoVet) {
    demoVet = await vets.create({
      fullName: 'Dr. Achieng',
      idNumber: '30000001',
      phone: '254700000001',
      county: 'Kiambu',
      subCounty: 'Ruiru',
    });
    demoVet = await vets.setStatus(demoVet.id, 'approved');
  }

  let demoFarmer = await farmers.findByIdNumberOrPhone('30000002', '254700000002');
  if (!demoFarmer) {
    demoFarmer = await farmers.create({
      fullName: 'James Mutua',
      idNumber: '30000002',
      phone: '254700000002',
      county: 'Kiambu',
      subCounty: 'Ruiru',
    });
  }

  console.log('Seeded demo vet:', demoVet.phone, '/ ID', demoVet.idNumber, '/ status', demoVet.status);
  console.log('Seeded demo farmer:', demoFarmer.phone, '/ ID', demoFarmer.idNumber);
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      if (pool) {
        await pool.end();
      }
    });
}
