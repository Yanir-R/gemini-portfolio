import { QuickMessageOption, MessageType } from '@/types/chat';

export const MESSAGE_AVATARS: Record<MessageType, string> = {
    user: '👤',
    system: 'ℹ️',
    ai: '🤖',
    initial: '🤖'
} as const;

export const MESSAGE_STYLES: Record<MessageType, string> = {
    user: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20',
    system: 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg shadow-gray-500/20',
    ai: 'bg-gradient-to-br from-brand-purple-light to-brand-purple-dark shadow-lg shadow-brand-purple/30',
    initial: 'bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-500/30'
} as const;

export const INITIAL_QUESTIONS: QuickMessageOption[] = [
    {
        icon: "💼",
        title: "Experience",
        description: "Learn about my journey",
        message: "Tell me about your experience",
        nextQuestions: [
            {
                icon: "💻",
                title: "Tech Stack",
                description: "Preferred technologies",
                message: "What's your preferred tech stack?",
            },
            {
                icon: "🌟",
                title: "Specialization",
                description: "Core strengths",
                message: "What are you specialized in?",
            }
        ]
    },
    {
        icon: "🎯",
        title: "Skills",
        description: "Discover my expertise",
        message: "What are your main skills?",
        nextQuestions: [
            {
                icon: "🚀",
                title: "Projects",
                description: "See my work",
                message: "Can you tell me about your projects?",
            },
            {
                icon: "📈",
                title: "Achievements",
                description: "Key milestones",
                message: "What are your main achievements?",
            }
        ]
    }
] as const;

export const FINAL_QUESTION: QuickMessageOption = {
    icon: "👋",
    title: "Let's Connect",
    description: "I'd love to hear from you!",
    message: "I'd love to stay in touch! I would like to send an email to you",
    isEmailRelated: true
};