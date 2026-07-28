import React from 'react';
import Chat from '@/components/Chat';

/*
 * The hero is the page's thesis, not a greeting.
 *
 * It previously read "Welcome to Yanir.dev - feel free to explore and interact
 * with my AI assistant below", which told a visitor the domain name and that a
 * chatbot existed. Neither is why anyone is here.
 *
 * The second line does real work: it sets the expectation that the assistant
 * will decline questions the corpus does not cover, so a decline reads as the
 * design rather than as a failure. That is a claim the backend actually keeps -
 * prompt.py forbids filling gaps with plausible detail - so it is safe to make.
 */
const Home: React.FC = () => {
    return (
        <div className="flex fixed inset-x-0 bottom-0 top-[64px] flex-col">
            <div className="container flex flex-col flex-1 px-4 mx-auto max-w-4xl">
                <header className="pt-4 pb-5 sm:py-7 animate-fadeIn">
                    <h1 className="text-2xl font-semibold tracking-tight leading-tight sm:text-3xl text-content">
                        I build AI products end to end, then make them trustworthy. That&apos;s the
                        harder half.
                    </h1>
                    <p className="mt-2.5 max-w-2xl text-base leading-relaxed text-muted">
                        The assistant below answers as me, from my notes and project write-ups. When
                        they don&apos;t cover your question it says so rather than guessing.
                    </p>

                    {/* The dare. One line, in mono behind a rule, so it reads as
                        an aside rather than a fourth clause of the description.

                        Two examples rather than an explanation: one question the
                        notes cannot answer, one that is none of the assistant's
                        business. They cover both ways it declines and they
                        demonstrate the behaviour instead of asserting it, which
                        is the whole reason the line is worth the space.

                        Longer drafts named the Email me button as the payoff for
                        succeeding. It is visible directly below this line, so
                        saying so cost a second line to repeat what the eye
                        already has. */}
                    <p className="pl-3 mt-3 font-mono text-xs border-l text-muted/80 border-border">
                        Try to catch it out: ask what I charge, or ask it to write your CV.
                    </p>
                </header>

                <div className="flex-1 animate-fadeIn">
                    <Chat />
                </div>
            </div>
        </div>
    );
};

export default Home;
