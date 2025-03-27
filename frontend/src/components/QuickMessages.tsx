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
    className = 'flex-1'
}) => {
    // Check if message is email-related
    const isEmailRelated = message.toLowerCase().includes('contact') ||
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('newsletter');

    return (
        <button
            onClick={() => onClick(message, nextQuestions, isEmailRelated, messageAvatar)}
            className={`group relative flex items-center gap-2 sm:gap-3 
                px-3 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl
                bg-gradient-to-br from-[#1c1d29] to-[#1c1d29]/90
                overflow-hidden
                transform hover:-translate-y-0.5 active:translate-y-0
                transition-all duration-200 ease-out
                border border-transparent hover:border-[#9d4edd]/20
                ${className}`}
            disabled={disabled}
        >
            {/* Simplified hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/0 via-[#b65eff]/5 to-[#9d4edd]/0 
                opacity-0 group-hover:opacity-100
                transition-opacity duration-300"></div>

            {/* Icon container */}
            <div className="relative flex justify-center items-center w-7 sm:w-9 h-7 sm:h-9 rounded-md
                bg-gradient-to-br from-[#1c1d29] to-[#252632]
                border border-[#9d4edd]/10 group-hover:border-[#9d4edd]/30
                shadow-sm shadow-[#9d4edd]/5 group-hover:shadow-[#9d4edd]/10
                transition-all duration-200">
                <span className="text-base sm:text-lg transition-transform duration-200 group-hover:scale-110 text-[#9d4edd]/80 group-hover:text-[#9d4edd]">
                    {icon}
                </span>
            </div>

            {/* Text content */}
            <div className="relative flex-1 min-w-0">
                <p className="text-xs font-medium truncate transition-colors duration-200 sm:text-sm text-white/80 group-hover:text-white">
                    {title}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-400 truncate transition-colors duration-200 group-hover:text-gray-300">
                    {description}
                </p>
            </div>

            {/* Arrow icon - simplified */}
            <svg
                className="w-4 h-4 sm:w-5 sm:h-5 text-[#9d4edd]/30 group-hover:text-[#9d4edd]/70
                    transition-colors duration-200"
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
        <div className={`flex flex-col sm:flex-row gap-1.5 sm:gap-3 px-2 sm:px-6 py-2 sm:py-4 w-full 
            bg-gradient-to-r from-[#13141f] to-[#1a1b26] border-t border-border
            ${hideOnType ? 'animate-fadeOut' : 'animate-fadeIn'}
            ${isFinalQuestion ? 'justify-center' : ''}`}>
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
                    className={`${isFinalQuestion ? 'w-full sm:max-w-md' : 'flex-1'} min-h-[52px] sm:min-h-[auto]`}
                />
            ))}
        </div>
    );
}; 