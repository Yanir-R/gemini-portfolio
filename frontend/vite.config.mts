import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Fallbacks for when no .env file or process env supplies the value.
//
// The production entries are intentionally empty rather than a pinned host: CI
// injects VITE_BACKEND_URL and VITE_SITE_URL, and a hardcoded default here was
// previously the only reason production worked at all, which masked the fact
// that the injected values were being dropped. An empty default makes a missing
// variable fail visibly instead of silently shipping a stale host.
const DEFAULT_BACKEND_URL = {
    production: '',
    development: 'http://localhost:8000',
} as const;

// Public origin for canonical/OpenGraph URLs. Never hardcode a domain here -
// social cards must not point at a host this project does not control.
const DEFAULT_SITE_URL = {
    production: '',
    development: 'http://localhost:3000',
} as const;

export default defineConfig(({ mode, command }) => {
    // loadEnv reads .env files and also picks up prefixed process env vars,
    // which is how CI injects these.
    const env = loadEnv(mode, __dirname, 'VITE_');
    const isProd = mode === 'production';
    const backendUrl =
        env.VITE_BACKEND_URL ||
        (isProd ? DEFAULT_BACKEND_URL.production : DEFAULT_BACKEND_URL.development);
    const siteUrl = (
        env.VITE_SITE_URL || (isProd ? DEFAULT_SITE_URL.production : DEFAULT_SITE_URL.development)
    ).replace(/\/$/, '');

    // Fail the build rather than emit a bundle wired to nothing. `verify` builds
    // without secrets, so this is scoped to real builds only via `command`.
    if (command === 'build' && isProd) {
        const missing = [!backendUrl && 'VITE_BACKEND_URL', !siteUrl && 'VITE_SITE_URL'].filter(
            Boolean
        );
        if (missing.length && process.env.VITE_ALLOW_UNCONFIGURED_BUILD !== 'true') {
            throw new Error(
                `Production build is missing ${missing.join(' and ')}. ` +
                    'Set them in the environment, or set VITE_ALLOW_UNCONFIGURED_BUILD=true ' +
                    'for a config-less build such as CI verification.'
            );
        }
    }

    // An empty siteUrl would render the canonical tag as href="/", which Vite
    // resolves as an asset and fails on with EISDIR. Substitute the localhost
    // values so a deliberately unconfigured build still produces valid output;
    // the guard above is what stops those placeholders reaching a deployment.
    const resolvedBackendUrl = backendUrl || DEFAULT_BACKEND_URL.development;
    const resolvedSiteUrl = siteUrl || DEFAULT_SITE_URL.development;

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
                    handler: (html: string) => html.replaceAll('%VITE_SITE_URL%', resolvedSiteUrl),
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
            'import.meta.env.VITE_BACKEND_URL': JSON.stringify(resolvedBackendUrl),
        },
    };
});
