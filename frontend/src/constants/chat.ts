import { QuickMessageOption, MessageType } from '@/types/chat';

export const MESSAGE_AVATARS: Record<MessageType, string> = {
    user: '👤',
    system: 'ℹ️',
    ai: '🤖',
    initial: '🤖',
    quick: '👆'
} as const;

export const MESSAGE_STYLES: Record<MessageType, string> = {
    user: 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20',
    system: 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-lg shadow-gray-500/20',
    ai: 'bg-gradient-to-br from-brand-purple-light to-brand-purple-dark shadow-lg shadow-brand-purple/30',
    initial: 'bg-gradient-to-br from-pink-400 to-pink-600 shadow-lg shadow-pink-500/30',
    quick: 'bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/20'
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
                icon: "📈",
                title: "Achievements",
                description: "Key milestones",
                message: "What are your main achievements?",
            },
            {
                icon: "💡",
                title: "Learning",
                description: "Growth mindset",
                message: "What are you currently learning?",
            }
        ]
    },
    {
        icon: "🚀",
        title: "Projects",
        description: "Explore my work",
        message: "Can you tell me about your projects and showcase some of your best work?",
        nextQuestions: [
            {
                icon: "⭐",
                title: "Featured",
                description: "Top projects",
                message: "What are your most impressive projects?",
            },
            {
                icon: "🔧",
                title: "Technologies",
                description: "Tech used",
                message: "What technologies did you use in your projects?",
            }
        ]
    }
] as const;

export const FINAL_QUESTION: QuickMessageOption = {
    icon: "✉️",
    title: "Send Me an Email",
    description: "Let's connect via email",
    message: "Hey! 👋\nI'd love to connect with you! Please share your email address and a brief message about what you'd like to discuss - whether it's a project collaboration, job opportunity, or just to connect. I'll make sure to get back to you soon! Looking forward to our conversation! 📧",
    isEmailRelated: true
};