import React from 'react';
import { QuickMessageOption } from '@/types/chat';
import { MESSAGE_AVATARS } from '@/constants/chat';

interface QuickMessageButtonProps {
    icon: string;
    title: string;
    description: string;
    message: string;
    messageAvatar?: string;
    onClick: (message: string, nextQuestions?: QuickMessageOption[], isEmailRelated?: boolean, messageAvatar?: string) => void;
    nextQuestions?: QuickMessageOption[];
    disabled: boolean;
    className?: string;
}

const QuickMessageButton: React.FC<QuickMessageButtonProps> = ({
    icon,
    title,
    description,
    message,
    messageAvatar,
    onClick,
    nextQuestions,
    disabled,
    className = ''
}) => {
    // Check if message is email-related
    const isEmailRelated = message.toLowerCase().includes('contact') ||
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('newsletter');

    return (
        <button
            onClick={() => onClick(message, nextQuestions, isEmailRelated, messageAvatar)}
            className={`group relative flex items-center gap-2 
                px-3 py-2 rounded-lg
                bg-gradient-to-br from-[#1c1d29] to-[#1c1d29]/90
                overflow-hidden
                transform hover:-translate-y-0.5 active:translate-y-0
                transition-all duration-200 ease-out
                border border-transparent hover:border-[#9d4edd]/20
                min-h-[44px] max-w-full
                ${className}`}
            disabled={disabled}
        >
            {/* Simplified hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/0 via-[#b65eff]/5 to-[#9d4edd]/0 
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300"></div>

            {/* Icon container - more compact */}
            <div className="relative flex justify-center items-center w-6 h-6 rounded-md
                bg-gradient-to-br from-[#1c1d29] to-[#252632]
                border border-[#9d4edd]/10 group-hover:border-[#9d4edd]/30
                shadow-sm shadow-[#9d4edd]/5 group-hover:shadow-[#9d4edd]/10
                transition-all duration-200 flex-shrink-0">
                <span className="text-sm transition-transform duration-200 group-hover:scale-110 text-[#9d4edd]/80 group-hover:text-[#9d4edd]">
                    {icon}
                </span>
            </div>

            {/* Text content - more compact */}
            <div className="relative flex-1 min-w-0">
                <p className="text-xs font-medium truncate transition-colors duration-200 text-white/80 group-hover:text-white leading-tight">
                    {title}
                </p>
                <p className="text-[10px] text-gray-400 truncate transition-colors duration-200 group-hover:text-gray-300 leading-tight">
                    {description}
                </p>
            </div>

            {/* Arrow icon - smaller */}
            <svg
                className="w-3 h-3 text-[#9d4edd]/30 group-hover:text-[#9d4edd]/70
                    transition-colors duration-200 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
};

interface QuickMessagesProps {
    show: boolean;
    isLoading: boolean;
    onMessageSelect: (message: string, nextQuestions?: QuickMessageOption[], isEmailRelated?: boolean, messageAvatar?: string) => void;
    currentQuestions: QuickMessageOption[];
    questionLevel: number;
    hideOnType?: boolean;
}

export const QuickMessages: React.FC<QuickMessagesProps> = ({
    show,
    isLoading,
    onMessageSelect,
    currentQuestions,
    questionLevel,
    hideOnType
}) => {
    if (!show || currentQuestions.length === 0 || questionLevel >= 3) return null;

    const isFinalQuestion = questionLevel === 2;

    return (
        <div className={`px-3 py-2 w-full 
            bg-gradient-to-r from-[#13141f] to-[#1a1b26] border-t border-border
            ${hideOnType ? 'animate-fadeOut' : 'animate-fadeIn'}`}>
            
            {/* Compact grid layout for better space utilization */}
            <div className={`grid gap-2 w-full
                ${isFinalQuestion 
                    ? 'grid-cols-1 max-w-md mx-auto' 
                    : currentQuestions.length === 3 
                        ? 'grid-cols-1 sm:grid-cols-3' 
                        : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                {currentQuestions.map((question, index) => (
                    <QuickMessageButton
                        key={`${question.message}-${index}`}
                        icon={question.icon}
                        title={question.title}
                        description={question.description}
                        message={question.message}
                        messageAvatar={question.messageAvatar}
                        nextQuestions={question.nextQuestions}
                        onClick={onMessageSelect}
                        disabled={isLoading}
                        className="w-full"
                    />
                ))}
            </div>
        </div>
    );
}; 