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

/*
 * What one answer cost, as measured by the backend.
 *
 * Every field is optional and every one of them can legitimately be absent:
 * the API does not always report a thinking count, and a reply produced without
 * calling a model carries no trace at all. Absent means absent - the rail omits
 * a figure it does not have rather than printing a zero, because these are
 * displayed as evidence and a filled-in number would be a claim nothing backs.
 *
 * There is deliberately no confidence score and no per-answer source list. The
 * whole corpus is sent on every request and nothing attributes a sentence to a
 * section, so `context` reports what the model was given, not what it used.
 */

/** How many documents of one kind went into the request. */
export interface ContextCount {
    kind: string;
    count: number;
}

export interface AnswerTrace {
    model?: string | null;
    prompt_tokens?: number | null;
    thinking_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
    finish_reason?: string | null;
    latency_ms?: number | null;
    context?: ContextCount[] | null;
    /*
     * How that set was arrived at. 'narrowed' means the question selected these
     * documents; 'conversational' means nothing was being asked, so only his
     * notes went; 'unfocused' means nothing distinguished one document from
     * another, so all of them did. Rendering the last as a plain count would
     * claim a selectivity it does not have, so it reads differently.
     */
    context_outcome?: 'narrowed' | 'conversational' | 'unfocused' | 'no_corpus' | null;
    /** The whole corpus, so a narrowed set can be reported as a share of it. */
    context_available?: number | null;
}

export interface ChatMessage {
    type: MessageType;
    content: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
    trace?: AnswerTrace | null;
}
