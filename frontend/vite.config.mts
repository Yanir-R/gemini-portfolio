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

// Public origin used for canonical/OpenGraph URLs. Defaults to the Cloud Run
// frontend rather than a custom domain: social cards must not point at a host
// this project does not control. Override with VITE_SITE_URL once the real
// domain is confirmed.
const DEFAULT_SITE_URL = {
    production: 'https://frontend-240663900746.me-west1.run.app',
    development: 'http://localhost:3000',
} as const;

export default defineConfig(({ mode }) => {
    // Respect .env / .env.[mode] files, falling back to the defaults above so a
    // production build still points at Cloud Run without a committed .env.production.
    const env = loadEnv(mode, __dirname, 'VITE_');
    const isProd = mode === 'production';
    const backendUrl =
        env.VITE_BACKEND_URL ||
        (isProd ? DEFAULT_BACKEND_URL.production : DEFAULT_BACKEND_URL.development);
    const siteUrl = (
        env.VITE_SITE_URL || (isProd ? DEFAULT_SITE_URL.production : DEFAULT_SITE_URL.development)
    ).replace(/\/$/, '');

    return {
        plugins: [
            react(),
            {
                // Substitutes %VITE_SITE_URL% in index.html. Done here rather than
                // relying on Vite's built-in HTML env replacement so an unset
                // variable resolves to the default above instead of leaving the
                // literal placeholder in the shipped markup.
                name: 'inject-site-url',
                transformIndexHtml: {
                    order: 'pre' as const,
                    handler: (html: string) => html.replaceAll('%VITE_SITE_URL%', siteUrl),
                },
            },
        ],
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
