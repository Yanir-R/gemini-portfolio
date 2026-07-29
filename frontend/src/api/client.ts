/// <reference types="vite/client" />
import axios from 'axios';

/**
 * Single source of truth for the backend host. `vite.config.mts` injects
 * VITE_BACKEND_URL per mode; the localhost fallback keeps `vite preview`
 * and bare `tsx` usage working without an env file.
 */
export const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

const CONNECTION_ERROR =
    'Cannot connect to backend service. Please check if the server is running.';

/**
 * Normalises anything thrown by axios into a single user-facing Error, so every
 * service reports a failure the same way. `context` names the request in the
 * console; the message is what a visitor may end up reading.
 */
export const toRequestError = (error: unknown, context: string): Error => {
    console.error(`${context}:`, error);

    if (axios.isAxiosError(error)) {
        if (error.response) {
            const { status, statusText, data } = error.response;
            return new Error(`Server error (${status}): ${data?.detail || statusText}`, {
                cause: error,
            });
        }
        if (error.request) {
            return new Error(CONNECTION_ERROR, { cause: error });
        }
    }

    return new Error(`Request failed: ${error instanceof Error ? error.message : String(error)}`, {
        cause: error,
    });
};
