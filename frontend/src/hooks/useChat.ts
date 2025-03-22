import { useState, useEffect } from 'react';
import { ChatMessage } from '@/types/chat';
import { chatService } from '@/services/chatService';
import { CHAT_CONFIG } from '@/constants/config';

export const useChat = () => {
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [hasFiles, setHasFiles] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        {
            type: 'initial',
            content: CHAT_CONFIG.INITIAL_MESSAGE
        }
    ]);

    useEffect(() => {
        let mounted = true;

        const initializeChat = async () => {
            try {
                const { hasFiles: hasAvailableFiles } = await chatService.checkFiles();
                if (!mounted) return;

                setHasFiles(hasAvailableFiles);

                if (!hasAvailableFiles) {
                    setChatHistory(prev => [...prev, {
                        type: 'system',
                        content: "⚠️ No files are currently available in the system."
                    }]);
                }
            } catch (error) {
                if (!mounted) return;
                console.error('Error checking files:', error);
                setHasFiles(false);
            }
        };

        initializeChat();
        return () => { mounted = false; };
    }, []);

    const handleSendMessage = async () => {
        if (!message.trim()) return;

        setChatHistory(prev => [...prev, { type: 'user', content: message }]);
        setIsLoading(true);

        // Send the full chat history - backend will handle the limit
        const result = await chatService.sendMessage(message, chatHistory);

        if (result.success) {
            setChatHistory(prev => [...prev, {
                type: 'ai',
                content: result.response
            }]);
        } else {
            setChatHistory(prev => [...prev, {
                type: 'ai',
                content: `I apologize, but I encountered an error: ${result.error}`
            }]);
        }

        setIsLoading(false);
        setMessage('');
    };

    return {
        message,
        setMessage,
        isLoading,
        hasFiles,
        chatHistory,
        handleSendMessage
    };
}; 