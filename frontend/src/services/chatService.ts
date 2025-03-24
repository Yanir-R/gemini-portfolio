import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { ChatMessage } from '@/types/chat';
import axios from 'axios';

export const chatService = {
    checkFiles: async () => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.CHECK_FILES);
            return {
                hasFiles: (response.data.private_files?.length > 0),
                paths: {
                    docsDir: response.data.docs_dir,
                    privateDir: response.data.private_dir,
                    exists: {
                        docs: response.data.docs_exists,
                        private: response.data.private_exists
                    }
                }
            };
        } catch (error) {
            console.error('Error checking files:', error);
            if (axios.isAxiosError(error) && error.response) {
                console.error('Error response:', {
                    status: error.response.status,
                    data: error.response.data,
                    headers: error.response.headers
                });
            }
            return {
                hasFiles: false,
                error: axios.isAxiosError(error) ? error.message : 'An unknown error occurred'
            };
        }
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