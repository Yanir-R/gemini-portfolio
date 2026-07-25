import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fallbacks used when no .env file supplies VITE_BACKEND_URL for the mode.
const DEFAULT_BACKEND_URL = {
    production: 'https://backend-240663900746.me-west1.run.app',
    development: 'http://localhost:8000',
} as const;

export default defineConfig(({ mode }) => {
    // Respect .env / .env.[mode] files, falling back to the defaults above so a
    // production build still points at Cloud Run without a committed .env.production.
    const env = loadEnv(mode, __dirname, 'VITE_');
    const backendUrl =
        env.VITE_BACKEND_URL ||
        (mode === 'production' ? DEFAULT_BACKEND_URL.production : DEFAULT_BACKEND_URL.development);

    return {
        plugins: [react()],
        server: {
            port: 3000,
            host: true,
        },
        build: {
            target: 'esnext',
            sourcemap: false,
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        // PostCSS plugins come from postcss.config.js.
        optimizeDeps: {
            include: ['react', 'react-dom', 'axios'],
        },
        envPrefix: 'VITE_',
        define: {
            'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendUrl),
        },
    };
});
