export interface QuickMessageOption {
    icon: string;
    title: string;
    description: string;
    message: string;
    nextQuestions?: QuickMessageOption[];
    isEmailRelated?: boolean;
}

export type MessageType = 'user' | 'system' | 'ai' | 'initial';

export interface ChatMessage {
    type: 'user' | 'assistant' | 'ai' | 'initial' | 'system';
    content: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
}