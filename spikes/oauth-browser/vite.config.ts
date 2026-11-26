import { defineConfig } from 'vite';

// Loopback OAuth clients must be served from 127.0.0.1 (not "localhost"), and
// the redirect URI baked into the client_id must match this exact origin.
export const SPIKE_HOST = '127.0.0.1';
export const SPIKE_PORT = 5180;

export default defineConfig({
  server: {
    host: SPIKE_HOST,
    port: SPIKE_PORT,
    strictPort: true,
    open: false,
  },
});
