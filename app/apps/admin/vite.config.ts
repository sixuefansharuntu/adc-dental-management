import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({
  plugins: [vue()],
  optimizeDeps: { include: ['@lucide/vue'] },
  server: { port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:3100' },
    fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/.runtime/**'] } },
  build: { sourcemap: true }
});
