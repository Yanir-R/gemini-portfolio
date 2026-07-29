# edge — the API's front door

A Cloudflare Worker that sits in front of the Cloud Run backend on
`api.<your-domain>`, so the API is reached through Cloudflare rather than by
calling its `run.app` URL directly.

## Why it exists

A Cloud Run service a browser can call is a service anyone can call. CORS does
not change that: CORS is enforced by browsers, on browsers, so `curl` and a
for-loop ignore it completely.

The exposure is not stolen data — everything this API returns is already
public. It is **cost and availability**: the chat endpoint spends model quota
per call, and the backend's global rate limit is a budget shared with real
visitors. Anyone who wants to can exhaust it and leave the site answering 429s.

The Worker adds a shared secret to every request it forwards, and the backend
refuses requests that do not carry it. The `run.app` URL stays technically
reachable — Cloud Run offers no way to hide it short of a load balancer costing
more per month than a portfolio costs per year — but without the secret it
answers 403.

**The secret's unguessability is the entire mechanism.** Any client can send
any header, so the header *name* protects nothing. Use a long random value.

## Forking this

Three things are specific to one deployment. Change all three:

| Where | What | Notes |
| --- | --- | --- |
| `wrangler.jsonc` → `name` | Worker name | Any name unique to your account |
| `wrangler.jsonc` → `routes[0].pattern` | `api.<your-domain>` | The zone must already be on Cloudflare |
| `wrangler.jsonc` → `vars.ORIGIN_URL` | Your backend's URL | Not a secret; it is already inlined into the built frontend bundle |

Nothing secret is committed here, and nothing should be. `EDGE_SECRET` is set
with `wrangler secret put` and lives only in Cloudflare.

## Deploying

```sh
npx wrangler login          # interactive; needs a real terminal
npx wrangler secret put EDGE_SECRET
npx wrangler deploy
```

`custom_domain: true` makes Cloudflare create and manage the DNS record for the
hostname, so the route and the record cannot drift apart the way they would if
the record were added by hand.

## Rolling it out without downtime

The backend treats an **unset** `ORIGIN_SHARED_SECRET` as "do not enforce".
That is deliberate, and it is what makes the order below safe — no step can
strand the site against an API that has already started rejecting it.

1. Deploy the Worker. Both paths work; the backend is not enforcing yet.
2. Point the frontend's backend URL at `https://api.<your-domain>` and deploy.
   The site now goes through the Worker; the backend still accepts everything.
3. Give the backend the same secret and deploy. Enforcement begins, and direct
   `run.app` calls start returning 403.

Rotating the secret runs the same way: add the new value to both sides before
removing the old one from either.

## The same secret in two places

The value must be byte-identical in the Worker (`wrangler secret put
EDGE_SECRET`) and in the backend's environment. The backend strips surrounding
whitespace before comparing, which forgives a trailing newline from a file, and
compares with a constant-time function so the check cannot be probed a byte at
a time.
