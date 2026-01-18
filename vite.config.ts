import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://<USER>.github.io/<REPO>/
// Vite recommends base: '/<REPO>/' for this deployment target.
export default defineConfig({
  plugins: [react()],
  base: '/CCApp/',
});
