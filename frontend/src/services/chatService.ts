import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { ChatMessage } from '@/types/chat';
import axios from 'axios';

interface ChatResponse {
    response: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
    status?: string;
    message?: string;
}

export const chatService = {
    checkFiles: async () => {
        try {
            const response = await apiClient.get(`${API_ENDPOINTS.CHECK_FILES}`);
            const data = response.data;

            return {
                hasFiles: (data.private_files?.length > 0),
                paths: {
                    docsDir: data.docs_dir,
                    privateDir: data.private_dir,
                    exists: {
                        docs: data.docs_exists,
                        private: data.private_exists
                    },
                    privateFiles: data.private_files
                }
            };
        } catch (error) {
            throw error;
        }
    },
    sendMessage: async (message: string, conversationHistory: ChatMessage[]) => {
        try {
            const response = await apiClient.post<ChatResponse>(API_ENDPOINTS.CHAT, {
                message,
                conversation_history: conversationHistory.map(msg => ({
                    type: msg.type,
                    content: msg.content,
                    is_email_collection: msg.is_email_collection,
                    email_collected: msg.email_collected
                }))
            });

            if (!response.data) {
                throw new Error('No response received from server');
            }

            return {
                success: true,
                response: response.data.response,
                is_email_collection: response.data.is_email_collection || false,
                email_collected: response.data.email_collected || false
            };
        } catch (error) {
            let errorMessage = 'Failed to get response from server';

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    errorMessage = "I couldn't find any content in the available files to answer your question.";
                } else if (error.response?.data?.detail) {
                    errorMessage = error.response.data.detail;
                }
                if (error.response?.status === 422) {
                    errorMessage = "There was an issue with the message format. Please try again.";
                }
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }
}; 