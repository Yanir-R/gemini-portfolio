export const API_ENDPOINTS = {
    CHECK_FILES: 'http://localhost:8000/check-paths',
    CHAT: 'http://localhost:8000/chat-with-files',
    GET_MARKDOWN_CONTENT: (fileName: string) => `http://localhost:8000/api/content/${fileName}`
} as const;
