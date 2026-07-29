/**
 * The API's front door.
 *
 * The backend is Cloud Run, and a Cloud Run service that a browser can call is
 * a service anybody can call: its run.app URL is public, and CORS does not
 * change that - CORS is enforced by browsers, on browsers, so curl and a
 * for-loop ignore it entirely. What that costs is not stolen data, since
 * everything the API returns is already public. It is Gemini quota per chat
 * request, and a 40/minute global rate limit that is shared with real
 * visitors, so anyone who wants to can leave the site answering 429s.
 *
 * This Worker is what closes that. It sits on api.yanirrot.com, so every
 * request reaching the backend has already passed Cloudflare's DDoS
 * protection, bot handling and rate limiting, and it adds a shared secret the
 * backend checks. The run.app URL stays technically reachable - Cloud Run
 * offers no way to hide it short of a load balancer that costs more per month
 * than this site does per year - but without the secret it answers 403.
 *
 * The secret's strength is the whole mechanism. Any client can send any header
 * it likes, so the header name protects nothing; only the fact that the value
 * cannot be guessed does. It is a Worker secret, never committed.
 */

export default {
    async fetch(request, env) {
        if (!env.ORIGIN_URL || !env.EDGE_SECRET) {
            // Failing loudly beats forwarding unauthenticated: a missing
            // secret would otherwise silently become an open proxy to the
            // origin, which is the exact thing this Worker exists to prevent.
            return new Response('Edge proxy is not configured', { status: 500 });
        }

        const incoming = new URL(request.url);
        const target = new URL(env.ORIGIN_URL);
        // Path and query pass through untouched; only the host changes. Cloud
        // Run routes on Host for its run.app domain, and constructing the URL
        // from the origin is what sets it correctly.
        target.pathname = incoming.pathname;
        target.search = incoming.search;

        const headers = new Headers(request.headers);
        // Drop any value the client sent under this name before setting ours.
        // set() would overwrite anyway; deleting first states the intent - a
        // caller must never be able to influence what the origin reads here.
        headers.delete('x-edge-auth');
        headers.set('X-Edge-Auth', env.EDGE_SECRET);

        const response = await fetch(
            new Request(target, {
                method: request.method,
                headers,
                body: request.body,
                redirect: 'manual',
            })
        );

        // Returned as-is. The backend already emits the CORS headers the
        // browser needs, including the exposed Retry-After the frontend reads
        // to tell a visitor how long a rate limit lasts; rewriting any of that
        // here would only create a second place for it to drift.
        return response;
    },
};
