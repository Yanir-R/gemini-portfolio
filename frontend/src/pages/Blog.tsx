import React from 'react';
import ReturnHome from '../components/ReturnHome';

const Blog: React.FC = () => {
    return (
        <div className="container px-4 py-8 mx-auto max-w-3xl">
            <h1 className="pointer-events-none mb-6 text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                Blog
            </h1>

            <div className="flex justify-center items-center min-h-[300px]">
                <p className="text-2xl font-medium text-gray-400">Coming Soon!</p>
            </div>
            <ReturnHome />
        </div>
    );
};

export default Blog; 