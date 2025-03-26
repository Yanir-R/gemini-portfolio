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
    const [hasFiles, setHasFiles] = useState(false);
    const [showQuickMessages, setShowQuickMessages] = useState(true);
    const [quickMessageState, setQuickMessageState] = useState<QuickMessageState>({
        currentQuestions: INITIAL_QUESTIONS,
        level: 0
    });

    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { type: 'initial', content: CHAT_CONFIG.INITIAL_MESSAGE }
    ]);

    useEffect(() => {
        const initializeChat = async () => {
            try {
                const response = await chatService.checkFiles();
                setHasFiles(response.hasFiles);

                if (!response.hasFiles) {
                    setChatHistory(prev => [...prev, {
                        type: 'system',
                        content: "⚠️ No files are currently available in the system."
                    }]);
                }
            } catch (error) {
                console.error('Error checking files:', error);
                setHasFiles(false);
                setChatHistory(prev => [...prev, {
                    type: 'system',
                    content: "⚠️ Error initializing chat. Please refresh the page if the issue persists."
                }]);
            }
        };

        initializeChat();
    }, []);

    const updateQuickMessages = (nextQuestions?: QuickMessageOption[]) => {
        setQuickMessageState(prev => {
            const nextLevel = prev.level + 1;
            
            // If we're at level 0 and moving to level 1, show next questions
            if (nextLevel === 1 && nextQuestions) {
                return {
                    currentQuestions: nextQuestions,
                    level: nextLevel
                };
            }
            
            // If we're at level 1 moving to level 2, show final question
            if (nextLevel === 2) {
                return {
                    currentQuestions: [FINAL_QUESTION],
                    level: nextLevel
                };
            }
            
            // If we're beyond level 2, hide all quick messages
            return {
                currentQuestions: [],
                level: 3
            };
        });
    };

    const handleSendMessage = async (messageText?: string, nextQuestions?: QuickMessageOption[], isEmailRelated?: boolean) => {
        if (isLoading || (!messageText && !message.trim())) return;

        const finalMessage = messageText || message;
        setIsLoading(true);
        setShowQuickMessages(false); // Hide messages while loading

        // Hide quick messages permanently if it's a free-form message or final question
        if (!messageText || isEmailRelated) {
            setQuickMessageState(prev => ({
                currentQuestions: [],
                level: 3 // Level 3 means we're done with quick messages
            }));
        } else {
            // Update to next level of questions
            updateQuickMessages(nextQuestions);
        }

        try {
            // Add the user message to chat history first
            setChatHistory(prev => [...prev, {
                type: 'user',
                content: finalMessage
            }]);

            const result = await chatService.sendMessage(finalMessage, chatHistory);

            if (result.success) {
                if (result.email_collected) {
                    // Add the system confirmation message
                    setChatHistory(prev => [...prev, {
                        type: 'system',
                        content: result.response || '',
                        email_collected: true
                    }]);
                    
                    // Reset quick message state and show initial questions
                    setQuickMessageState({
                        currentQuestions: INITIAL_QUESTIONS,
                        level: 0
                    });
                    setShowQuickMessages(true);
                } else {
                    // Add AI response to chat history
                    setChatHistory(prev => [...prev, {
                        type: 'ai',
                        content: result.response || '',
                        is_email_collection: result.is_email_collection,
                        email_collected: result.email_collected
                    }]);

                    // Only show quick messages if not in email collection mode
                    if (!result.is_email_collection) {
                        if (nextQuestions) {
                            updateQuickMessages(nextQuestions);
                        }
                        setShowQuickMessages(true);
                    }
                }
            } else {
                setChatHistory(prev => [...prev, {
                    type: 'system',
                    content: `❌ ${result.error}`
                }]);
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

    return {
        message,
        setMessage,
        isLoading,
        hasFiles,
        chatHistory,
        handleSendMessage,
        showQuickMessages,
        quickMessageState,
    };
}; 