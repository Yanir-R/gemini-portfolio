const isDevelopment = import.meta.env.MODE === 'development';
const BASE_URL = isDevelopment
    ? 'http://localhost:8000'
    : 'https://backend-240663900746.me-west1.run.app';

export const API_ENDPOINTS = {
    CHECK_FILES: `${BASE_URL}/check-paths`,
    CHAT: `${BASE_URL}/chat-with-files`,
    GET_MARKDOWN_CONTENT: (fileName: string) => `${BASE_URL}/api/content/${fileName}`
} as const;
