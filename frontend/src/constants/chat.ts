import { QuickMessageOption, MessageType } from '@/types/chat';

/*
 * Speaker marks, not emoji.
 *
 * A short mono mark answers the only question an avatar has to answer - whose
 * turn is this - and keeps a transcript that is meant to be read quiet. "Y" is
 * deliberate: the assistant answers in Yanir's first person, so a robot mark
 * would misrepresent what it is.
 */
export const MESSAGE_AVATARS: Record<MessageType, string> = {
    user: 'You',
    system: '!',
    confirm: '✓',
    ai: 'Y',
    initial: 'Y',
    quick: 'You',
} as const;

export const MESSAGE_STYLES: Record<MessageType, string> = {
    user: 'bg-ink-700 text-muted border border-border',
    system: 'bg-ink-800 text-caution border border-caution/30',
    confirm: 'bg-ink-800 text-signal border border-signal/30',
    ai: 'bg-ink-800 text-signal border border-signal/30',
    initial: 'bg-ink-800 text-signal border border-signal/30',
    quick: 'bg-ink-700 text-muted border border-border',
} as const;

/*
 * Suggested openers, worded as questions a visitor would actually type rather
 * than as menu items. The third is deliberately one the corpus cannot fully
 * answer, so a visitor sees the assistant decline early rather than discovering
 * that behaviour by accident.
 */
export const INITIAL_QUESTIONS: QuickMessageOption[] = [
    {
        title: 'What have you built?',
        description: 'Shipped work, and what was hard about it',
        message: 'What projects have you built?',
        nextQuestions: [
            {
                title: 'What do you work in?',
                description: 'Languages, frameworks, tools',
                message: "What's your preferred tech stack?",
            },
            {
                title: 'What broke?',
                description: 'Failures worth reading about',
                message: 'What is the hardest bug you have had to track down?',
            },
        ],
    },
    {
        title: 'How do you work?',
        description: 'Habits, and what you care about',
        message: 'How do you approach building something new?',
        nextQuestions: [
            {
                title: 'Where did you work?',
                description: 'Roles and background',
                message: 'Tell me about your experience',
            },
            {
                title: 'What are you learning?',
                description: 'Current direction',
                message: 'What are you currently learning?',
            },
        ],
    },
    {
        title: 'Try to stump it',
        description: 'A question the notes do not cover',
        message: 'How many years of Rust experience do you have?',
        nextQuestions: [
            {
                title: 'Ask something specific',
                description: 'Dates, numbers, details',
                message: 'What is your day rate?',
            },
            {
                title: 'Back to the work',
                description: 'Projects and how they were built',
                message: 'What technologies did you use in your projects?',
            },
        ],
    },
] as const;

/*
 * `message` is sent as the *visitor's* turn and appears in the transcript above
 * their own avatar, so it is written in their voice - Yanir's side of the
 * exchange attributed to the reader would make the reply that follows a
 * non-sequitur.
 *
 * The wording also has to contain a phrase from the backend's
 * CONTACT_INTENT_PHRASES, or clicking the button goes to the model instead of
 * opening the contact flow.
 */
export const FINAL_QUESTION: QuickMessageOption = {
    title: 'Get in touch',
    description: 'Leave an email address and Yanir replies directly',
    message: "I'd like to get in touch.",
    isEmailRelated: true,
};
