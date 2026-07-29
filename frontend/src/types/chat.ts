/**
 * A suggested question offered under the composer. Text only: the title and the
 * description carry the meaning, so a row of prompts reads as questions rather
 * than as a toolbar.
 */
export interface QuickMessageOption {
    title: string;
    description: string;
    message: string;
    nextQuestions?: QuickMessageOption[];
    isEmailRelated?: boolean;
}

/*
 * `confirm` is the success case - a contact address accepted - and renders in
 * the signal colour. `system` is the amber caution treatment, reserved for "that
 * address doesn't look right" and "the assistant is offline", so the one moment
 * a visitor needs to be sure something worked is never styled as a warning.
 */
export type MessageType = 'user' | 'system' | 'ai' | 'initial' | 'quick' | 'confirm';

export interface ChatMessage {
    type: MessageType;
    content: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
}
