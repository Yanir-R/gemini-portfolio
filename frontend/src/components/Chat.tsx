import React, { useState, useEffect, useRef } from 'react';
import { MessageAvatar } from '@/components/MessageAvatar';
import { useChat } from '@/hooks/useChat';
import { QuickMessages } from '@/components/QuickMessages';
import { QuickMessageOption } from '@/types/chat';
import { FINAL_QUESTION } from '@/constants/chat';
import { EnvelopeTooltip } from '@/components/EnvelopeTooltip';
import { useScreenSize } from '@/hooks/useScreenSize';

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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const [showTooltip, setShowTooltip] = useState(true);
    const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
    const { isKeyboardVisible } = useScreenSize();
    const envelopeButtonRef = useRef<HTMLButtonElement>(null);

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
        handleQuickMessageSelect(FINAL_QUESTION.message, undefined);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ 
            behavior: 'smooth',
            block: 'end'
        });
    };

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    useEffect(() => {
        if (showTooltip) {
            const timer = setTimeout(() => {
                setShowTooltip(false);
            }, 7000);
            return () => clearTimeout(timer);
        }
    }, [showTooltip]);

    useEffect(() => {
        if (!envelopeButtonRef.current) return;

        const updateRect = () => {
            if (envelopeButtonRef.current) {
                setButtonRect(envelopeButtonRef.current.getBoundingClientRect());
            }
        };

        const resizeObserver = new ResizeObserver(updateRect);
        resizeObserver.observe(envelopeButtonRef.current);

        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect);
        };
    }, []);

    return (
        <>
            <EnvelopeTooltip show={showTooltip} buttonRect={buttonRect} handleEnvelopeClick={handleEnvelopeClick} />
            <div className={`
                flex flex-col 
                ${isKeyboardVisible 
                    ? 'h-[calc(var(--vh,1vh)*80)]' 
                    : 'h-[calc(var(--vh,1vh)*100-15rem)]'
                } sm:h-[600px]
                rounded-xl overflow-hidden 
                bg-[#0a0b15] shadow-2xl border border-border
                relative
                transition-height duration-300 ease-in-out
            `}>
                {/* Chat Header */}
                <div className="flex items-center p-3 sm:p-4 bg-gradient-to-r from-[#13141f] to-[#1a1b26] border-b border-border backdrop-blur-lg relative">
                    <div className="flex flex-1 gap-3 items-center sm:gap-4">
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
                                <div className="relative">
                                    <button
                                        ref={envelopeButtonRef}
                                        onClick={handleEnvelopeClick}
                                        className="group ml-2 p-1.5 rounded-full 
                                            hover:bg-brand-purple/10 
                                            relative
                                            transition-all duration-300 ease-out"
                                        aria-label="Contact me"
                                    >
                                        <svg 
                                            className="relative w-4 h-4 transition-all duration-300 transform text-brand-purple/80 group-hover:scale-110 group-hover:text-brand-purple animate-float"
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
                </div>

                {/* Chat Messages Container */}
                <div
                    ref={chatContainerRef}
                    onScroll={handleScroll}
                    className={`
                        relative flex-1 overflow-y-auto overscroll-y-contain p-3 sm:p-4 
                        bg-gradient-to-b from-[#0a0b15] to-[#13141f]
                        pb-[calc(4rem+var(--quick-message-height,0px))] sm:pb-4
                        ${isKeyboardVisible ? 'max-h-[60vh]' : ''}
                        scroll-smooth
                        scrollbar-thin scrollbar-thumb-brand-purple scrollbar-track-transparent
                        hover:scrollbar-thumb-brand-purple-light
                    `}
                    style={{ 
                        height: 'auto',
                        maxHeight: '100%',
                        WebkitOverflowScrolling: 'touch'
                    }}
                >
                    {/* Chat Messages */}
                    {chatHistory.map((msg, index) => (
                        <div key={index} className="flex gap-2 items-start mb-4 pointer-events-none sm:gap-4 sm:mb-6 animate-fadeIn">
                            <MessageAvatar type={msg.type} />
                            <div className={`rounded-2xl p-3 sm:p-4 max-w-[85%] sm:max-w-[80%] shadow-lg backdrop-blur-sm
                                ${msg.type === 'user'
                                    ? 'bg-gradient-to-br from-gradient-start to-brand-purple-dark shadow-brand-purple/20'
                                    : 'bg-bg-card-start border border-border shadow-border/20'}`}>
                                <p className="text-[16px] sm:text-[18px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                        </div>
                    ))}

                    {/* Loading Message */}
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

                    {/* Scroll Reference */}
                    <div ref={messagesEndRef} />

                    {showScrollButton && (
                        <button
                            onClick={scrollToBottom}
                            className="fixed sm:absolute right-6 bottom-28 sm:bottom-16 z-20
                                p-2.5 rounded-full shadow-lg 
                                transition-all duration-200 transform 
                                bg-brand-purple/90 hover:bg-brand-purple hover:scale-105 
                                animate-fadeIn"
                            aria-label="Scroll to bottom"
                        >
                            <svg 
                                className="w-5 h-5 text-white" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Quick Messages */}
                <div className="sticky bottom-[3.5rem] sm:relative sm:bottom-0 z-10 bg-[#0a0b15]">
                    <QuickMessages
                        show={showQuickMessages && quickMessageState.currentQuestions.length > 0}
                        isLoading={isLoading}
                        onMessageSelect={handleQuickMessageSelect}
                        currentQuestions={quickMessageState.currentQuestions}
                        questionLevel={quickMessageState.level}
                        hideOnType={isTyping}
                    />
                </div>

                <form 
                    onSubmit={handleSubmit} 
                    className={`
                        sticky bottom-0 sm:relative z-10
                        p-2 sm:p-3 
                        bg-gradient-to-r from-[#13141f] to-[#1a1b26] 
                        border-t border-border
                        shadow-lg
                        ${isKeyboardVisible ? 'pb-safe' : ''}
                    `}
                >
                    <div className="flex relative items-center">
                        <input
                            type="text"
                            value={message}
                            onChange={handleInputChange}
                            onFocus={() => scrollToBottom()}
                            placeholder={
                                !hasFiles
                                    ? "⚠️ No files available"
                                    : isLoading
                                        ? "Waiting..."
                                        : "Ask me anything..."
                            }
                            className="w-full py-2.5 sm:py-3 px-3 sm:px-4 pr-12
                                bg-[#1c1d29] text-white placeholder-gray-400 
                                border border-border 
                                text-[16px] sm:text-[16px]
                                shadow-inner
                                ring-[#9d4edd]
                                focus:ring-2 focus:border-transparent
                                disabled:opacity-50 disabled:cursor-not-allowed
                                rounded-xl
                                transition-all duration-200 ease-out
                                active:scale-[0.99]"
                            aria-label="Chat message input"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className={`
                                absolute right-2 sm:right-3 
                                p-2 sm:p-2.5
                                rounded-full
                                text-[#9d4edd] hover:text-[#b65eff] 
                                transform hover:scale-110 active:scale-95
                                transition-all duration-200
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${message.length > 0 ? 'bg-brand-purple/10' : ''}
                                hover:bg-brand-purple/20
                            `}
                            aria-label="Send message"
                            disabled={isLoading || !message.trim()}
                        >
                            <svg
                                className={`
                                    w-6 h-6 transform rotate-45
                                    transition-transform duration-200
                                    ${message.length > 0 ? 'scale-110' : ''}
                                `}
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
        </>
    );
};

export default Chat;