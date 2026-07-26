/**
 * Endpoint paths are relative — the backend host lives in a single place (`apiClient`),
 * so there is no second copy of it to keep in sync.
 */
export const API_ENDPOINTS = {
    CHECK_FILES: '/check-paths',
    CHAT: '/chat-with-files',
    PROJECTS: '/api/projects',
    PROJECT: (slug: string) => `/api/projects/${encodeURIComponent(slug)}`,
    GET_MARKDOWN_CONTENT: (fileName: string) => `/api/content/${encodeURIComponent(fileName)}`,
} as const;
