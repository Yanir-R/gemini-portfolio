/*
 * The assistant's opening line.
 *
 * It claims exactly what the corpus holds - a short profile plus the project
 * write-ups this site already publishes - because prompt.py redirects anything
 * outside that, and an opener promising more guarantees the first answer
 * disappoints. Naming the boundary up front also makes a decline legible as
 * intended behaviour rather than as the assistant being broken.
 *
 * Written in Yanir's first person, consistently, like every reply that follows
 * it. That the chat is a machine is disclosed by the panel's label, which a
 * visitor reads once, rather than by the grammar of every sentence it produces.
 */
export const CHAT_CONFIG = {
    INITIAL_MESSAGE:
        "Ask about the work, how it was built, or what went wrong. I answer from my notes and project write-ups, so if something isn't written down I'll say so rather than guess.",
} as const;

/*
 * The home page standfirst, and the single source of the same sentence
 * everywhere else it appears: three meta tags in index.html and the link
 * preview card in tools/og-image.html.
 *
 * Those two sit outside the module graph and cannot import this, so
 * `npm run check:preview-copy` asserts they still match it and runs in CI.
 * Change the sentence here, run `npm run check:preview-copy` to see what else
 * needs updating, then regenerate the card per tools/og-image.html.
 */
export const SITE_COPY = {
    STANDFIRST:
        'The assistant answers as me, from my notes and project write-ups. When they don’t cover your question it says so rather than guessing.',
} as const;
