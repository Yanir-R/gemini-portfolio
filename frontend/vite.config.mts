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

// The AI crawlers split in two, because being read and being trained on are
// different things and this site wants one without the other.
//
// ANSWER_TIME_CRAWLERS fetch a page in order to answer a question somebody is
// asking right now, and cite it back. They are the entire reason the JSON-LD
// and llms.txt exist: when a person asks an assistant who Yanir is, these are
// what go and look.
//
// TRAINING_CRAWLERS collect pages into corpora that models are trained on.
// Nothing about that helps a reader find him, and ingestion is irreversible.
//
// These lists are not a preference stated in a vacuum - they mirror what
// Cloudflare actually enforces on the zone, where the AI Crawler category is
// blocked at the network layer and the AI Search and AI Assistant categories
// are not. A robots.txt that disagreed with that enforcement would be
// published policy the site does not honour, which is worse than either
// choice made honestly.
//
// Two entries are directives rather than fetchers: Google-Extended and
// Applebot-Extended have no crawler of their own, they only govern whether
// Gemini and Apple Intelligence may use the content. They sit on the training
// side for consistency. That has a real cost - Google-Extended also gates
// Gemini's grounding, so declining it means Gemini is less likely to cite the
// site - and it is the one line here worth revisiting if being found through
// Gemini specifically matters more than staying out of its training set.
const ANSWER_TIME_CRAWLERS = [
    'OAI-SearchBot',
    'ChatGPT-User',
    'Claude-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
    'DuckAssistBot',
    'MistralAI-User',
    'Applebot',
    'Googlebot',
    'Bingbot',
] as const;

const TRAINING_CRAWLERS = [
    'GPTBot',
    'ClaudeBot',
    'Claude-User',
    'anthropic-ai',
    'Claude-Web',
    'CCBot',
    'Bytespider',
    'Amazonbot',
    'Meta-ExternalAgent',
    'Google-CloudVertexBot',
    'Google-Extended',
    'Applebot-Extended',
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
/**
 * The response headers Cloudflare Pages applies to every route, built here for
 * the same reason as the files above: the Content-Security-Policy has to name
 * the backend's origin in `connect-src`, and that origin is injected at build
 * time. A committed static `_headers` could only hardcode it, and a CSP that
 * disagrees with the deployed backend URL breaks every request the chat makes.
 *
 * Notes on the specific choices, since a CSP is easy to copy and hard to read:
 *
 *   script-src          'self' plus static.cloudflareinsights.com, with
 *                       cloudflareinsights.com in connect-src to match.
 *                       Cloudflare injects its Web Analytics beacon into HTML
 *                       responses at the edge, so it is not in the built bundle
 *                       and nothing in this repository referenced it - which is
 *                       exactly why the first strict policy blocked it, and why
 *                       the error only appeared in a real browser. Analytics the
 *                       platform adds still has to be declared by the policy the
 *                       platform serves.
 *
 *                       Still no 'unsafe-inline'. The JSON-LD block in
 *                       index.html is a data block rather than executable
 *                       script - the HTML parser never prepares it for
 *                       execution, so CSP does not gate it and the structured
 *                       data survives the strict policy.
 *   style-src           'unsafe-inline' is required: three components set a
 *                       `style` attribute to pass a CSS custom property, and
 *                       style attributes are inline styles as far as CSP cares.
 *   img-src             'self' data: https:. Broader than the rest of this
 *                       policy, and deliberately. Project and writing images
 *                       are markdown Yanir writes, served from the backend at
 *                       runtime, and today they live on i.ibb.co. An allowlist
 *                       of image hosts would be tighter and would also break
 *                       silently every time he pasted an image from somewhere
 *                       new - the page would render with a hole in it and the
 *                       only symptom would be a console error in a visitor's
 *                       browser, not his. An image cannot execute, the site
 *                       holds no session to steal, and upgrade-insecure-requests
 *                       keeps this to https, so the cost of the wider directive
 *                       is a tracking pixel the author would have to add on
 *                       purpose.
 *   frame-ancestors     'none' stops the site being framed - clickjacking cover
 *                       that X-Frame-Options duplicates for older agents.
 *
 * No Cross-Origin-Resource-Policy: it would restrict who may load og-image.png,
 * and a link-preview card is precisely a cross-origin consumer of that file.
 *
 * HSTS carries includeSubDomains but deliberately not `preload`. Preloading is
 * baked into browser binaries and takes months to reverse, so it should be a
 * decision made once the domain's subdomain plans are settled, not a default
 * inherited from a config file.
 */
// Cloudflare's Web Analytics beacon. The script is injected into HTML at the
// edge rather than bundled, and it reports to a second host, so both have to be
// named or the browser blocks the script and then the request it makes.
const CF_ANALYTICS_SCRIPT = 'https://static.cloudflareinsights.com';
const CF_ANALYTICS_REPORTING = 'https://cloudflareinsights.com';

const emitSecurityHeaders = (backendUrl: string) => {
    const originOf = (u: string) => {
        try {
            return new URL(u).origin;
        } catch {
            return '';
        }
    };
    const connectSrc = ["'self'", originOf(backendUrl), CF_ANALYTICS_REPORTING]
        .filter(Boolean)
        .join(' ');

    const csp = [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "object-src 'none'",
        `script-src 'self' ${CF_ANALYTICS_SCRIPT}`,
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data: https:",
        `connect-src ${connectSrc}`,
        'upgrade-insecure-requests',
    ].join('; ');

    return [
        '/*',
        `  Content-Security-Policy: ${csp}`,
        '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
        '  X-Content-Type-Options: nosniff',
        '  X-Frame-Options: DENY',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '  Cross-Origin-Opener-Policy: same-origin',
        '  Permissions-Policy: accelerometer=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
        '',
    ].join('\n');
};

const emitDiscoveryFiles = (siteUrl: string, backendUrl: string) => ({
    name: 'emit-discovery-files',
    generateBundle() {
        const robots = [
            '# Every page here is public, and the crawlers that answer questions on a',
            "# reader's behalf are welcome. The ones that collect pages into training",
            '# corpora are not, and Cloudflare enforces that on the zone as well - this',
            '# file states the same policy rather than a more generous one.',
            '',
            'User-agent: *',
            'Allow: /',
            '',
            '# Fetch a page to answer a question someone is asking now.',
            ...ANSWER_TIME_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']),
            '# Collect pages for model training.',
            ...TRAINING_CRAWLERS.flatMap((ua) => [`User-agent: ${ua}`, 'Disallow: /', '']),
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
            '',
            'To make contact, use the assistant or the Email button on the site.',
            '',
        ].join('\n');

        for (const [fileName, source] of [
            ['robots.txt', robots],
            ['sitemap.xml', sitemap],
            ['llms.txt', llms],
            ['_headers', emitSecurityHeaders(backendUrl)],
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
            emitDiscoveryFiles(resolvedSiteUrl, resolvedBackendUrl),
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
