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
        awaitingEmail,
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

    // Not on the first render. Scrolling to the end of a transcript that is only
    // the greeting pins its *last* line to the bottom of the panel and pushes
    // its first line up behind the header, so the opening message arrived
    // already cut off. There is nothing below the greeting to scroll to; the
    // scroll only earns its place once a reply exists.
    useEffect(() => {
        if (chatHistory.length <= 1 && !isLoading) return;
        scrollToBottom();
    }, [chatHistory, isLoading]);

    // The placeholder is the only instruction the composer gives, so it has to
    // track what the conversation is actually asking for. It previously invited
    // a question about the work even while the assistant was waiting for an
    // email address, which is the moment a visitor most needs telling what to
    // type - and that a message alongside it is optional.
    const placeholder =
        hasFiles === null
            ? 'Connecting…'
            : hasFiles === false
              ? 'Unavailable: the notes could not be loaded'
              : isLoading
                ? 'Waiting for a reply…'
                : awaitingEmail
                  ? // Kept short deliberately: a placeholder that overflows the
                    // input is worse than a vaguer one, and the longer version
                    // clipped mid-word at "(optiona…".
                    'Your email address (a message is optional)'
                  : 'Ask about the work, or how it was built';

    // The height was `100vh - 15rem`, which assumed the page could not scroll
    // and that the hero above it was short. Both stopped being true: on a phone
    // it resolved taller than the space left for it, so the composer was pushed
    // off the bottom of a viewport that was also locked.
    //
    // A plain fixed height is enough now that the page scrolls - the transcript
    // has its own scrollbar, so the panel never needs to grow - and it only
    // stretches to fill its column at `lg`. The keyboard case keeps a
    // viewport-relative height, because that is the one moment the visible area
    // really does change under it.
    return (
        <div
            className={`flex flex-col ${
                isKeyboardVisible ? 'h-[calc(var(--vh,1vh)*65)]' : 'h-[30rem]'
            } sm:h-[36rem] lg:h-full relative overflow-hidden rounded border border-border bg-ink-800`}
        >
            {/* Header */}
            <div className="flex gap-2 justify-between items-center px-3 py-2.5 border-b sm:gap-4 sm:px-4 sm:py-3 border-border">
                {/* Fourth attempt, and the first three each failed differently:
                    "Grounded assistant" was jargon, "Answers from my notes"
                    repeated the line directly above the panel, and "AI
                    assistant" was accurate in isolation but disagreed with its
                    own neighbours.

                    Adding Yanir's photograph turned that disagreement into three
                    speakers in one header: a label saying machine, a face saying
                    Yanir, and a greeting that switched person mid-sentence. The
                    replies themselves are first-person as Yanir, because
                    prompt.py requires it.

                    So the panel commits to one speaker and states the
                    arrangement outright. Disclosure belongs in a label a visitor
                    reads once, not in the grammar of every sentence. */}
                <p className="label whitespace-nowrap text-[0.62rem] sm:text-[0.72rem]">
                    AI, answering as Yanir
                </p>

                <div className="flex flex-shrink-0 gap-3 items-center">
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

                    {/* This was mono, uppercase, muted and borderless, which is
                        the exact styling of the label on the other side of the
                        same row. Two pieces of identical-looking text, one inert
                        and one the only action in the panel.

                        It now carries every affordance the design language has
                        available: a border like the site's other buttons, the
                        signal colour reserved for things that do something, an
                        icon, and a hover state that fills rather than merely
                        tinting.

                        The label is "Leave your email" rather than "Email me"
                        because the two describe different mechanics. "Email me"
                        promises a mail client or a modal; this button does
                        neither. It posts a turn into the conversation, and the
                        visitor then types their address into the same composer
                        they were asking questions with. Naming the action the
                        visitor performs sets that expectation; naming the
                        outcome did not. */}
                    <button
                        type="button"
                        onClick={handleEmailClick}
                        className="flex flex-shrink-0 gap-1.5 items-center px-2 py-1 font-mono text-[0.62rem] tracking-wider uppercase whitespace-nowrap rounded border transition-colors duration-200 sm:px-2.5 sm:text-xs text-signal border-signal/40 hover:border-signal hover:bg-signal/10"
                    >
                        <svg
                            aria-hidden="true"
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.75}
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                        </svg>
                        Leave your email
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
                                        ? 'text-[0.9rem] text-muted sm:text-[0.95rem]'
                                        : 'text-base text-content sm:text-[1.05rem]'
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
