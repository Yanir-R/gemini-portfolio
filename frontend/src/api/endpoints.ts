const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
    CHECK_FILES: `${BASE_URL}/check-paths`,
    CHAT: `${BASE_URL}/chat-with-files`,
    GET_MARKDOWN_CONTENT: (fileName: string) => `${BASE_URL}/api/content/${fileName}`
} as const;
