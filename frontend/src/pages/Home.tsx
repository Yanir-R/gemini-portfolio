import React from 'react';
import Chat from '@/components/Chat';
import { SITE_COPY } from '@/constants/config';

/*
 * The hero is the page's thesis, not a greeting.
 *
 * It previously opened by naming the site and announcing that an AI assistant
 * sat below it. Neither is why anyone is here, and the domain it named is not
 * one this project owns - the site is served from its Pages subdomain.
 *
 * The second line does real work: it sets the expectation that the assistant
 * will decline questions the corpus does not cover, so a decline reads as the
 * design rather than as a failure. That is a claim the backend actually keeps -
 * prompt.py forbids filling gaps with plausible detail - so it is safe to make.
 *
 * The outer element is `fixed` only from `lg`. It used to be fixed at every
 * width, which locked the viewport on a phone: the hero grew taller than the
 * screen, the chat was pinned below it, and the composer sat past the bottom
 * edge with no way to scroll to it. The page's one interactive element was
 * unreachable on the device most people would open it on.
 *
 * A locked viewport is only safe when the content provably fits, and hero copy
 * at a readable size on a 390px screen does not. So small screens get an
 * ordinary scrolling document, and the full-height two-column layout starts
 * where there is room for it.
 */
const Home: React.FC = () => {
    return (
        <div className="lg:fixed lg:inset-x-0 lg:bottom-0 lg:top-[64px] lg:flex lg:flex-col">
            {/* Stacked on small screens, side by side from `lg`.
                The claim and the thing that has to survive it end up on screen
                together, so a visitor reads "it will tell you when it doesn't
                know" and can test it without scrolling. It also stops the empty
                transcript from being a full-width void on first load.

                Two columns rather than an even split: the chat gets the larger
                share because it holds wrapping prose, while the hero is fixed
                copy that reads better narrow. */}
            <div className="flex flex-col px-4 pb-10 mx-auto w-full max-w-4xl lg:grid lg:h-full lg:max-w-6xl lg:grid-cols-[0.85fr_1.15fr] lg:gap-12 lg:py-6 lg:pb-6">
                {/* Centred against the chat column rather than against the
                    viewport. The grid stretches both cells to the full height,
                    so `self-center` here lines the copy up with the middle of
                    the panel opposite it - which is the alignment the eye
                    actually looks for. */}
                <header className="pt-6 pb-6 sm:pt-8 lg:self-center lg:py-0 animate-fadeIn">
                    {/* The three blocks in this column are a type scale, not
                        three paragraphs: roughly 48 / 20 / 12px at `lg`. The
                        earlier sizes sat within one step of each other, so the
                        eye had to read all three to work out which was the
                        claim. Leading tightens as size grows, which is what
                        keeps a five-line serif headline from looking loose. */}
                    {/* Not `text-balance`: at five lines it equalised them by
                        stranding "end to end," on a line of its own. `pretty`
                        only guards the last line against an orphan and leaves
                        the rest to fill naturally. */}
                    <h1 className="text-2xl font-semibold tracking-tight leading-[1.15] text-pretty sm:text-3xl md:text-4xl lg:text-5xl lg:leading-[1.12] text-content">
                        I build AI products end to end, then make them trustworthy. That’s the
                        harder half.
                    </h1>
                    {/* No positional word here. "The assistant below" was true
                        when the page was one column and became a small lie the
                        moment it became two. Copy that describes the layout has
                        to be revisited every time the layout moves; copy that
                        describes the thing does not. */}
                    {/* Read from SITE_COPY rather than written here: the same
                        sentence has to appear in the meta tags and on the link
                        preview card, and the copy that lived in five places is
                        the copy that went stale in four of them. */}
                    <p className="mt-3 text-base leading-relaxed sm:mt-4 sm:text-lg lg:mt-5 lg:text-xl text-muted">
                        {SITE_COPY.STANDFIRST}
                    </p>

                    {/* The dare. One line, in mono behind a rule, so it reads as
                        an aside rather than a fourth clause of the description.

                        Two examples rather than an explanation: one question the
                        notes cannot answer, one that is none of the assistant's
                        business. They cover both ways it declines and they
                        demonstrate the behaviour instead of asserting it, which
                        is the whole reason the line is worth the space.

                        Longer drafts named the Email me button as the payoff for
                        succeeding. It is on screen alongside this line either
                        way, so saying so cost a second line to repeat what the
                        eye already has. */}
                    <p className="pl-3 mt-4 font-mono text-[0.7rem] leading-relaxed border-l sm:pl-3.5 sm:mt-5 sm:text-xs lg:mt-6 text-muted/70 border-border">
                        Try to catch it out: ask what I charge, or ask it to write your CV.
                    </p>
                </header>

                {/* No `flex-1` any more: the panel sizes itself from Chat's own
                    height while the page scrolls, and only stretches to fill the
                    column at `lg`, where the grid gives it a definite height to
                    fill. */}
                <div className="animate-fadeIn lg:h-full">
                    <Chat />
                </div>
            </div>
        </div>
    );
};

export default Home;
