import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // Forward Socket.IO (incl. websocket upgrade) to the Express server.
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
});
