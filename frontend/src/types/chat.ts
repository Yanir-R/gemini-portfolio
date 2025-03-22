export interface ChatMessage {
    type: 'user' | 'ai' | 'initial' | 'system';
    content: string;
} 