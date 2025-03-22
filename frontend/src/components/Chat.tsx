import React from 'react';
import { MESSAGE_BUBBLE_STYLES } from '@/constants/chat';
import { MessageAvatar } from '@/components/MessageAvatar';
import { useChat } from '@/hooks/useChat';

const Chat: React.FC = () => {
    const {
        message,
        setMessage,
        isLoading,
        hasFiles,
        chatHistory,
        handleSendMessage
    } = useChat();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage();
    };

    return (
        <div className="flex flex-col h-[600px]">
            {/* Chat Messages Area */}
            <div className="overflow-y-auto flex-1 p-4">
                {chatHistory.map((msg, index) => (
                    <div key={index} className="flex gap-3 items-start mb-4">
                        <MessageAvatar type={msg.type} />
                        <div className={`rounded-lg p-3 max-w-[80%] ${MESSAGE_BUBBLE_STYLES[msg.type]}`}>
                            <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex gap-3 items-start mb-4">
                        <div className="flex flex-shrink-0 justify-center items-center w-8 h-8 rounded-lg bg-accent-purple">
                            <span>🤖</span>
                        </div>
                        <div className="p-3 rounded-lg bg-dark-tertiary">
                            <div className="flex gap-2">
                                <div className="w-2 h-2 rounded-full animate-bounce bg-accent-purple" style={{ animationDelay: '0s' }}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce bg-accent-purple" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 rounded-full animate-bounce bg-accent-purple" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
                <div className="relative">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={
                            !hasFiles
                                ? "⚠️ No files available - Basic chat only"
                                : isLoading
                                    ? "Waiting for response..."
                                    : "Ask me anything about Yanir..."
                        }
                        className="py-3 pr-12 pl-4 w-full text-white rounded-lg bg-dark-tertiary focus:outline-none focus:ring-2 focus:ring-accent-purple disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Chat message input"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 p-2 transition-colors -translate-y-1/2 text-accent-purple hover:text-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Send message"
                        disabled={isLoading}
                    >
                        <svg
                            className="w-6 h-6 transform rotate-45"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chat;