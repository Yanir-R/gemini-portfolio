import React from 'react';
import ReactMarkdown from 'react-markdown';

/*
 * Renders the write-up markdown the backend serves.
 *
 * This exists because the project pages stopped rendering a hand-maintained
 * copy of each write-up and started rendering `project.content` - the real
 * markdown that context.py also assembles into the chat's corpus. That document
 * is genuine markdown, so it needs a renderer; printing it verbatim showed
 * `##` and `**` to the reader.
 *
 * react-markdown is used rather than a regex pass because it does not go
 * through `dangerouslySetInnerHTML`: it builds React elements directly, so raw
 * HTML in a document cannot become live markup. That matters more than usual
 * here, since the same documents are also fed to a model, and an injected
 * `<script>` would otherwise have two ways in.
 *
 * Every element is styled explicitly. The site has no typography plugin, and
 * relying on browser defaults inside a serif page produced Times-Roman headings
 * at the wrong scale.
 */
const COMPONENTS = {
    h1: (props: React.ComponentProps<'h1'>) => (
        <h2
            className="mt-10 mb-3 text-xl font-semibold tracking-tight text-content first:mt-0"
            {...props}
        />
    ),
    h2: (props: React.ComponentProps<'h2'>) => (
        <h3
            className="mt-9 mb-3 text-lg font-semibold tracking-tight text-content first:mt-0"
            {...props}
        />
    ),
    h3: (props: React.ComponentProps<'h3'>) => (
        <h4 className="mt-7 mb-2 font-semibold text-content first:mt-0" {...props} />
    ),
    p: (props: React.ComponentProps<'p'>) => (
        <p className="my-4 leading-relaxed text-muted" {...props} />
    ),
    ul: (props: React.ComponentProps<'ul'>) => (
        <ul className="pl-5 my-4 space-y-1.5 list-disc marker:text-border-hover" {...props} />
    ),
    ol: (props: React.ComponentProps<'ol'>) => (
        <ol className="pl-5 my-4 space-y-1.5 list-decimal marker:text-border-hover" {...props} />
    ),
    li: (props: React.ComponentProps<'li'>) => (
        <li className="leading-relaxed text-muted" {...props} />
    ),
    strong: (props: React.ComponentProps<'strong'>) => (
        <strong className="font-semibold text-content" {...props} />
    ),
    em: (props: React.ComponentProps<'em'>) => <em className="italic" {...props} />,
    a: (props: React.ComponentProps<'a'>) => (
        <a
            className="underline transition-colors text-content hover:text-signal underline-offset-4 decoration-border"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
        />
    ),
    code: (props: React.ComponentProps<'code'>) => (
        <code
            className="rounded border px-1 py-0.5 font-mono text-[0.85em] text-content border-border bg-ink-800"
            {...props}
        />
    ),
    // Long code samples must scroll inside their own box rather than widening
    // the page.
    pre: (props: React.ComponentProps<'pre'>) => (
        <pre
            className="overflow-x-auto p-4 my-5 font-mono text-sm rounded border border-border bg-ink-800 [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0"
            {...props}
        />
    ),
    blockquote: (props: React.ComponentProps<'blockquote'>) => (
        <blockquote className="pl-4 my-5 italic border-l-2 border-border text-muted" {...props} />
    ),
    hr: () => <hr className="my-8 border-border" />,
    table: (props: React.ComponentProps<'table'>) => (
        <div className="overflow-x-auto my-5">
            <table className="w-full text-sm border-collapse" {...props} />
        </div>
    ),
    th: (props: React.ComponentProps<'th'>) => (
        <th
            className="px-3 py-2 font-mono text-xs tracking-wider text-left uppercase border-b text-muted border-border"
            {...props}
        />
    ),
    td: (props: React.ComponentProps<'td'>) => (
        <td className="px-3 py-2 align-top border-b text-muted border-border/60" {...props} />
    ),
    img: (props: React.ComponentProps<'img'>) => (
        <img
            className="my-5 max-w-full h-auto rounded border border-border"
            loading="lazy"
            {...props}
        />
    ),
};

const Markdown: React.FC<{ children: string }> = ({ children }) => (
    <ReactMarkdown components={COMPONENTS}>{children}</ReactMarkdown>
);

export default Markdown;
