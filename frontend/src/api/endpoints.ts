export const API_ENDPOINTS = {
    CHECK_FILES: `${import.meta.env.VITE_BACKEND_URL}/check-paths` || 'http://localhost:8000/check-paths',
    CHAT: `${import.meta.env.VITE_BACKEND_URL}/chat-with-files` || 'http://localhost:8000/chat-with-files',
    GET_MARKDOWN_CONTENT: (fileName: string) => `${import.meta.env.VITE_BACKEND_URL}/api/content/${fileName}` || `http://localhost:8000/api/content/${fileName}`
} as const;
