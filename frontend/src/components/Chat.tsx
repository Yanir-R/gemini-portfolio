import React, { useState } from 'react';
import { MessageAvatar } from '@/components/MessageAvatar';
import { useChat } from '@/hooks/useChat';
import { QuickMessages } from '@/components/QuickMessages';
import { QuickMessageOption } from '@/types/chat';
import { FINAL_QUESTION } from '@/constants/chat';

const Chat: React.FC = () => {
    const {
        message,
        setMessage,
        isLoading,
        hasFiles,
        chatHistory,
        handleSendMessage,
        showQuickMessages,
        quickMessageState
    } = useChat();

    const [isTyping, setIsTyping] = useState(false);

    const handleQuickMessageSelect = async (
        message: string,
        nextQuestions?: QuickMessageOption[],
    ) => {
        await handleSendMessage(message, nextQuestions);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMessage(e.target.value);
        setIsTyping(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(message);
        setIsTyping(false);
    };

    const handleEnvelopeClick = () => {
        handleQuickMessageSelect(FINAL_QUESTION.message, undefined, true);
    };

    return (
        <div className="flex flex-col h-full rounded-xl overflow-hidden bg-[#0a0b15] shadow-2xl border border-border">
            {/* Chat Header */}
            <div className="flex items-center p-5 bg-gradient-to-r from-[#13141f] to-[#1a1b26] border-b border-border backdrop-blur-lg">
                <div className="flex flex-1 gap-4 items-center">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#b65eff] to-[#9d4edd] rounded-2xl blur-xl opacity-0 group-hover:opacity-50 transition-all duration-500"></div>
                        <div className="relative flex justify-center items-center w-11 h-11 rounded-2xl 
                            bg-gradient-to-br from-brand-purple to-[#7b2cbf] 
                            hover:from-[#b65eff] hover:to-[#9d4edd]
                            shadow-lg shadow-[#9d4edd]/20 
                            hover:shadow-[#b65eff]/50
                            transform hover:-translate-y-1
                            animate-float
                            transition-all duration-500 ease-out
                            before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:to-brand-purple-light/20 before:rounded-2xl before:opacity-0 before:group-hover:opacity-100 before:transition-opacity before:duration-500">
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#b65eff]/0 to-[#9d4edd]/0 group-hover:from-[#b65eff]/20 group-hover:to-[#9d4edd]/20 transition-all duration-500"></div>
                            <span className="text-2xl relative z-10
                                transition-all duration-500
                                group-hover:animate-disco
                                transform group-hover:scale-110
                                [text-shadow:_0_0_10px_rgb(157_78_221_/_50%)]
                                group-hover:[text-shadow:_0_0_20px_rgb(182_94_255_/_80%)]">
                                🪩
                            </span>
                            <div className="absolute -inset-1 bg-gradient-to-br from-[#b65eff]/0 to-[#9d4edd]/0 group-hover:from-[#b65eff]/10 group-hover:to-[#9d4edd]/10 rounded-3xl blur-xl transition-all duration-500"></div>
                        </div>
                        <div className="absolute -inset-2 bg-gradient-to-br from-[#b65eff] to-[#9d4edd] rounded-3xl opacity-0 group-hover:opacity-10 blur-2xl transition-all duration-500"></div>
                    </div>
                    <div className="flex flex-1 justify-between items-center">
                        <div className="flex gap-2 items-center group">
                            <span className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 pointer-events-none">
                                Yanir's AI
                            </span>
                            <span className="text-[#9d4edd] text-lg transform group-hover:rotate-180 transition-transform duration-500 pointer-events-none">
                                👱🏻‍♂️
                            </span>
                        </div>
                        <div className="flex gap-3 items-center px-4 py-1.5 rounded-full bg-[#1c1d29]/50 border border-border">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-lg shadow-[#22c55e]/30 animate-pulse"></span>
                            <span className="text-sm font-medium text-gray-300 pointer-events-none">Online</span>
                            <button
                                onClick={handleEnvelopeClick}
                                className="group ml-2 p-1.5 rounded-full 
                                    hover:bg-brand-purple/10 
                                    transition-all duration-300 ease-out"
                                aria-label="Contact me"
                            >
                                <svg 
                                    className="w-4 h-4 transition-all duration-300 transform text-brand-purple/80 group-hover:scale-110 group-hover:text-brand-purple animate-float"
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Messages */}
            <div
                className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#0a0b15] to-[#13141f]"
                style={{ maxHeight: 'calc(100vh - 240px)' }}
            >
                {chatHistory.map((msg, index) => (
                    <div key={index} className="flex gap-4 items-start mb-6 pointer-events-none animate-fadeIn">
                        <MessageAvatar type={msg.type} />
                        <div className={`rounded-2xl p-4 max-w-[80%] shadow-lg backdrop-blur-sm
                            ${msg.type === 'user'
                                ? 'bg-gradient-to-br from-gradient-start to-brand-purple-dark shadow-brand-purple/20'
                                : 'bg-bg-card-start border border-border shadow-border/20'}`}>
                            <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex gap-4 items-start mb-6">
                        <div className="flex flex-shrink-0 justify-center items-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-[#7b2cbf] shadow-lg shadow-[#9d4edd]/20">
                            <span>🤖</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-[#1c1d29] border border-border shadow-lg">
                            <div className="flex gap-2">
                                {[0, 0.2, 0.4].map((delay, i) => (
                                    <div
                                        key={i}
                                        className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-brand-purple to-[#7b2cbf] animate-bounce"
                                        style={{ animationDelay: `${delay}s` }}
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <QuickMessages
                show={showQuickMessages && quickMessageState.currentQuestions.length > 0}
                isLoading={isLoading}
                onMessageSelect={handleQuickMessageSelect}
                currentQuestions={quickMessageState.currentQuestions}
                questionLevel={quickMessageState.level}
                hideOnType={isTyping}
            />

            <form onSubmit={handleSubmit} className="p-3 sm:p-4 bg-gradient-to-r from-[#13141f] to-[#1a1b26] border-t border-border">
                <div className="relative">
                    <input
                        type="text"
                        value={message}
                        onChange={handleInputChange}
                        placeholder={
                            !hasFiles
                                ? "⚠️ No files available"
                                : isLoading
                                    ? "Waiting..."
                                    : "Ask me anything..."
                        }
                        className="w-full py-3 sm:py-3.5 px-4 sm:px-5 pr-12 rounded-xl bg-[#1c1d29] text-white placeholder-gray-400 
                            border border-border 
                            text-sm sm:text-base
                            shadow-inner
                            ring-[#9d4edd]
                            focus:ring-2 focus:border-transparent
                            disabled:opacity-50 disabled:cursor-not-allowed
                            transition-all duration-200 ease-out"
                        aria-label="Chat message input"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 p-2 -translate-y-1/2 
                            text-[#9d4edd] hover:text-[#b65eff] 
                            transform hover:scale-110 active:scale-95
                            transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed"
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