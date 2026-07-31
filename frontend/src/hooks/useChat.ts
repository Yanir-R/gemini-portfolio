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

    /*
     * The suggestions narrow as the conversation goes on: the openers lead to a
     * follow-up pair, the pair leads to the contact prompt, and after that the
     * composer is left alone. Three levels is the whole ladder.
     */
    const updateQuickMessages = (nextQuestions?: QuickMessageOption[]) => {
        setQuickMessageState((prev) => {
            const nextLevel = prev.level + 1;

            if (nextLevel === 1 && nextQuestions) {
                return {
                    currentQuestions: nextQuestions,
                    level: nextLevel,
                };
            }

            if (nextLevel === 2) {
                return {
                    currentQuestions: [FINAL_QUESTION],
                    level: nextLevel,
                };
            }

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

        // A suggestion arrives as `messageText` with the composer empty;
        // anything else is what the visitor typed themselves.
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
                    // `confirm`, not `system`: this is the success case, and
                    // `system` is the amber style reserved for warnings.
                    setChatHistory((prev) => [
                        ...prev,
                        {
                            type: 'confirm',
                            content: result.response || '',
                            email_collected: true,
                        },
                    ]);

                    // The exchange is over, so the ladder starts again.
                    setQuickMessageState({
                        currentQuestions: INITIAL_QUESTIONS,
                        level: 0,
                    });
                    setShowQuickMessages(true);
                } else {
                    setChatHistory((prev) => [
                        ...prev,
                        {
                            type: 'ai',
                            content: result.response || '',
                            is_email_collection: result.is_email_collection,
                            email_collected: result.email_collected,
                            // Carried on the message rather than held as
                            // separate state: the trace belongs to one answer,
                            // and a transcript of several answers needs each to
                            // keep its own.
                            trace: result.trace,
                        },
                    ]);

                    // Suggestions stay hidden while an address is being asked
                    // for, so nothing invites the visitor to change the subject.
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
                        // chatService writes these messages for the visitor
                        // already, including the exact retry window on a 429, so
                        // they are shown verbatim. The fallback is there because
                        // `error` is optional on the result and must never reach
                        // the transcript as the string "undefined".
                        content:
                            result.error ??
                            'That message did not go through. Try sending it again.',
                    },
                ]);

                // The send failed, so the suggestions come back and the visitor
                // has something to do other than retype. QuickMessages still
                // renders nothing once the ladder has run out.
                setShowQuickMessages(true);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setShowQuickMessages(true);
        } finally {
            // Visibility is decided by whichever branch above knows the outcome.
            // Deciding it here as well would override those choices, and would
            // read `quickMessageState` from the render that started this call
            // rather than the value just set.
            setIsLoading(false);
            setMessage('');
        }
    };

    /*
     * True while the assistant has asked for an address and not yet received a
     * valid one, so the composer can say what it is waiting for.
     *
     * Read off the last assistant turn rather than held as a separate flag: an
     * invalid address comes back with the same flag set again, which keeps the
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
