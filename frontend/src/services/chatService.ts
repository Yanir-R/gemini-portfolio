import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { ChatMessage } from '@/types/chat';
import axios from 'axios';

export const chatService = {
    checkFiles: async () => {
        const response = await apiClient.get(API_ENDPOINTS.CHECK_FILES);
        return {
            hasFiles: (
                (response.data.private_files?.length > 0) ||
                (response.data.template_files?.length > 0)
            )
        };
    },

    sendMessage: async (message: string, conversationHistory: ChatMessage[]) => {
        try {
            const response = await apiClient.post(API_ENDPOINTS.CHAT, {
                message,
                conversation_history: conversationHistory.filter(msg =>
                    msg.type === 'user' || msg.type === 'ai'
                )
            });

            if (!response.data.response) {
                throw new Error('No response received from server');
            }

            return {
                success: true,
                response: response.data.response
            };
        } catch (error) {
            let errorMessage = 'Failed to get response from server';

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    errorMessage = "I couldn't find any content in the available files to answer your question.";
                } else if (error.response?.data?.detail) {
                    errorMessage = error.response.data.detail;
                }
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }
}; 