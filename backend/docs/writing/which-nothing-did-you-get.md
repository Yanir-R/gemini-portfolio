# "Nothing found."

Oh really? Nothing? The tool crashed, the data is empty, *and* the thing doesn't exist — all at the same time? That's impressive.

That's like telling someone "I didn't find your car" without mentioning the parking lot was on fire.

Three completely different realities. One lazy response. And the AI just nods and moves on, like a dog chasing a ball you only pretended to throw. Running with full confidence in absolutely the wrong direction.

That's what was happening in our system. A tool call comes back empty and the agent just... keeps going. Retrying calls that already gave it the answer. Reporting errors on queries that worked perfectly. Wandering through every data source chasing something that was never there.

Every empty response looked identical, but some meant "this broke," some meant "there's just no data," and some meant "the thing you're looking for never existed."

Once we pulled these three apart and handled each one differently, the false failures disappeared. The agent stopped chasing ghosts and started knowing.

`NULL` is not `0`, and `0` is not an error. We broke down the full pattern and how we fixed it layer by layer.

## Kind
post

## Source
LinkedIn

## URL
https://www.linkedin.com/feed/update/urn:li:activity:7446855414308069376/

## Date
2026-04-06

## Media
/writing/three-nothings-card.jpg

## Summary
The short version of the three-meanings-of-nothing piece: one empty response, three different root causes, and an agent that treats them as one will chase ghosts.

## Related
three-meanings-of-nothing
