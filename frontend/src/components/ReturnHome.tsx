import React from 'react';
import { useNavigate } from 'react-router-dom';

const ReturnHome: React.FC = () => {
    const navigate = useNavigate();

    const handleReturn = () => {
        navigate('/');
    };

    return (
        <button
            onClick={handleReturn}
            className="group fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 font-mono text-sm text-gray-300 
                     bg-gray-800/50 rounded-lg border border-purple-500/10 shadow-lg backdrop-blur-sm 
                     transition-all duration-300 hover:bg-gray-800/80 hover:scale-105 hover:border-purple-500/30"
            aria-label="Return to home page"
        >
            <span className="text-purple-400 transition-transform duration-300 group-hover:-translate-x-1">←</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                cd ~/home
            </span>
        </button>
    );
};

export default ReturnHome; 