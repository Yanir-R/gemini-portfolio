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
 * The panel is quiet on purpose. Nothing here announces itself unprompted, and
 * the only state it reports is the failure one, so the text a visitor came to
 * read is the loudest thing in it.
 *
 * Message rows carry no `pointer-events` restriction: the answers must stay
 * selectable and copyable, which on a page whose whole purpose is producing text
 * worth reading matters more than any hover effect would.
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
        nextQuestions?: QuickMessageOption[],
        isEmailRelated?: boolean
    ) => {
        await handleSendMessage(selected, nextQuestions, isEmailRelated);
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

    // The header button is the same request as the final suggestion, so it ends
    // the ladder the same way rather than leaving suggestions on screen behind
    // the email exchange.
    const handleEmailClick = () =>
        handleQuickMessageSelect(FINAL_QUESTION.message, undefined, FINAL_QUESTION.isEmailRelated);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    };

    const handleScroll = () => {
        if (!chatContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        setShowScrollButton(scrollHeight - scrollTop - clientHeight >= 100);
    };

    // Not on the first render. Scrolling to the end of a transcript that is only
    // the greeting would pin its last line to the bottom of the panel and push
    // its first line up behind the header, cutting off the opening message.
    // There is nothing below the greeting to scroll to, so the scroll earns its
    // place only once a reply exists.
    useEffect(() => {
        if (chatHistory.length <= 1 && !isLoading) return;
        scrollToBottom();
    }, [chatHistory, isLoading]);

    // The placeholder is the only instruction the composer gives, so it tracks
    // what the conversation is asking for right now. Being asked for an email
    // address is the moment a visitor most needs telling what to type - and that
    // a message alongside it is optional.
    const placeholder =
        hasFiles === null
            ? 'Connecting…'
            : hasFiles === false
              ? 'Unavailable: the notes could not be loaded'
              : isLoading
                ? 'Waiting for a reply…'
                : awaitingEmail
                  ? // Kept short deliberately: a placeholder that overflows the
                    // input and clips mid-word is worse than a vaguer one.
                    'Your email address (a message is optional)'
                  : 'Ask about the work, or how it was built';

    // A plain fixed height, because the page scrolls and the transcript has its
    // own scrollbar, so the panel never needs to grow to fit its contents. It
    // stretches to fill its column only at `lg`, where the grid gives it a
    // definite height. The keyboard case is the exception: that is the one
    // moment the visible area really does change under the panel, so it takes a
    // viewport-relative height.
    return (
        <div
            className={`flex flex-col ${
                isKeyboardVisible ? 'h-[calc(var(--vh,1vh)*65)]' : 'h-[30rem]'
            } sm:h-[36rem] lg:h-full relative overflow-hidden rounded border border-border bg-ink-800`}
        >
            {/* Header */}
            <div className="flex gap-2 justify-between items-center px-3 py-2.5 border-b sm:gap-4 sm:px-4 sm:py-3 border-border">
                {/* The panel commits to one speaker and states the arrangement
                    outright. The replies are first-person as Yanir, because
                    prompt.py requires it, and his photograph sits beside them -
                    so the label has to name the machine, or the header would
                    have a face and a voice disagreeing about who is talking.

                    Disclosure belongs in a label a visitor reads once, not in
                    the grammar of every sentence the assistant produces. */}
                <p className="label whitespace-nowrap text-[0.62rem] sm:text-[0.72rem]">
                    AI, answering as Yanir
                </p>

                <div className="flex flex-shrink-0 gap-3 items-center">
                    {/* Report by exception. A green "online" dot would borrow
                        the presence indicator from chat apps, where it means a
                        person is at their keyboard - here it would be true on
                        every render, tell a visitor nothing they could act on,
                        and quietly imply someone was waiting on the other end.

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

                    {/* The only action in the panel, so it carries every
                        affordance the design language has: a border like the
                        site's other buttons, the signal colour reserved for
                        things that do something, an icon, and a hover state that
                        fills rather than merely tinting. Without them it would
                        look identical to the inert label across the row, which
                        is mono, uppercase and muted too.

                        "Leave your email" rather than "Email me" because the two
                        describe different mechanics. "Email me" promises a mail
                        client or a modal; this posts a turn into the
                        conversation, and the visitor types their address into
                        the same composer they were asking questions with. The
                        label names the action the visitor performs. */}
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
                    <div key={index} className="flex gap-3 items-start mb-5 animate-fadeIn">
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
                className="relative z-10 p-3 border-t border-border bg-ink-800"
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
