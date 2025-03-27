export interface QuickMessageOption {
    icon: string;
    title: string;
    description: string;
    message: string;
    messageAvatar?: string;
    nextQuestions?: QuickMessageOption[];
    isEmailRelated?: boolean;
}

export type MessageType = 'user' | 'system' | 'ai' | 'initial' | 'quick';

export interface ChatMessage {
    type: MessageType;
    content: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
    avatar?: string;
}