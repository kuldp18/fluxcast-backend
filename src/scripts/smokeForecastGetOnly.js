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
    if (!login.ok || !loginJson?.token) {
      throw new Error(`Login failed: ${login.status} ${JSON.stringify(loginJson)}`);
    }
    const token = loginJson.token;

    const plantResp = await fetch(`${base}/plants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `Forecast GET-only Plant ${Date.now()}`,
        type: 'solar',
        latitude: 23.241999,
        longitude: 69.666932,
        capacityMW: 50,
      }),
    });
    const plantJson = await plantResp.json().catch(() => null);
    if (!plantResp.ok || !plantJson?.id) {
      throw new Error(`Plant create failed: ${plantResp.status} ${JSON.stringify(plantJson)}`);
    }
    const plantId = plantJson.id;

    const get = await fetch(`${base}/plants/${plantId}/forecast?horizon=24`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // eslint-disable-next-line no-console
    console.log('get', get.status, await get.text());
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
