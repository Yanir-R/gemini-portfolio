import React from 'react';
import { QuickMessageOption } from '@/types/chat';

interface QuickMessageButtonProps {
    title: string;
    description: string;
    message: string;
    messageAvatar?: string;
    onClick: (
        message: string,
        nextQuestions?: QuickMessageOption[],
        isEmailRelated?: boolean,
        messageAvatar?: string
    ) => void;
    nextQuestions?: QuickMessageOption[];
    disabled: boolean;
}

const QuickMessageButton: React.FC<QuickMessageButtonProps> = ({
    title,
    description,
    message,
    messageAvatar,
    onClick,
    nextQuestions,
    disabled,
}) => {
    const isEmailRelated =
        message.toLowerCase().includes('contact') ||
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('newsletter');

    return (
        <button
            type="button"
            onClick={() => onClick(message, nextQuestions, isEmailRelated, messageAvatar)}
            disabled={disabled}
            className="flex flex-col gap-0.5 items-start px-3 py-2 w-full text-left rounded border transition-colors duration-200 border-border bg-ink-800 hover:border-border-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
            <span className="text-sm leading-snug text-content">{title}</span>
            <span className="font-mono text-[0.68rem] leading-snug text-muted">{description}</span>
        </button>
    );
};

interface QuickMessagesProps {
    show: boolean;
    isLoading: boolean;
    onMessageSelect: (
        message: string,
        nextQuestions?: QuickMessageOption[],
        isEmailRelated?: boolean,
        messageAvatar?: string
    ) => void;
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
    hideOnType,
}) => {
    if (!show || currentQuestions.length === 0 || questionLevel >= 3) return null;

    const isFinalQuestion = questionLevel === 2;

    return (
        <div
            className={`border-t border-border bg-ink-800 px-3 py-2.5 ${
                hideOnType ? 'hidden' : 'animate-fadeIn'
            }`}
        >
            <div
                className={`grid gap-2 ${
                    isFinalQuestion
                        ? 'grid-cols-1'
                        : currentQuestions.length === 3
                          ? 'grid-cols-1 sm:grid-cols-3'
                          : 'grid-cols-1 sm:grid-cols-2'
                }`}
            >
                {currentQuestions.map((question, index) => (
                    <QuickMessageButton
                        key={`${question.message}-${index}`}
                        title={question.title}
                        description={question.description}
                        message={question.message}
                        messageAvatar={question.messageAvatar}
                        nextQuestions={question.nextQuestions}
                        onClick={onMessageSelect}
                        disabled={isLoading}
                    />
                ))}
            </div>
        </div>
    );
};
