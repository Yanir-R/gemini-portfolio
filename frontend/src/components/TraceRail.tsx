import React from 'react';
import { AnswerTrace } from '@/types/chat';

/*
 * What the answer above this line cost.
 *
 * The site's argument is that its assistant is grounded and bounded, and until
 * now that was true and invisible: the backend measured the model, the token
 * counts and the finish reason on every request and wrote them to a log nobody
 * reads. This is the same measurement, shown to the person it is a claim about.
 *
 * Two rules govern what appears here.
 *
 * **Only what was measured.** Every figure comes from the SDK's own usage
 * metadata or from the corpus the request was built with. A field the API did
 * not report is omitted rather than printed as zero - a fabricated number in a
 * panel whose whole purpose is evidence would discredit the ones that are real.
 *
 * **Nothing that implies machinery we do not have.** There is no confidence
 * score, because nothing verifies an answer against the corpus. There is no
 * per-answer source list, because the entire corpus is sent every time and
 * nothing tracks which section a sentence came from; `context` reports what the
 * model was given, which is true, rather than what it used, which nobody knows.
 *
 * The corpus is counted in documents rather than tokens. An earlier draft
 * printed the backend's chars-over-four token estimate here, next to the exact
 * `prompt_tokens` measurement of very nearly the same quantity - two numbers
 * four percent apart, inviting the reader to work out which to believe. The
 * count says something the measurement does not: that the answer came from a
 * finite, nameable set of Yanir's own documents, which is the site's argument.
 *
 * Mono and muted by design: serif is Yanir speaking, mono is the machine
 * reporting on itself, so the rail can never be mistaken for part of the answer.
 */

/** Absent and zero are different things here, so the check has to allow zero. */
const present = (value: number | null | undefined): value is number =>
    value !== null && value !== undefined;

const formatTokens = (value: number): string =>
    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);

const formatLatency = (ms: number): string =>
    ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

/*
 * The API's enum, said the way a visitor would say it.
 *
 * MAX_TOKENS is the one that matters: it means the answer stopped mid-thought,
 * and the backend replaces the text in that case, so the rail has to agree with
 * the bubble above it rather than reporting a clean finish under an apology.
 * Anything unrecognised is passed through lowercased instead of being mapped to
 * a reassuring word - an unknown state is not a normal one.
 */
const FINISH_LABELS: Record<string, string> = {
    STOP: 'complete',
    MAX_TOKENS: 'cut off',
    SAFETY: 'stopped on safety',
    RECITATION: 'stopped on recitation',
};

interface TraceRailProps {
    trace: AnswerTrace;
}

export const TraceRail: React.FC<TraceRailProps> = ({ trace }) => {
    const finish = trace.finish_reason ?? null;
    const truncated = finish === 'MAX_TOKENS';

    // Assembled then filtered, so a missing count closes the gap instead of
    // leaving a stray separator behind it.
    const segments = [
        trace.model,
        present(trace.prompt_tokens) ? `${formatTokens(trace.prompt_tokens)} in` : null,
        // Gemini does not always report this one. When it is absent the segment
        // is dropped rather than derived from the total, which would be an
        // inference presented as a measurement.
        present(trace.thinking_tokens) ? `${formatTokens(trace.thinking_tokens)} thinking` : null,
        present(trace.output_tokens) ? `${formatTokens(trace.output_tokens)} out` : null,
        present(trace.latency_ms) ? formatLatency(trace.latency_ms) : null,
    ].filter((segment): segment is string => Boolean(segment));

    // "2 notes and 1 post in context". The backend sends the kinds and counts;
    // the words and their plurals are copy, so they are decided here.
    //
    // Never "from": that would say the answer came out of these documents, and
    // nothing measures that. Selection decides what the model was handed, which
    // is a different and honest claim.
    const counts = (trace.context ?? [])
        .filter((entry) => entry.count > 0)
        .map((entry) => `${entry.count} ${entry.kind}${entry.count === 1 ? '' : 's'}`);

    const listed =
        counts.length > 1
            ? `${counts.slice(0, -1).join(', ')} and ${counts[counts.length - 1]}`
            : counts[0];

    // The two outcomes read differently on purpose. A narrowed set was chosen
    // for this question and is worth stating precisely; an unfocused one means
    // nothing in the question distinguished one document from another, so the
    // honest report is that everything went, not a count dressed as a choice.
    const context = !counts.length
        ? null
        : trace.context_outcome === 'unfocused'
          ? `all ${present(trace.context_available) ? trace.context_available : counts.length} of my documents in context`
          : `${listed} in context`;

    // Nothing measured, nothing to say. An empty rule under an answer would
    // read as a failed render rather than as an absence.
    if (segments.length === 0 && !context) return null;

    return (
        <div className="pl-2.5 mt-2 font-mono border-l text-[0.6rem] leading-relaxed border-border text-muted/70">
            <p>
                {segments.join(' · ')}
                {finish && (
                    <>
                        {segments.length > 0 && ' · '}
                        {/* Colour is state and only state. A clean finish is
                            not worth a hue; a truncated one is the single
                            outcome a visitor should notice, so it takes the
                            caution colour the rest of the site reserves for
                            "the assistant could not complete this". */}
                        <span className={truncated ? 'text-caution' : undefined}>
                            {FINISH_LABELS[finish] ?? finish.toLowerCase()}
                        </span>
                    </>
                )}
            </p>
            {context && <p>{context}</p>}
        </div>
    );
};
