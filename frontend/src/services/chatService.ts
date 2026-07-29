import axios from 'axios';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { ChatMessage } from '@/types/chat';

/**
 * Kept well below the backend's MAX_HISTORY_MESSAGES (40), which rejects a
 * longer history with a 422. That cap is a server-side guard against a
 * hand-crafted request; a visitor simply having a long conversation must not
 * trip it. The server only replays the last few turns to the model anyway, so
 * sending more costs bandwidth and buys nothing.
 */
const MAX_HISTORY_SENT = 20;

interface ChatResponse {
    response: string;
    is_email_collection?: boolean;
    email_collected?: boolean;
}

export const chatService = {
    /** Whether the backend has content to ground its answers in. */
    checkKnowledge: async () => {
        const response = await apiClient.get<{ knowledge_ready: boolean }>(
            API_ENDPOINTS.CHAT_STATUS
        );

        return { ready: response.data?.knowledge_ready === true };
    },
    sendMessage: async (message: string, conversationHistory: ChatMessage[]) => {
        try {
            const response = await apiClient.post<ChatResponse>(API_ENDPOINTS.CHAT, {
                message,
                conversation_history: conversationHistory.slice(-MAX_HISTORY_SENT).map((msg) => ({
                    type: msg.type,
                    content: msg.content,
                    is_email_collection: msg.is_email_collection,
                    email_collected: msg.email_collected,
                })),
            });

            if (!response.data) {
                throw new Error('No response received from server');
            }

            return {
                success: true,
                response: response.data.response,
                is_email_collection: response.data.is_email_collection || false,
                email_collected: response.data.email_collected || false,
            };
        } catch (error) {
            let errorMessage = 'Failed to get response from server';

            if (axios.isAxiosError(error)) {
                if (error.response?.status === 404) {
                    errorMessage =
                        "I couldn't find any content in the available files to answer your question.";
                } else if (error.response?.status === 422) {
                    errorMessage = 'That message was too long to send. Try a shorter one.';
                } else if (error.response?.status === 429) {
                    // The backend already computed exactly how long the window has
                    // left and returned it as Retry-After. Telling the visitor "a
                    // moment" while holding the real number helps nobody.
                    const retryAfter = Number(error.response.headers?.['retry-after']);
                    errorMessage =
                        Number.isFinite(retryAfter) && retryAfter > 0
                            ? `Too many messages just now. Try again in ${retryAfter} second${retryAfter === 1 ? '' : 's'}.`
                            : 'Too many messages just now. Give it a moment and try again.';
                } else if (error.response?.data?.detail) {
                    errorMessage = error.response.data.detail;
                }
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    },
};
