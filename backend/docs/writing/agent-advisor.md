# Your agent doesn't need a smarter model. It needs an advisor.

So you spin up a fresh session, start typing out your super-duper king-of-all prompts, and hit enter.

Then... you watch what the agent actually does: read a file, run a command, check the output, loop. Busywork. None of it needs a genius model.

An agent runs nicely on autopilot until it hits a moment that actually matters:

- *it's picking an approach*
- *it's stuck on the same error*
- *it thinks it's done*

Nail those three and the whole thing works. Miss one and it confidently drives into a wall.

And throwing a bigger model at the busywork? Doesn't help with any of it, you're just burning your daily limit to read files faster.

So here's what Anthropic shipped 🥁 the **advisor tool**, and it's clever.

**The idea:** your cheap model, Sonnet or Haiku, runs the whole task:

*runs it → hits a wall → phones a friend (Opus) → gets a plan → back to work.*

And when it calls, Opus reads the whole transcript, every step, every result, and goes: "here's your plan." It never touches a tool. It just thinks.

And this is where it gets interesting: the whole thing runs upside down. Normally the big brain sits on top, breaking the task into pieces and handing them down to sub-agents.

Now the cheap model is in charge. It only taps Opus when it's genuinely stuck. No orchestrator, no worker pool, no routing spaghetti.

And no, this isn't the "we made it cheaper so it's worse" tradeoff. Sonnet with an Opus advisor straight up beat Sonnet solo on SWE-bench, and cost about 12% less. Haiku with an Opus advisor more than doubled its BrowseComp score. DOUBLED.

Best part? You pick the combo. Cheap-and-smart for scale. Or Opus driving with Opus advising, when you just want a second set of eyes on the first one's work.

The executor decides when to ask. You decide who it calls.

API and Claude Code: `/advisor opus`.

Go break something 😉

## Kind
post

## Source
LinkedIn

## URL
https://www.linkedin.com/feed/update/urn:li:activity:7475462206080421889/

## Date
2026-06-24

## Media
/writing/advisor-diagram.jpg
/writing/advisor-cli.png

## Summary
Anthropic's advisor tool inverts the usual orchestration: the cheap model drives and escalates to Opus only at the three moments that decide whether a run succeeds.
