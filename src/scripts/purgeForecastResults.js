import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { MONGO_URI } from '../config/env.js';
import { ForecastResult } from '../models/ForecastResult.js';

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
  node src/scripts/purgeForecastResults.js [--plantId <id>] [--yes]

Examples:
  node src/scripts/purgeForecastResults.js --plantId 64f... --yes
  node src/scripts/purgeForecastResults.js --yes

Notes:
  This deletes ForecastResult documents from MongoDB.
  Use --plantId to scope deletion.
`);
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    return;
  }

  const plantId = readArg('plantId');
  const yes = hasFlag('yes');
  if (!yes) {
    printHelp();
    throw new Error('Refusing to delete without --yes');
  }

  await connectDb({ mongoUri: MONGO_URI });
  try {
    const filter = plantId ? { plantId: new mongoose.Types.ObjectId(plantId) } : {};
    const res = await ForecastResult.deleteMany(filter);
    // eslint-disable-next-line no-console
    console.log(`Deleted ForecastResult: ${res.deletedCount}`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || String(err));
  process.exit(1);
});
