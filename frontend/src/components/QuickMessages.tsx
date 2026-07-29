import React from 'react';
import { QuickMessageOption } from '@/types/chat';

interface QuickMessageButtonProps {
    title: string;
    description: string;
    message: string;
    onClick: (
        message: string,
        nextQuestions?: QuickMessageOption[],
        isEmailRelated?: boolean
    ) => void;
    nextQuestions?: QuickMessageOption[];
    disabled: boolean;
}

const QuickMessageButton: React.FC<QuickMessageButtonProps> = ({
    title,
    description,
    message,
    onClick,
    nextQuestions,
    disabled,
}) => {
    // The contact flow is opened by wording, not by a flag on the button: the
    // backend decides from the same phrases, so matching them here keeps the two
    // ends agreeing about which questions are a request to get in touch.
    const isEmailRelated =
        message.toLowerCase().includes('contact') ||
        message.toLowerCase().includes('email') ||
        message.toLowerCase().includes('newsletter');

    return (
        <button
            type="button"
            onClick={() => onClick(message, nextQuestions, isEmailRelated)}
            disabled={disabled}
            className="flex flex-col gap-0.5 items-start px-3 py-1.5 w-full text-left rounded border transition-colors duration-200 sm:py-2 border-border bg-ink-800 hover:border-border-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
            <span className="text-sm leading-snug text-content">{title}</span>
            {/* Hidden on the narrowest screens. Stacked one per row, three
                descriptions cost roughly a third of the panel's height on a
                phone, and every title here is already a complete question. */}
            <span className="hidden font-mono text-[0.68rem] leading-snug sm:block text-muted">
                {description}
            </span>
        </button>
    );
};

interface QuickMessagesProps {
    show: boolean;
    isLoading: boolean;
    onMessageSelect: (
        message: string,
        nextQuestions?: QuickMessageOption[],
        isEmailRelated?: boolean
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
                        nextQuestions={question.nextQuestions}
                        onClick={onMessageSelect}
                        disabled={isLoading}
                    />
                ))}
            </div>
        </div>
    );
};
