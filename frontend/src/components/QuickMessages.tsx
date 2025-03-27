import React from 'react';
import { QuickMessageOption } from '@/types/chat';

interface QuickMessageButtonProps {
    icon: string;
    title: string;
    description: string;
    message: string;
    onClick: (message: string, nextQuestions?: QuickMessageOption[], isEmailRelated?: boolean) => void;
    nextQuestions?: QuickMessageOption[];
    disabled: boolean;
    className?: string;
}

const QuickMessageButton: React.FC<QuickMessageButtonProps> = ({
    icon,
    title,
    description,
    message,
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
            onClick={() => onClick(message, nextQuestions, isEmailRelated)}
            className={`group relative flex items-center gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl
                bg-gradient-to-br from-[#1c1d29] to-[#1c1d29]/80
                overflow-hidden
                transform hover:-translate-y-1 active:translate-y-0
                transition-all duration-300 ease-out
                ${className}`}
            disabled={disabled}
        >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/0 via-[#b65eff]/10 to-[#9d4edd]/0 
                translate-x-[-100%] group-hover:translate-x-[100%] 
                transition-transform duration-1000 ease-in-out"></div>

            <div className="absolute inset-[1px] rounded-xl bg-[#1c1d29]
                before:absolute before:inset-0 before:rounded-xl before:p-[1px]
                before:bg-gradient-to-r before:from-transparent before:via-[#9d4edd]/50 before:to-transparent
                before:opacity-0 before:group-hover:opacity-100
                before:transition-opacity before:duration-500"></div>

            <div className="relative flex justify-center items-center w-8 sm:w-10 h-8 sm:h-10 rounded-lg
                bg-gradient-to-br from-brand-purple/10 to-[#7b2cbf]/10
                border border-[#9d4edd]/20 group-hover:border-[#9d4edd]/40
                shadow-lg shadow-[#9d4edd]/5 group-hover:shadow-[#9d4edd]/20
                transition-all duration-300">
                <span className="text-lg transition-transform duration-300 sm:text-xl group-hover:scale-110">{icon}</span>
            </div>

            <div className="relative flex-1 min-w-0">
                <p className="text-sm font-medium truncate transition-colors duration-300 sm:text-base text-white/90 group-hover:text-white">{title}</p>
                <p className="text-xs text-gray-400 truncate transition-colors duration-300 sm:text-sm group-hover:text-gray-300">{description}</p>
            </div>

            <svg
                className="hidden sm:block w-5 h-5 text-[#9d4edd]/50 group-hover:text-[#9d4edd] 
                    transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100
                    transition-all duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
        </button>
    );
};

interface QuickMessagesProps {
    show: boolean;
    isLoading: boolean;
    onMessageSelect: (message: string, nextQuestions?: QuickMessageOption[], isEmailRelated?: boolean) => void;
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
    // Don't show if:
    // 1. show prop is false
    // 2. no questions available
    // 3. question level is 3 or higher (means we're done with quick messages)
    if (!show || currentQuestions.length === 0 || questionLevel >= 3) return null;

    // Add special styling for final question (when questionLevel is 2)
    const isFinalQuestion = questionLevel === 2;

    return (
        <div className={`flex flex-col sm:flex-row gap-2 sm:gap-3 px-3 sm:px-6 py-2 sm:py-4 w-full 
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
                    nextQuestions={question.nextQuestions}
                    onClick={onMessageSelect}
                    disabled={isLoading}
                    className={`${isFinalQuestion ? 'w-full sm:max-w-md' : 'flex-1'} min-h-[60px] sm:min-h-[auto]`}
                />
            ))}
        </div>
    );
}; 