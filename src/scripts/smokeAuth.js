import { connectDb, mongoose } from '../config/db.js';
import { MONGO_URI } from '../config/env.js';
import { createApp } from '../app.js';

async function main() {
  await connectDb({ mongoUri: MONGO_URI });

  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/v1`;

  try {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'fluxcast-test@example.com', password: 'testpass123' }),
    });
    const loginJson = await login.json().catch(() => null);
    // eslint-disable-next-line no-console
    console.log('login', login.status, !!loginJson?.token);

    const token = loginJson?.token;
    const plants = await fetch(`${base}/plants`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const plantsText = await plants.text();
    // eslint-disable-next-line no-console
    console.log('plants', plants.status, plantsText.slice(0, 200));
  } finally {
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
