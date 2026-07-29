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

// Routes the router serves from the bundle. Detail pages (/projects/:slug,
// /blog/:slug) are deliberately absent: their slugs come from the backend at
// runtime, so nothing at build time knows them. Fetching the API here would
// make every deploy depend on the backend being up, and a sitemap silently
// truncated by a failed request is worse than one that never claimed to be
// complete. Listing the index pages lets a crawler reach the detail pages by
// following links instead.
const STATIC_ROUTES = ['/', '/about', '/projects', '/blog'] as const;

// Crawlers named individually in robots.txt. A blanket `User-agent: *` already
// permits them, but two treat an explicit entry as the deciding signal:
// Google-Extended governs whether Gemini and AI Overviews may use the page (it
// is opt-out via robots and does not affect Search ranking either way), and
// GPTBot governs ChatGPT's. The point of this site is that a person - or
// something answering on their behalf - can find out what Yanir works on, so
// blocking the crawlers that field that question would defeat it.
const ASSISTANT_CRAWLERS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'anthropic-ai',
    'Claude-Web',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'Bingbot',
] as const;

/**
 * robots.txt, sitemap.xml and llms.txt, emitted rather than committed.
 *
 * All three have to state absolute URLs - the sitemap protocol requires them,
 * and a robots `Sitemap:` line is ignored without one - so none can be a static
 * file in public/ without hardcoding a host, which is the thing this config
 * exists to prevent. They are generated from the same resolved site URL that
 * fills in the canonical and OpenGraph tags, so there is one host to change.
 *
 * robots.txt additionally has to exist as a real file because `_redirects` maps
 * `/*` to index.html: without it, /robots.txt answers with the SPA shell. Most
 * crawlers read an unparseable robots.txt as "allow everything", but LinkedIn
 * and Facebook fetch it before reading the link-preview tags.
 */
const emitDiscoveryFiles = (siteUrl: string) => ({
    name: 'emit-discovery-files',
    generateBundle() {
        const robots = [
            '# Everything here is public by design, so nothing is disallowed.',
            '',
            'User-agent: *',
            'Allow: /',
            '',
            ...ASSISTANT_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']),
            `Sitemap: ${siteUrl}/sitemap.xml`,
            '',
        ].join('\n');

        const sitemap = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ...STATIC_ROUTES.map(
                (route) =>
                    `    <url><loc>${siteUrl}${route}</loc>` +
                    `<priority>${route === '/' ? '1.0' : '0.8'}</priority></url>`
            ),
            '</urlset>',
            '',
        ].join('\n');

        // llms.txt is a convention, not a standard: a plain-prose summary at a
        // predictable path for an assistant that has fetched the site and found
        // an empty <div id="root">. It says what the rendered pages say, which
        // is the only thing that makes it worth serving - a summary that drifts
        // from the site is a liability, so it is deliberately short enough to
        // keep true.
        const llms = [
            '# Yanir Rot - Full-Stack AI Engineer',
            '',
            '> Portfolio and AI assistant. The assistant answers questions about Yanir Rot',
            "> from his own notes and project write-ups, and says so when they don't cover",
            '> the question rather than guessing.',
            '',
            '## About',
            '',
            'Yanir Rot works on the half of AI engineering that starts after the demo works.',
            'Since 2025 he has been building a multi-agent system that investigates production',
            'incidents: agents reading Kubernetes, AWS and observability telemetry, then writing',
            'up what actually broke. He owns whether the pipeline is right - where a citation',
            'comes from, why a model would fake one, and what a single question costs. From 2018',
            'to 2025 he did frontend and full-stack work, including a sports betting platform at',
            '500K daily users and finance applications for Israeli enterprises.',
            '',
            'Works across React, TypeScript, Python, FastAPI, Kubernetes and AWS.',
            '',
            '## Pages',
            '',
            ...STATIC_ROUTES.map(
                (route) =>
                    `- [${
                        {
                            '/': 'Home',
                            '/about': 'About',
                            '/projects': 'Projects',
                            '/blog': 'Writing',
                        }[route]
                    }](${siteUrl}${route})`
            ),
            '',
            '## Elsewhere',
            '',
            '- [GitHub](https://github.com/Yanir-R)',
            '- [LinkedIn](https://www.linkedin.com/in/yanirrot/)',
            '- Email: rotyanir@gmail.com',
            '',
        ].join('\n');

        for (const [fileName, source] of [
            ['robots.txt', robots],
            ['sitemap.xml', sitemap],
            ['llms.txt', llms],
        ] as const) {
            this.emitFile({ type: 'asset', fileName, source });
        }
    },
});

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
            emitDiscoveryFiles(resolvedSiteUrl),
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
