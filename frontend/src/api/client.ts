/// <reference types="vite/client" />
import axios from 'axios';

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json'
    }
}); 