# The Three Meanings of "Nothing" in AI Agent Tool-Calling

When we started running our agent in production, we kept hitting the same class of issues.

A tool call would come back empty and the agent would just keep retrying. An auth failure on one integration would take down the whole investigation. A query for a service that didn't exist would send the agent down a rabbit hole through every data source, chasing something that was never there.

Each of these looked like "the tool returned nothing" but the root cause was different every time. We were treating every empty response as one condition, when they actually meant **three completely different things**.

## The three states of "nothing"

### 1. Tool failure (something broke)

The tool itself errored. Timeout, auth failure, bad request, server error. **The agent never got an answer.**

Think of it like calling a restaurant to ask about a table and the phone line is dead. You got nothing at all, not even a "no." For transient errors, retry. For permanent ones like auth failures, stop immediately. Never treat this as "no data available."

### 2. Empty results (valid answer: zero matches)

The query executed successfully. The tool worked perfectly. It just returned zero rows. This is a **valid, informative answer**, not a failure.

Same restaurant, but this time someone picks up and says "We have no tables tonight." That's a real answer. You got the information you needed. The agent should take "zero results" as a data point and move on, not retry or report an error.

### 3. Resource not found (the thing doesn't exist)

The query worked, but the target resource (a service, a deployment, an entity) genuinely doesn't exist anywhere in the system. This is different from both a failure and empty results.

Back to the restaurant: you look up the address and there's nothing there. Never was. The call didn't fail and the table isn't full. **The thing itself doesn't exist.** The agent should stop looking, stop retrying, and stop querying other tools hoping for a different answer.

> Debugging a single tool call, you can see the difference immediately. But in production, with dozens of tools firing in parallel, that clarity disappears fast.

## How we fixed it

What actually worked for us was **structured signals** at every level of the system, so the distinction between these three states never gets lost.

### At the tool level

We changed how tools report back. Instead of returning raw data and letting the agent figure out what went wrong, every tool response now carries a typed signal:

```json
// The system immediately knows this is an auth problem
{ "error": true, "error_type": "auth_failure", "message": "Invalid API key" }

// Zero rows, but the tool worked perfectly
{ "results": [], "row_count": 0 }
```

In both cases, the agent ends up with nothing useful to work with. But the reason is completely different.

Once you have that distinction, you can put a guard in front of the agent that decides what to do before the agent even sees the response. Auth failures get blocked session-wide, because those credentials aren't fixing themselves mid-run. Rate limits get retried with backoff. Server errors get another shot or two.

**Most frameworks handle this with a simple retry-or-don't split. The distinction between error types, and the decision to block before the LLM even sees the response, is where the gap is.**

### At the agent level

Even after the guard layer filters out tool errors, the agent still has to make sense of what came back. Here's the example we kept running into: an agent queries a monitoring tool for a service called "payments-api." The tool returns zero results. Does that mean payments-api has no alerts right now, or does it mean there's no service called payments-api in this environment? Those require completely different next steps, and the raw response looks identical.

This is where the agent has to make a judgment call. Was the data actually useful, was it empty, or was it junk? And separately: does the target resource even exist?

**This is the layer most implementations miss.** Most frameworks stop at error-or-not. The distinction between empty results and a missing resource, and what to do with that distinction downstream, is a gap we haven't seen addressed.

### At the pipeline level

When multiple agents report back, the system needs to do more than just collect their answers. "Not found" needs to be a real outcome, not just an absence of data.

In practice, tasks depend on each other. A root-cause analysis task can't run if the data-gathering task came back with "this resource doesn't exist." It should be skipped entirely with a clear reason, not left waiting or fed empty context.

And when "not found" is the answer, the pipeline should be able to short-circuit: stop everything downstream and tell the user directly, instead of letting other agents keep working against a dead end. "Not found" completes the pipeline cleanly. "Failed" means something broke. They're not the same outcome and shouldn't be treated as one.

> `NULL` is not `0`, and `0` is not an error.

We built each of these layers because the one before it wasn't enough. Fixing the tool response didn't help if the agent misread it. Fixing the agent didn't help if the pipeline ignored what it said. The pattern only worked once the distinction carried all the way through.

## What we learned

1. **Most agent errors aren't errors at all**: they're valid empty responses being misclassified.
2. **Auth failures should be session-scoped.** Once authentication breaks, every subsequent tool call will also break. Block them all immediately instead of wasting tokens.
3. **"Not found" is a finding, not a problem.** An agent that confidently says "this doesn't exist" is more valuable than one that keeps searching forever.
4. **Structured signals beat natural language parsing.** Don't try to regex-match error messages. Return typed, structured classifications from every tool.
5. **Guard at the orchestration layer, not the LLM layer.** The LLM shouldn't be responsible for detecting and classifying tool errors. Build deterministic guard logic around it.

When a tool returns nothing, does your system know which nothing it got?

**Empty is not broken. Not found is not failed.**

## Kind
article

## Source
Engineering blog

## URL
https://daltonhq.ai/blog/three-meanings-of-nothing

## Date
2026-04-05

## Media
/writing/three-meanings-of-nothing.jpg

## Summary
An agent that treats every empty tool response as the same condition will retry things that already answered, report errors on queries that worked, and chase resources that never existed. Three states, three different next steps.
