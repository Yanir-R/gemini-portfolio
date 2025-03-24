import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
    const env = mode === 'production'
        ? {
            VITE_BACKEND_URL: 'https://backend-240663900746.me-west1.run.app'
        }
        : {
            VITE_BACKEND_URL: 'http://localhost:8000'
        }

    return {
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
            ]
        },
        envPrefix: 'VITE_',
        define: {
            'import.meta.env.VITE_BACKEND_URL': JSON.stringify(env.VITE_BACKEND_URL)
        }
    }
}) 