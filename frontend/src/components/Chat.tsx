import React, { useState, useEffect, useRef } from 'react';
import { MessageAvatar } from '@/components/MessageAvatar';
import { useChat } from '@/hooks/useChat';
import { QuickMessages } from '@/components/QuickMessages';
import { QuickMessageOption } from '@/types/chat';
import { FINAL_QUESTION } from '@/constants/chat';
import { useScreenSize } from '@/hooks/useScreenSize';

/*
 * The transcript.
 *
 * Three things changed beyond the palette, and each removed behaviour rather
 * than adding it:
 *
 * 1. The header carried a disco-ball emoji on a gradient chip with four stacked
 *    blur layers and a hue-rotate animation on hover, plus a second emoji beside
 *    the name. It was the loudest element on the site and said nothing.
 *
 * 2. A tooltip reading "Click to send me an email" appeared unprompted on every
 *    visit and dismissed itself after seven seconds. Supporting it cost a
 *    ResizeObserver, a MutationObserver watching body's class list, a scroll and
 *    resize listener, and four pieces of state - all to nag a visitor who had
 *    not asked anything yet. The email action is still one click away in the
 *    header, which is where it belonged.
 *
 * 3. Message rows were marked `pointer-events-none`, which made the assistant's
 *    answers impossible to select or copy. On a page whose entire purpose is
 *    producing text worth reading, that was the most expensive line in the file.
 */
const Chat: React.FC = () => {
    const {
        message,
        setMessage,
        isLoading,
        hasFiles,
        chatHistory,
        handleSendMessage,
        showQuickMessages,
        quickMessageState,
    } = useChat();

    const [isTyping, setIsTyping] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { isKeyboardVisible } = useScreenSize();

    const handleQuickMessageSelect = async (
        selected: string,
        nextQuestions?: QuickMessageOption[]
    ) => {
        await handleSendMessage(selected, nextQuestions);
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

    const handleEmailClick = () => handleQuickMessageSelect(FINAL_QUESTION.message, undefined);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight >= 100);
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isLoading]);

    // Three states, three different sentences. "Loading files..." described the
    // server's job; a visitor only needs to know whether they can type yet.
    const placeholder =
        hasFiles === null
            ? 'Connecting…'
            : hasFiles === false
              ? 'Unavailable: the notes could not be loaded'
              : isLoading
                ? 'Waiting for a reply…'
                : 'Ask about the work, or how it was built';

    return (
        <div
            className={`flex flex-col ${
                isKeyboardVisible
                    ? 'h-[calc(var(--vh,1vh)*80)]'
                    : 'h-[calc(var(--vh,1vh)*100-15rem)]'
            } sm:h-[600px] relative overflow-hidden rounded border border-border bg-ink-800`}
        >
            {/* Header */}
            <div className="flex gap-4 justify-between items-center px-4 py-3 border-b border-border">
                {/* Two rejected attempts before this one, and the second failed
                    for a different reason than the first.

                    "Grounded assistant" was jargon. "Answers from my notes" was
                    plain English but redundant: the line directly above the panel
                    already says the assistant answers from the notes, so a
                    visitor read the same sentence twice within three seconds.

                    The label's remaining job is not to explain behaviour - the
                    hero does that - but to name the thing, and to state the one
                    fact the hero leaves out: it is a machine, not Yanir. */}
                <p className="label">AI assistant</p>

                <div className="flex gap-4 items-center">
                    {/* Report by exception.
                        A green "online" dot borrows the presence indicator from
                        chat apps, where it means a person is at their keyboard.
                        Here it was true on every render and told a visitor
                        nothing they could act on, while quietly implying someone
                        was waiting on the other end.

                        The failure state is the only one worth a badge, so it is
                        the only one that gets one. */}
                    {hasFiles === false && (
                        <span className="flex gap-2 items-center font-mono text-xs text-caution">
                            <span
                                aria-hidden="true"
                                className="w-1.5 h-1.5 rounded-full bg-caution"
                            />
                            unavailable
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={handleEmailClick}
                        className="font-mono text-xs tracking-wider uppercase transition-colors duration-200 text-muted hover:text-signal"
                    >
                        Email me
                    </button>
                </div>
            </div>

            {/* Transcript */}
            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="overflow-y-auto overscroll-y-contain relative flex-1 px-4 py-5 bg-ink-900"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {chatHistory.map((msg, index) => (
                    <div
                        key={index}
                        className="flex gap-3 items-start mb-5 animate-fadeIn"
                        // No pointer-events-none here: answers must be selectable.
                    >
                        <MessageAvatar type={msg.type} />
                        <div
                            className={`max-w-[88%] ${
                                msg.type === 'user'
                                    ? 'rounded border border-border bg-ink-800 px-3.5 py-2.5'
                                    : ''
                            }`}
                        >
                            <p
                                className={`whitespace-pre-wrap break-words leading-relaxed ${
                                    msg.type === 'user'
                                        ? 'text-[0.95rem] text-muted'
                                        : 'text-[1.05rem] text-content'
                                }`}
                            >
                                {msg.content}
                            </p>
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex gap-3 items-center" role="status">
                        <MessageAvatar type="ai" />
                        <span className="font-mono text-xs tracking-wider uppercase text-muted">
                            Generating<span className="animate-blink">…</span>
                        </span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {showScrollButton && (
                <button
                    type="button"
                    onClick={scrollToBottom}
                    className="absolute right-4 bottom-32 z-20 px-2.5 py-1.5 font-mono text-xs rounded border transition-colors duration-200 sm:bottom-28 text-muted border-border bg-ink-800/95 hover:text-content"
                >
                    Latest ↓
                </button>
            )}

            <QuickMessages
                show={showQuickMessages && quickMessageState.currentQuestions.length > 0}
                isLoading={isLoading}
                onMessageSelect={handleQuickMessageSelect}
                currentQuestions={quickMessageState.currentQuestions}
                questionLevel={quickMessageState.level}
                hideOnType={isTyping}
            />

            <form
                onSubmit={handleSubmit}
                className={`relative z-10 border-t border-border bg-ink-800 p-3 ${
                    isKeyboardVisible ? 'pb-safe' : ''
                }`}
            >
                <div className="flex relative items-center">
                    <input
                        type="text"
                        value={message}
                        onChange={handleInputChange}
                        onFocus={scrollToBottom}
                        // Matches the backend's MAX_MESSAGE_CHARS, so an over-long
                        // message stops at the keyboard rather than coming back as
                        // a 422 the visitor cannot interpret.
                        maxLength={2000}
                        placeholder={placeholder}
                        className="py-2.5 pr-20 pl-3.5 w-full text-base rounded border transition-colors duration-200 bg-ink-700 text-content placeholder-muted border-border focus:border-signal disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Ask a question"
                        disabled={isLoading || hasFiles === false}
                    />
                    <button
                        type="submit"
                        className="absolute right-2 px-2.5 py-1.5 font-mono text-xs tracking-wider uppercase rounded transition-colors duration-200 text-muted hover:text-signal disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-muted"
                        disabled={isLoading || !message.trim() || hasFiles === false}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chat;
