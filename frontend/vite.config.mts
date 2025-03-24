import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: true,
    },
    build: {
        target: 'esnext',
        sourcemap: false,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    css: {
        postcss: {
            plugins: [
                tailwindcss,
                autoprefixer,
            ],
        },
    },
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'axios'
            // Add other dependencies as needed
        ]
    }
}) 