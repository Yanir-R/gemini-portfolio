import React from 'react';
import Chat from '@/components/Chat';

const Home: React.FC = () => {
    return (
        <div className="container px-4 py-8 mx-auto max-w-3xl">
            <div className="mb-8 pointer-events-none">
                <h1 className="mb-4 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                    Welcome to Yanir.dev
                </h1>
                <p className="text-gray-300">
                    Feel free to explore and interact with my AI assistant below.
                </p>
            </div>

            {/* Chat Container */}
            <div className="rounded-lg bg-dark-secondary">
                <Chat />
            </div>
        </div>
    );
};

export default Home; 