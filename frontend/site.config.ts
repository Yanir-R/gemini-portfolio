/**
 * The public build configuration, committed on purpose.
 *
 * None of these three values is a secret. The site URL is printed in every
 * OpenGraph tag, the backend URL is inlined into the shipped bundle and named
 * in the CSP, and the avatar URL is fetched by every visitor's browser - all
 * three are readable from the deployed site in a few seconds.
 *
 * They live in the repository rather than in GitHub variables because Vite
 * inlines them at build time. A value held outside the repository takes effect
 * only on the next build, so changing one after a deploy does nothing at all
 * and the bundle keeps pointing at the previous host while the site goes on
 * working. Committed, changing a value is a commit, a commit is a deploy, and
 * what shipped is what the file says. It is also reviewable in a pull request.
 *
 * Forking this: change the values below. An environment variable of the same
 * name overrides each one, which is what local development and preview builds
 * use; CI passes none of them, so what is written here is what production gets.
 *
 * What must NOT move here: anything that is actually a credential. API keys and
 * passwords stay in Secret Manager and GitHub secrets. The test is simple - if
 * a visitor's browser can already see it, it is not a secret and hiding it only
 * hides it from you.
 */
export const siteConfig = {
    /** Public origin. Fills canonical, OpenGraph, sitemap and llms.txt URLs. */
    url: 'https://yanirrot.com',

    /**
     * The API's front door - the Cloudflare Worker in edge/, not the Cloud Run
     * URL behind it. Also becomes the CSP's connect-src, so the two cannot
     * disagree.
     */
    backendUrl: 'https://api.yanirrot.com',

    /**
     * Yanir's photograph, hosted externally.
     *
     * Empty is a supported state: the repository is public and its history
     * permanent, so the image is deliberately not committed. When this is empty
     * a production build renders the initial-letter mark and requests no image
     * at all - which is also what a fresh clone renders.
     *
     * This is ImgBB's 180x180 rendition, not the 640x640 original. The avatar
     * is displayed at 32 CSS pixels, so 180 still covers a 3x display while
     * being an eighth of the bytes - 17KB against 139KB, downloaded once per
     * visitor for a thumbnail the size of a fingernail.
     *
     * Do not point this at /profile.jpeg. That file is gitignored, so it is
     * absent from any CI build, and `_redirects` maps /* to index.html - the
     * request would return 200 with a page of HTML rather than a 404, and the
     * browser would loop trying to decode it as an image.
     */
    avatarUrl: 'https://i.ibb.co/XxxRNkSN/profile.jpg',
} as const;
