export interface QuickMessageOption {
    // No `icon`: the suggestion buttons carried a decorative emoji each, which
    // duplicated the title beside it and gave a row of prompts the texture of a
    // toolbar. The title and description carry the meaning on their own.
    title: string;
    description: string;
    message: string;
    messageAvatar?: string;
    nextQuestions?: QuickMessageOption[];
    isEmailRelated?: boolean;
}

/*
 * `confirm` exists because a successful contact submission was being rendered as
 * a `system` message - the same amber "!" treatment used for "that address
 * doesn't look right" and "the assistant is offline". The one moment a visitor
 * needs to be sure something worked was styled as a warning.
 */
export type MessageType = 'user' | 'system' | 'ai' | 'initial' | 'quick' | 'confirm';

export interface ChatMessage {
    type: MessageType;
    content: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
    avatar?: string;
}
