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
