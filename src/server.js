import { createApp } from "./app.js";
import { connectDb } from "./config/db.js";
import { MONGO_URI, PORT } from "./config/env.js";

async function main() {
  await connectDb({ mongoUri: MONGO_URI });
  const app = createApp();

  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Fluxcast backend listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
