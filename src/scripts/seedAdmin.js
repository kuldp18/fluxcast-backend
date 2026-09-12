import bcrypt from 'bcryptjs';
import { connectDb, mongoose } from '../config/db.js';
import { MONGO_URI } from '../config/env.js';
import { User } from '../models/User.js';

function readArg(name) {
  const key = `--${name}`;
  const idx = process.argv.indexOf(key);
  if (idx !== -1) return process.argv[idx + 1];

  const prefix = `${key}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);

  return undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function printHelp() {
  // eslint-disable-next-line no-console
  console.log(`Usage:
  npm run seed:admin -- --email <email> --password <password> [--name <name>] [--role <role>] [--upsert]

Options:
  --email        Admin email (or env SEED_ADMIN_EMAIL)
  --password     Admin password (or env SEED_ADMIN_PASSWORD)
  --name         Display name (or env SEED_ADMIN_NAME)
  --role         One of: grid_operator, utility_admin, plant_owner, admin (default: admin)
  --upsert       If user exists, update password/name/role
  --help, -h     Show this help
`);
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  const email = readArg('email') || process.env.SEED_ADMIN_EMAIL;
  const password = readArg('password') || process.env.SEED_ADMIN_PASSWORD;
  const name = readArg('name') || process.env.SEED_ADMIN_NAME || 'Admin';
  const role = readArg('role') || process.env.SEED_ADMIN_ROLE || 'admin';
  const upsert = hasFlag('upsert');

  const allowedRoles = ['grid_operator', 'utility_admin', 'plant_owner', 'admin'];
  if (!allowedRoles.includes(role)) {
    throw new Error(`Invalid --role. Expected one of: ${allowedRoles.join(', ')}`);
  }

  if (!email || !password) {
    printHelp();
    throw new Error('Missing --email/--password (or SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD env vars)');
  }

  await connectDb({ mongoUri: MONGO_URI });
  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const passwordHash = await bcrypt.hash(String(password), 10);

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing && !upsert) {
      // eslint-disable-next-line no-console
      console.log(`User already exists: ${existing.email} (pass --upsert to update)`);
      return;
    }

    if (existing && upsert) {
      existing.name = name;
      existing.role = role;
      existing.passwordHash = passwordHash;
      await existing.save();
      // eslint-disable-next-line no-console
      console.log(`Updated user: ${existing.email} (${existing.role})`);
      return;
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash,
      role,
    });

    // eslint-disable-next-line no-console
    console.log(`Created user: ${user.email} (${user.role})`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || String(err));
  process.exit(1);
});
