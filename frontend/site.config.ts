/**
 * The public build configuration, committed on purpose.
 *
 * These three values used to live in GitHub secrets and variables, which is
 * where they started rather than where they belonged - none of them is a
 * secret. The site URL is printed in every OpenGraph tag, the backend URL is
 * inlined into the shipped bundle and named in the CSP, and the avatar URL is
 * fetched by every visitor's browser. Anyone can read all three from the
 * deployed site in a few seconds.
 *
 * Keeping them out of the repository bought nothing and cost something real.
 * Vite inlines these at build time, so changing a GitHub variable does nothing
 * until the next build - and a variable changed *after* a deploy silently does
 * nothing at all. That is not hypothetical: it happened here. The frontend was
 * deployed at 09:15 and the backend URL was changed at 09:19, so the bundle
 * kept pointing at the old host, the site went on working, and the only way to
 * find out was to grep minified JavaScript.
 *
 * Committed, the failure cannot happen. Changing a value is a commit, a commit
 * is a deploy, and the value that shipped is the value in the file. It is also
 * reviewable in a pull request, which a repository variable never was.
 *
 * Forking this: change the values below. An environment variable of the same
 * name still overrides each one, which is what local development and preview
 * builds use; CI deliberately passes none of them, so what is written here is
 * what production gets.
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
