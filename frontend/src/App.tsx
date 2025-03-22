import React from 'react'
import Chat from '@/components/Chat'

const App: React.FC = () => {
    return (
        <div className="min-h-screen text-white bg-dark-primary">
            <div className="p-4 mx-auto max-w-3xl">
                {/* Header */}
                <div className="flex gap-3 items-center p-4 mb-4 rounded-lg bg-dark-secondary">
                    <div className="flex justify-center items-center w-10 h-10 rounded-lg bg-accent-purple">
                        <span className="text-xl">📱</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold">Yanir's AI</h1>
                        <div className="flex gap-2 items-center">
                            <span className="w-2 h-2 rounded-full bg-accent-green"></span>
                            <span className="text-sm text-gray-400">Online</span>
                        </div>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="rounded-lg bg-dark-secondary">
                    <Chat />
                </div>
            </div>
        </div>
    )
}

export default App 