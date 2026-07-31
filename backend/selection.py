"""Choosing which of Yanir's documents a question actually needs.

Until now every chat request carried the whole corpus. That was defensible on
cost - ten documents against a context window measured in hundreds of thousands
of tokens - but it made the site unable to say anything true about *this*
answer. A panel reporting "10 documents" under every reply reports a property of
the deployment, not of the reply, and phrasing it as "from" made an attribution
claim nothing here could back.

So this module answers one question: given what the visitor asked, which
documents belong in the request? Three rules shape it, and each comes from
something already decided in this project or in Yanir's own published work.

**Deterministic, not a model call.** An LLM framing pass would be a second
Gemini call per message, and the free tier grants twenty requests a day per
model - it would halve the number of visitors the site can serve. This is the
"mostly deterministic routing, model only when ambiguous" split, and here the
deterministic half is sufficient.

**The signal comes from the corpus, not from a list somebody maintains.** A
hand-written map of keyword to document is wrong the day a document is added and
nobody notices. Term weights are derived from the documents themselves: a word
appearing in every document distinguishes nothing and scores zero, while a word
appearing in one is decisive. "Build" is worthless and "Moonsite" is conclusive,
and neither fact was written down by hand.

**It fails open.** When no term carries signal the whole corpus is sent, exactly
as before. For a chat whose entire claim is that it answers from its sources,
silently omitting the document that held the answer is far worse than a larger
prompt - the visitor gets "I haven't written about that" about something Yanir
has written about, which is indistinguishable from an honest decline.

That last case is why the result is typed rather than being a bare corpus.
Yanir's own writing on tool-calling makes the point that "nothing" is several
different conditions wearing one face, and collapsing them is the bug. The two
that matter here are NARROWED ("we had reason to choose these") and UNFOCUSED
("we had no basis to exclude anything, so we excluded nothing"), and the site
must never show them as the same thing.
"""

from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass
from typing import Dict, FrozenSet, Set, Tuple

from context import Knowledge, Section

logger = logging.getLogger(__name__)

# A selected set has to clear this share of the best-scoring document. A single
# rare word shared with an otherwise unrelated post should not drag it in, and a
# document scoring close to the best is plausibly about the same thing.
SELECTION_RATIO = 0.5

# Words shorter than this are dropped before scoring. Deliberately linguistic
# rather than domain-specific: "AI", "Go" and "k8s" are real terms, but so are
# "at", "my" and "do", and the weighting below already reduces a term that
# appears everywhere to nothing.
MIN_TERM_LENGTH = 3

# Ordinary English that carries no topic.
#
# Everything here is a *closed grammatical class* - articles, pronouns,
# prepositions, auxiliaries, quantifiers, and the number words below. That
# distinction is the point, and it is the same one that fixed the contact-flow
# trigger: a list of technical nouns is open-ended and starts rotting the day it
# is written, while the function words of English are finite and are not going
# to grow. No word appears here because of what this corpus happens to contain.
#
# The number words earn their place the hard way. "And what about the second
# ONE?" selected a single post, because "one" appears in exactly one document
# ("22.7 million tokens in one session") and weighting by rarity cannot tell a
# proper noun from a common word that happens to be rare here. Across ten
# documents that is a real limit of the measure, and the answer is to keep
# grammar out of the scoring rather than to tune the threshold around it.
_STOPWORDS: FrozenSet[str] = frozenset(
    """
    the and for you your yours are was were what when where which who whom why how
    with without within into onto over under between about across after before
    during while since until through against among along around because though
    although unless whether both each every all any some most more less few many
    much other another such same own just only also even still yet ever never
    always sometimes often rarely usually really quite very too enough back down
    out off  can could should would will shall may might must not yes his her
    their there here they them then than this that these those have has had did
    does done been being from tell told say said get got give given know known
    like want need make made use used using work works worked thing things stuff

    one two three four five six seven eight nine ten
    first second third fourth fifth last next previous former latter
    """.split()
)

_TERM_RE = re.compile(r"[a-z0-9][a-z0-9+.#-]*")


def _terms(text: str) -> Set[str]:
    """Distinct topic-bearing words in `text`.

    A set rather than a count: whether a document mentions a term ten times or
    once says little at this corpus size, and repetition would let one long
    document dominate every question.
    """
    return {
        token
        for token in _TERM_RE.findall(text.lower())
        if len(token) >= MIN_TERM_LENGTH and token not in _STOPWORDS
    }


@dataclass(frozen=True)
class _Index:
    """Per-document terms and the weight of each term across the corpus."""

    terms: Tuple[Tuple[str, FrozenSet[str]], ...]
    weights: Dict[str, float]


# (sources, index) for the corpus this was last built from. The corpus is itself
# cached against file mtimes, so this rebuilds only when that one does.
_index_cache: Tuple[Tuple[str, ...], _Index] | None = None


def _build_index(knowledge: Knowledge) -> _Index:
    """Weighs every term by how many documents it fails to distinguish.

    A term in all ten documents scores zero - it cannot separate them, so
    matching it is not evidence of anything. A term in one scores highest. This
    is the whole reason no keyword list is needed: the corpus states its own
    distinctive vocabulary, and restates it whenever a document is added.
    """
    per_section = tuple(
        (section.label, frozenset(_terms(f"{section.label}\n{section.body}")))
        for section in knowledge.sections
    )

    total = len(per_section)
    document_count: Dict[str, int] = {}
    for _, terms in per_section:
        for term in terms:
            document_count[term] = document_count.get(term, 0) + 1

    # log(N/df): zero when a term is everywhere, largest when it is unique.
    weights = {term: math.log(total / count) for term, count in document_count.items()}
    return _Index(terms=per_section, weights=weights)


def _index_for(knowledge: Knowledge) -> _Index:
    global _index_cache

    sources = knowledge.sources
    if _index_cache is not None and _index_cache[0] == sources:
        return _index_cache[1]

    index = _build_index(knowledge)
    _index_cache = (sources, index)
    return index


# What the selection concluded. Three states rather than a bare corpus, because
# "we chose these" and "we could not tell, so we sent everything" are different
# facts about an answer, and the site reports them differently.
NARROWED = "narrowed"
UNFOCUSED = "unfocused"
NO_CORPUS = "no_corpus"


@dataclass(frozen=True)
class Selection:
    """Which documents a question gets, and why that set."""

    knowledge: Knowledge
    outcome: str
    available: int

    @property
    def narrowed(self) -> bool:
        return self.outcome == NARROWED


def select(question: str, knowledge: Knowledge) -> Selection:
    """Picks the documents worth sending for `question`.

    Yanir's own notes are always included. The chat answers in his first person
    about him, so his profile is not a topic that competes with the others - it
    is the ground every answer stands on, and a question that turns out to be
    about him after all must never find it missing.
    """
    if knowledge.is_empty:
        return Selection(knowledge=knowledge, outcome=NO_CORPUS, available=0)

    available = len(knowledge.sections)
    index = _index_for(knowledge)
    asked = _terms(question)

    scores: Dict[str, float] = {}
    for label, terms in index.terms:
        scores[label] = sum(index.weights.get(term, 0.0) for term in asked & terms)

    best = max(scores.values(), default=0.0)

    # Nothing the visitor asked distinguishes one document from another: a
    # greeting, a follow-up like "and the second one?", or a subject this corpus
    # simply has no vocabulary for. There is no basis on which to exclude
    # anything, so nothing is excluded.
    if best <= 0:
        logger.info("Selection: no distinguishing terms, sending all %d documents", available)
        return Selection(knowledge=knowledge, outcome=UNFOCUSED, available=available)

    threshold = best * SELECTION_RATIO
    chosen = tuple(
        section
        for section in knowledge.sections
        if section.is_profile or scores[section.label] >= threshold
    )

    if len(chosen) == available:
        return Selection(knowledge=knowledge, outcome=UNFOCUSED, available=available)

    selected = Knowledge(sections=chosen)
    logger.info(
        "Selection: %d of %d documents (%s)",
        len(chosen),
        available,
        ", ".join(s.label for s in chosen),
    )
    return Selection(knowledge=selected, outcome=NARROWED, available=available)


def _reset_cache() -> None:
    """Drops the term index. For tests that rebuild the corpus underneath it."""
    global _index_cache
    _index_cache = None
