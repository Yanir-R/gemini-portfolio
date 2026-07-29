/**
 * Endpoint paths are relative; the backend host lives in a single place (`apiClient`),
 * so there is no second copy of it to keep in sync.
 */
export const API_ENDPOINTS = {
    CHAT_STATUS: '/api/chat/status',
    CHAT: '/chat-with-files',
    PROJECTS: '/api/projects',
    PROJECT: (slug: string) => `/api/projects/${encodeURIComponent(slug)}`,
    WRITING: '/api/writing',
    WRITING_ENTRY: (slug: string) => `/api/writing/${encodeURIComponent(slug)}`,
    GET_MARKDOWN_CONTENT: (fileName: string) => `/api/content/${encodeURIComponent(fileName)}`,
} as const;
