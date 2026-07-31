"""Which documents a question gets, and the ways that can go quietly wrong.

Selection is a silent mechanism by construction. Dropping the one document that
held the answer produces no error: the model simply answers "I haven't written
about that", which is exactly what an honest decline looks like. Nothing in the
golden question set would notice, because every case would still pass.

So these tests pin the two directions separately. The first is that narrowing
happens at all - without it the site is back to claiming ten documents under
every answer. The second, and the one worth more, is that narrowing never
removes the document a question was about.

Run from the backend directory: `pytest`
"""

import pytest

import context
import selection
from context import Knowledge, Section


@pytest.fixture(autouse=True)
def fresh_index():
    """The term weights are cached against the corpus they were built from."""
    selection._reset_cache()
    yield
    selection._reset_cache()


def _corpus(*pairs) -> Knowledge:
    return Knowledge(sections=tuple(Section(label=label, body=body) for label, body in pairs))


SAMPLE = (
    ("Profile / about-me", "I build AI products end to end and then try to break them."),
    ("Profile / resume", "Moonsite, full stack developer, sports betting platform, React."),
    ("Project / ReelSensei", "A gaming highlights tool, paused, built with Python."),
    ("Writing / Cursor tokens", "Cursor burned 22.7 million tokens in one session."),
    ("Writing / Nothing found", "Agent tool calls returning nothing, and the three meanings."),
)


# --- narrowing happens ---------------------------------------------------------


def test_a_question_about_one_post_does_not_drag_in_the_others():
    chosen = selection.select("What did you say about Cursor tokens?", _corpus(*SAMPLE))

    labels = set(chosen.knowledge.sources)

    assert chosen.outcome == selection.NARROWED
    assert "Writing / Cursor tokens" in labels
    assert "Writing / Nothing found" not in labels


def test_a_question_answered_by_the_resume_pulls_in_no_posts():
    """The complaint that started this: asking what he built at Moonsite must
    not report posts that have nothing to do with it."""
    chosen = selection.select("What did you build at Moonsite?", _corpus(*SAMPLE))

    assert chosen.outcome == selection.NARROWED
    assert not any(label.startswith("Writing / ") for label in chosen.knowledge.sources)


# --- narrowing never costs the answer -------------------------------------------


def test_profile_documents_are_never_dropped():
    """`_build` already refuses a corpus with no profile. Selection must not
    reintroduce that hole from the other side: the chat answers as Yanir, so his
    own notes are the ground every answer stands on, not a competing topic."""
    for question in (
        "What did you say about Cursor tokens?",
        "Tell me about ReelSensei",
        "asdfghjkl",
        "hi",
    ):
        chosen = selection.select(question, _corpus(*SAMPLE))
        kept = [s for s in chosen.knowledge.sections if s.is_profile]

        assert len(kept) == 2, f"profile dropped for {question!r}"


def test_a_subject_the_corpus_has_no_vocabulary_for_sends_everything():
    """No document is distinguished, so none is excluded - the failure that
    matters is omitting the one that held the answer."""
    chosen = selection.select("quantum chromodynamics", _corpus(*SAMPLE))

    assert chosen.outcome == selection.UNFOCUSED
    assert len(chosen.knowledge.sections) == len(SAMPLE)


# --- a greeting is not a question ----------------------------------------------


def test_a_greeting_does_not_load_the_whole_corpus():
    """Ten documents to answer "hi" is the most expensive reply on the site for
    the exchange that needs it least. Nothing is being asked, so nothing beyond
    his own notes is fetched."""
    for greeting in ("hi", "hello there", "hey!", "thanks"):
        chosen = selection.select(greeting, _corpus(*SAMPLE))

        assert chosen.outcome == selection.CONVERSATIONAL, greeting
        assert all(s.is_profile for s in chosen.knowledge.sections), greeting


def test_a_greeting_still_gets_a_corpus_to_answer_from():
    """get_gemini_response refuses to answer without one, so an empty selection
    would greet a visitor with "I can't reach my notes"."""
    chosen = selection.select("hi", _corpus(*SAMPLE))

    assert not chosen.knowledge.is_empty


def test_a_follow_up_is_framed_by_what_was_being_discussed():
    """"And what about the second one?" is a real question whose subject lives
    in the previous turns rather than in this message. Reading it as a greeting
    would strip away exactly the documents it needs."""
    chosen = selection.select(
        "and what about the second one?",
        _corpus(*SAMPLE),
        history=["What did you say about Cursor tokens?", "Cursor burned 22.7 million."],
    )

    assert chosen.outcome == selection.NARROWED
    assert "Writing / Cursor tokens" in chosen.knowledge.sources


def test_a_follow_up_with_no_conversation_behind_it_is_not_treated_as_one():
    """There is nothing to follow up on, so it falls back to the cheap path
    rather than inventing a subject for it."""
    chosen = selection.select("and what about the second one?", _corpus(*SAMPLE))

    assert chosen.outcome == selection.CONVERSATIONAL


def test_framing_reads_only_the_turns_the_model_is_replayed():
    """The search must not reach for a subject the model itself cannot see, or
    it would select documents to answer a question the model has forgotten."""
    stale = ["Tell me about ReelSensei"]
    recent = ["What did you say about Cursor tokens?"] * selection.FRAMING_TURNS

    chosen = selection.select("and the other one?", _corpus(*SAMPLE), history=stale + recent)

    assert "Project / ReelSensei" not in chosen.knowledge.sources


def test_a_term_appearing_in_every_document_selects_nothing():
    """A word common to the whole corpus distinguishes nothing, so matching it
    is not evidence. This is what removes the need for a keyword list: the
    corpus states its own distinctive vocabulary."""
    corpus = _corpus(
        ("Profile / about-me", "python everywhere"),
        ("Writing / one", "python everywhere"),
        ("Writing / two", "python everywhere"),
    )

    chosen = selection.select("python", corpus)

    assert chosen.outcome == selection.UNFOCUSED


# A question, and the document that must survive selection for it to be
# answerable. This is the guard the golden question set cannot be: a routing
# miss makes the chat decline something that *is* written down, which reads
# exactly like an honest decline, so every eval case still passes while the
# site quietly gets worse. Run against the real corpus and costing no quota,
# this is the cheapest place to catch it.
#
# Add a row whenever a document is added. A document nothing routes to is a
# document the chat can only reach by accident.
ROUTING = (
    ("How does this portfolio site work?", "AI Chat Portfolio"),
    ("What is ReelSensei?", "ReelSensei"),
    ("What did you write about the advisor tool?", "advisor"),
    ("What are the three meanings of nothing?", "Three Meanings"),
    ("Why did an agent return nothing found?", "Nothing found"),
    ("Tell me about agent tool calls that return nothing", "Nothing found"),
    ("Tell me about crashing the Claude CLI", "crashed Claude"),
    ("What do you know about Bun?", "crashed Claude"),
    ("What happened with 22.7 million tokens?", "22.7 million"),
    ("How do you handle token burn?", "22.7 million"),
    ("Explain callbacks and promises", "callbacks"),
    ("What is your experience with promises?", "callbacks"),
    ("What did you build at Moonsite?", "resume"),
    ("What's your preferred tech stack?", "resume"),
)


@pytest.mark.parametrize("question,expected", ROUTING)
def test_a_question_reaches_the_document_that_answers_it(question, expected):
    chosen = selection.select(question, context.get_knowledge())

    reached = [s for s in chosen.knowledge.sources if expected.lower() in s.lower()]

    assert reached, (
        f"{question!r} no longer reaches {expected!r}. The chat will decline a "
        f"question the corpus can answer, which reads as an honest decline."
    )


def test_every_document_is_reachable_by_some_question():
    """A document nothing routes to is one the chat reaches only by accident."""
    knowledge = context.get_knowledge()
    reachable = set()
    for question, _ in ROUTING:
        reachable.update(selection.select(question, knowledge).knowledge.sources)

    unreachable = [
        label
        for label in knowledge.sources
        if label not in reachable and not label.startswith("Profile / ")
    ]

    assert not unreachable, f"no question in ROUTING reaches: {unreachable}"


def test_a_word_and_its_inflections_reach_the_same_document():
    """Exact matching missed a post titled "$340 burned" for a question about
    token burn, and scored the question's most distinctive word against the
    wrong document. Plurals fail the same way whenever somebody types one."""
    assert selection._stem("burned") == selection._stem("burn")
    assert selection._stem("tokens") == selection._stem("token")
    assert selection._stem("meanings") == selection._stem("meaning") == selection._stem("mean")
    # Short words are left alone: reducing "uses" to "us" costs more than the
    # match is worth.
    assert selection._stem("uses") == "uses"


def test_a_dominant_match_does_not_suppress_a_relevant_one():
    """The threshold is a share of the question, not of the winning document.
    Measured against the winner, a document matching every term raises the bar
    for everything else - which excluded a post whose title *was* the query."""
    knowledge = context.get_knowledge()

    chosen = selection.select("Why did an agent return nothing found?", knowledge)

    labels = " | ".join(chosen.knowledge.sources)
    assert "Nothing found" in labels
    assert "Three Meanings" in labels, "the strongest match must survive too"


# --- the result is typed, not a bare corpus ------------------------------------


def test_an_empty_corpus_is_reported_as_its_own_condition():
    """Three meanings of nothing: no corpus at all is not the same as "nothing
    matched", and neither is the same as a confident narrow set."""
    chosen = selection.select("anything", context.EMPTY)

    assert chosen.outcome == selection.NO_CORPUS
    assert chosen.available == 0


def test_available_reports_the_whole_corpus_even_when_narrowed():
    """The rail needs both halves to say "3 of 10" honestly."""
    chosen = selection.select("What did you say about Cursor tokens?", _corpus(*SAMPLE))

    assert chosen.available == len(SAMPLE)
    assert len(chosen.knowledge.sections) < chosen.available


def test_narrowing_reduces_what_the_request_pays_for():
    corpus = _corpus(*SAMPLE)
    chosen = selection.select("What did you say about Cursor tokens?", corpus)

    assert chosen.knowledge.approx_tokens <= corpus.approx_tokens
