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
 */
export const CHAT_CONFIG = {
    INITIAL_MESSAGE:
        "I answer as Yanir, from his notes and project write-ups. Ask about the work, how it was built, or what went wrong. If it isn't written down, I'll say so rather than guess.",
} as const;
