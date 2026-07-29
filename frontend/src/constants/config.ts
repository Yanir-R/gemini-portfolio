/*
 * The assistant's opening line.
 *
 * The previous one claimed access to Yanir's "writings, and life insights" and
 * invited questions about his "personal growth". Neither is true: the corpus is
 * a short profile plus the project write-ups this site already publishes, and
 * prompt.py redirects anything outside that. An opener that promises more than
 * the corpus holds guarantees the first answer disappoints.
 *
 * Naming the boundary up front also makes a decline legible as intended
 * behaviour rather than as the assistant being broken.
 *
 * It is written in Yanir's first person, like every reply that follows it.
 * The previous version opened "I answer as Yanir, from his notes", which changed
 * person twice inside one sentence - "I" was the assistant, "his" was Yanir -
 * and was the only third-person message anywhere on the site. That the chat is a
 * machine is disclosed by the panel's label, which a visitor reads once, rather
 * than by the grammar of every sentence it produces.
 */
export const CHAT_CONFIG = {
    INITIAL_MESSAGE:
        "Ask about the work, how it was built, or what went wrong. I answer from my notes and project write-ups, so if something isn't written down I'll say so rather than guess.",
} as const;
