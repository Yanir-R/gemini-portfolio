import { useState, useEffect } from 'react';
import { ChatMessage, QuickMessageOption } from '@/types/chat';
import { chatService } from '@/services/chatService';
import { CHAT_CONFIG } from '@/constants/config';
import { INITIAL_QUESTIONS, FINAL_QUESTION } from '@/constants/chat';

interface QuickMessageState {
    currentQuestions: QuickMessageOption[];
    level: number;
}

export const useChat = () => {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasFiles, setHasFiles] = useState<boolean | null>(null);
    const [showQuickMessages, setShowQuickMessages] = useState(true);
    const [quickMessageState, setQuickMessageState] = useState<QuickMessageState>({
        currentQuestions: INITIAL_QUESTIONS,
        level: 0,
    });

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { type: 'initial', content: CHAT_CONFIG.INITIAL_MESSAGE },
    ]);

    useEffect(() => {
        // Guards against StrictMode's double-invoke appending the status message twice.
        let cancelled = false;

        const initializeChat = async () => {
            try {
                const response = await chatService.checkKnowledge();
                if (cancelled) return;

                setHasFiles(response.ready);

                if (!response.ready) {
                    setChatHistory((prev) => [
                        ...prev,
                        {
                            type: 'system',
                            // The system message type already renders in the
                            // caution colour, so a warning emoji was saying the
                            // same thing twice, less precisely.
                            content:
                                "The assistant is offline: it has no notes to answer from, so it won't answer at all rather than guess.",
                        },
                    ]);
                }
            } catch (error) {
                if (cancelled) return;

                console.error('Error checking files:', error);
                setHasFiles(false);
                setChatHistory((prev) => [
                    ...prev,
                    {
                        type: 'system',
                        content:
                            'The assistant could not reach its notes. Reload to try again; the project write-ups are still readable under Work.',
                    },
                ]);
            }
        };

        initializeChat();

        return () => {
            cancelled = true;
        };
    }, []);

    const updateQuickMessages = (nextQuestions?: QuickMessageOption[]) => {
        setQuickMessageState((prev) => {
            const nextLevel = prev.level + 1;

            // If we're at level 0 and moving to level 1, show next questions
            if (nextLevel === 1 && nextQuestions) {
                return {
                    currentQuestions: nextQuestions,
                    level: nextLevel,
                };
            }

            // If we're at level 1 moving to level 2, show final question
            if (nextLevel === 2) {
                return {
                    currentQuestions: [FINAL_QUESTION],
                    level: nextLevel,
                };
            }

            // If we're beyond level 2, hide all quick messages
            return {
                currentQuestions: [],
                level: 3,
            };
        });
    };

    const handleSendMessage = async (
        messageText?: string,
        nextQuestions?: QuickMessageOption[],
        isEmailRelated?: boolean
    ) => {
        if (isLoading || (!messageText && !message.trim())) return;

        const finalMessage = messageText || message;
        setIsLoading(true);
        setShowQuickMessages(false);

        // If message is from input (message state), use 'user' type
        const messageType = messageText && message === '' ? 'quick' : 'user';

        if (!messageText || isEmailRelated) {
            setQuickMessageState({
                currentQuestions: [],
                level: 3,
            });
        } else {
            updateQuickMessages(nextQuestions);
        }

        try {
            // Add the message to chat history with correct type
            setChatHistory((prev) => [
                ...prev,
                {
                    type: messageType,
                    content: finalMessage,
                },
            ]);

            const result = await chatService.sendMessage(finalMessage, chatHistory);

            if (result.success) {
                if (result.email_collected) {
                    // `confirm`, not `system`: this is the success case, and the
                    // system style is the amber one used for warnings.
                    setChatHistory((prev) => [
                        ...prev,
                        {
                            type: 'confirm',
                            content: result.response || '',
                            email_collected: true,
                        },
                    ]);

                    // Reset quick message state and show initial questions
                    setQuickMessageState({
                        currentQuestions: INITIAL_QUESTIONS,
                        level: 0,
                    });
                    setShowQuickMessages(true);
                } else {
                    // Add AI response to chat history
                    setChatHistory((prev) => [
                        ...prev,
                        {
                            type: 'ai',
                            content: result.response || '',
                            is_email_collection: result.is_email_collection,
                            email_collected: result.email_collected,
                        },
                    ]);

                    // Only show quick messages if not in email collection mode
                    if (!result.is_email_collection) {
                        if (nextQuestions) {
                            updateQuickMessages(nextQuestions);
                        }
                        setShowQuickMessages(true);
                    }
                }
            } else {
                setChatHistory((prev) => [
                    ...prev,
                    {
                        type: 'system',
                        // chatService already writes these messages for the
                        // visitor, including the exact retry window on a 429.
                        // Prefixing a cross undoes that work.
                        //
                        // `error` is optional on the result, and the previous
                        // template literal hid that: an undefined error
                        // rendered as the string "undefined" after the emoji.
                        content:
                            result.error ??
                            'That message did not go through. Try sending it again.',
                    },
                ]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsLoading(false);
            setMessage('');
            // Only show quick messages again if we're not done with them
            setShowQuickMessages(quickMessageState.level < 3);
        }
    };

    /*
     * True while the assistant has asked for an address and not yet received a
     * valid one. The backend already reports this per reply; nothing was reading
     * it, so the composer went on inviting questions about the work at the exact
     * moment the visitor was being asked for their email.
     *
     * Read off the last assistant turn rather than a separate flag, so an
     * invalid address (which comes back with the same flag set again) keeps the
     * state on, and a successful submission clears it.
     */
    const lastReply = [...chatHistory]
        .reverse()
        .find((m) => m.type === 'ai' || m.type === 'confirm');
    const awaitingEmail = Boolean(lastReply?.is_email_collection && !lastReply?.email_collected);

    return {
        message,
        setMessage,
        isLoading,
        hasFiles,
        chatHistory,
        handleSendMessage,
        showQuickMessages,
        quickMessageState,
        awaitingEmail,
    };
};
