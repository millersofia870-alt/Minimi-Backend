"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDatabase = seedDatabase;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = require("../src/config/db");
const admins = __importStar(require("../src/db/admins.repo"));
const farmers = __importStar(require("../src/db/farmers.repo"));
const vets = __importStar(require("../src/db/vets.repo"));
async function seedDatabase() {
    await (0, db_1.initializeDatabase)();
    const adminUsername = process.env.ADMIN_SEED_USERNAME ?? 'admin';
    const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'change-me-now';
    const existingAdmin = await admins.findByUsername(adminUsername);
    if (!existingAdmin) {
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, 10);
        await admins.create(adminUsername, passwordHash);
        console.log(`Seeded admin account: ${adminUsername}`);
    }
    else {
        console.log(`Admin account "${adminUsername}" already exists, skipping.`);
    }
    // A couple of demo accounts so you can exercise the API immediately.
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
        if (db_1.pool) {
            await db_1.pool.end();
        }
    });
}
