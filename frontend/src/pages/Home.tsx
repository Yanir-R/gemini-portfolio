import React from 'react';
import Chat from '@/components/Chat';

const Home: React.FC = () => {
    return (
        <div className="flex flex-col h-screen sm:h-auto sm:py-8">
            <div className="container px-4 mx-auto max-w-4xl">
                {/* Header section */}
                <div className="pt-4 pb-4 pointer-events-none sm:pt-8 sm:pb-8">
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 sm:text-4xl">
                        Welcome to Yanir.dev
                    </h1>
                </div>

                {/* Chat Container */}
                <div className="rounded-lg bg-dark-secondary">
                    <Chat />
                </div>
            </div>
        </div>
    );
};

export default Home; 