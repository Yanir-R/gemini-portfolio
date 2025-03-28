import React from 'react';
import Chat from '@/components/Chat';

const Home: React.FC = () => {
    
    return (
        <div className="fixed inset-x-0 bottom-0 top-[64px] flex flex-col">
            <div className="container flex flex-col flex-1 px-4 mx-auto max-w-4xl">
                {/* Header section */}
                <div className="pt-4 pb-4 pointer-events-none sm:py-8 animate-fadeIn">
                    <h1 className="text-3xl font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 sm:text-4xl">
                        Welcome to Yanir.dev
                    </h1>
                    <p className="mt-2 text-lg text-gray-300 sm:text-base animate-fadeIn animation-delay-100">
                        Feel free to explore and interact with my AI assistant below.
                    </p>
                </div>

                {/* Chat Container */}
                <div className="flex-1 rounded-lg transition-all duration-300 ease-out transform animate-fadeIn animation-delay-200">
                    <Chat />
                </div>
            </div>
        </div>
    );
};

export default Home; 