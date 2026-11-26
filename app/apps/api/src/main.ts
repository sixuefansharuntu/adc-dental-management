import { resolve } from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: resolve(__dirname, '../../../.env'), quiet: true });
async function main() {
  // Import after environment setup, so no pool is constructed against implicit defaults.
  const { createApp } = await import('./app');
  const app = await createApp();
  await app.listen(Number(process.env.API_PORT || 3100), process.env.API_HOST || '127.0.0.1');
  console.log(`ADC API ready at http://${process.env.API_HOST || '127.0.0.1'}:${process.env.API_PORT || 3100}/api/health`);
}
main().catch(error => { console.error('API startup failed:', error.message); process.exitCode=1; });
