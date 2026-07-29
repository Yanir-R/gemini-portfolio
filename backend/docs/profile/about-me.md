I work on the half of AI engineering that starts after the demo works.

Since 2025 I have been building a multi-agent system that investigates production incidents: agents reading Kubernetes, AWS and observability telemetry, then writing up what actually broke. I came in on the chat frontend and ended up owning whether the pipeline was right: where a citation comes from, why a model would fake one, what a single question costs.

That last part is less abstract than it sounds. A single question could fan out across far more agents than it needed and burn a fortune in tokens reaching an answer nobody could check. The fixes were unglamorous: agent decomposition, context compaction, a circuit breaker, and a linter that reads generated queries before they run.

I tend to leave systems behind rather than patches, and I don't ship a fix until I've reproduced the failure against production data. A green build has never convinced me on its own.

From 2018 to 2025 it was frontend and full-stack work: a sports betting platform at 500K daily users, finance applications for Israeli enterprises, automation testing before that. It is why I'm comfortable anywhere between a React component and a Helm chart.

The question I keep circling: how far can you trust a system that writes its own reasons? Most of what I build outside work is some attempt to answer it. Hermes is one: a self-hosted agent that runs all day, keeps its memory in an Obsidian vault, and reaches me over Telegram. This site is another, and it will tell you when it doesn't know something rather than fill the gap.
