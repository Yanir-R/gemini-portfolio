# 22.7 million tokens. One session. $340 burned.

How does Cursor justify this?

As a Pro subscriber tracking every token, I've found architectural failures that should alarm every user.

**⚠️ Cache disaster: 640:1 read ratio**

- Input: 2,873 tokens
- Cache reads: 1,789,210 tokens
- Efficiency: 0.16%

**🔄 Model chaos: random switching between 4 models**

Each switch means complete re-contextualization. Zero user control.

**💰 Unit economics**

- This session at API rates: $340
- GitHub Copilot equivalent: $0.60
- Efficiency delta: 575x

For context: GPT-4 trained on 8K contexts. Cursor burned 2,837x that in one session.

What's your worst single-session token count?

## Kind
post

## Source
LinkedIn

## URL
https://www.linkedin.com/feed/update/urn:li:activity:7399042810672218112/

## Date
2025-11-25

## Media
/writing/cursor-tokens.png

## Summary
One Cursor session, 22.7M tokens, a 640:1 cache read ratio and $340 at API rates. What the numbers say about re-contextualisation cost.
