"""StreamVox Live - Natural Language Processing (NLP) Thai Speech Normalization Pipeline.

This module provides high-precision speech text normalization tailored for Thai
Text-to-Speech (TTS) models. It performs Grapheme-to-Phoneme (G2P) slang expansion,
English loanword transliteration, laugh number condensation, and acoustic pacing
using PyThaiNLP's newmm dictionary-based word tokenization engine.
"""

from __future__ import annotations

import functools
import re
from typing import Final

from pythainlp.corpus import thai_words
from pythainlp.tokenize import word_tokenize
from pythainlp.util import dict_trie

# ---------------------------------------------------------------------------
# Lexical Dictionaries & Mapping Tables
# ---------------------------------------------------------------------------

# Common Thai chat slang, contractions, and phonetic misspellings
SLANG_CONTRACTIONS: Final[dict[str, str]] = {
    "จิงดิ": "จริงดิ",
    "จิงปะ": "จริงหรือเปล่า",
    "จิงป้ะ": "จริงหรือเปล่า",
    "จิง": "จริง",
    "กุ": "กู",
    "มุง": "มึง",
    "คับ": "ครับ",
    "งับ": "ครับ",
    "ฮะ": "ครับ",
    "ป่าว": "หรือเปล่า",
    "ป้ะ": "หรือเปล่า",
    "ขรรม": "ขำ",
    "ม่าย": "ไม่",
    "เปน": "เป็น",
    "เหน": "เห็น",
}

# English loanwords frequently used in live streaming environments
ENGLISH_LOANWORDS: Final[dict[str, str]] = {
    "streamer": "สตรีมเมอร์",
    "streaming": "สตรีมมิ่ง",
    "stream": "สตรีม",
    "follower": "ฟอลโลเวอร์",
    "following": "ฟอล",
    "follow": "ฟอล",
    "subscribe": "ซับ",
    "sub": "ซับ",
    "games": "เกม",
    "game": "เกม",
    "gifts": "กิฟต์",
    "gift": "กิฟต์",
    "clips": "คลิป",
    "clip": "คลิป",
    "live": "ไลฟ์",
    "rov": "อาร์โอวี",
    "pro": "โปร",
    "pk": "พีเค",
}

# Major clause particles and conjunctions where acoustic breathing space is introduced
CLAUSE_CONJUNCTIONS: Final[set[str]] = {
    "และ",
    "หรือ",
    "แต่",
}

# Loanword phonetic forms that benefit from acoustic spacing
TRANSLITERATED_PACING_WORDS: Final[set[str]] = set(ENGLISH_LOANWORDS.values()).union({
    "เกมส์",
})

# ---------------------------------------------------------------------------
# Precompiled Regular Expressions & Custom Tokenization Trie
# ---------------------------------------------------------------------------

# Laugh patterns: consecutive 5s (e.g. 555, 55555, 555+) bounded by non-digits
_LAUGH_PATTERN: Final[re.Pattern[str]] = re.compile(r"(?<!\d)5{2,}\+*(?!\d)")

# Consecutive character repetition reduction (3 or more identical characters condensed)
_EXCESSIVE_REPEAT_PATTERN: Final[re.Pattern[str]] = re.compile(r"([ก-ฮะ-์a-zA-Z])\1{2,}")

# English loanword regex matching case-insensitively at Latin boundaries
_LOANWORD_KEYS_SORTED: list[str] = sorted(
    ENGLISH_LOANWORDS.keys(), key=len, reverse=True
)
_LOANWORD_PATTERN: Final[re.Pattern[str]] = re.compile(
    r"(?i)(?<![a-zA-Z])("
    + "|".join(re.escape(k) for k in _LOANWORD_KEYS_SORTED)
    + r")(?![a-zA-Z])"
)

# Collapsing multiple whitespace sequences
_WHITESPACE_COLLAPSE_PATTERN: Final[re.Pattern[str]] = re.compile(r"\s+")

# Build custom PyThaiNLP Trie incorporating standard Thai vocabulary and custom slang
_COMBINED_VOCABULARY: set[str] = set(thai_words()).union(
    SLANG_CONTRACTIONS.keys(),
    TRANSLITERATED_PACING_WORDS,
    {"ห้าห้าห้า"},
)
_CUSTOM_TRIE: Final = dict_trie(_COMBINED_VOCABULARY)


# ---------------------------------------------------------------------------
# Normalization Pipeline Core
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=4096)
def normalize_thai_speech(text: str) -> str:
    """Normalize raw TikTok comments into phonetically accurate speech for TTS models.

    This function utilizes a multi-stage Natural Language Processing (NLP) pipeline
    with Least Recently Used (LRU) caching to transform raw live chat text into
    natural-sounding Thai speech suitable for Text-to-Speech (TTS) synthesis.

    Pipeline stages:
    1. Validation: Fast-path for empty or whitespace-only input strings.
    2. Number & Laugh Normalization: Converts '555', '5555+', etc., into 'ห้าห้าห้า'.
    3. Repetition Condensation: Suppresses excessive character repetition (e.g. 'มากกกก' -> 'มาก').
    4. English Loanword Transliteration: Case-insensitive replacement of streamer terms (e.g. 'Live' -> 'ไลฟ์').
    5. Tokenization & Slang G2P Expansion: Uses PyThaiNLP `newmm` tokenization with custom dictionary Trie.
    6. Acoustic Pacing Heuristic: Avoids robotic word-by-word space insertion while placing natural pauses
       around conjunctions ('และ', 'หรือ', 'แต่') and loanword phonetics.

    Args:
        text: Raw input string from live stream chat comments or user messages.

    Returns:
        Phonetically normalized string ready for speech synthesis.
    """
    if not text or not text.strip():
        return ""

    normalized = text.strip()

    # Stage 1: Laugh number normalization (e.g. 555, 55555, 555+ -> ห้าห้าห้า)
    normalized = _LAUGH_PATTERN.sub(" ห้าห้าห้า ", normalized)

    # Stage 2: Excessive character repetition reduction
    normalized = _EXCESSIVE_REPEAT_PATTERN.sub(r"\1", normalized)

    # Stage 3: English loanwords transliteration with spacing padding
    normalized = _LOANWORD_PATTERN.sub(
        lambda m: f" {ENGLISH_LOANWORDS[m.group(0).lower()]} ",
        normalized,
    )

    # Stage 4: Word tokenization via PyThaiNLP newmm engine with custom Trie
    tokens: list[str] = word_tokenize(
        normalized,
        engine="newmm",
        custom_dict=_CUSTOM_TRIE,
        keep_whitespace=True,
    )

    # Stage 5: Grapheme-to-Phoneme (G2P) slang replacement and acoustic pacing assembly
    output_chunks: list[str] = []
    all_pacing_triggers = CLAUSE_CONJUNCTIONS.union(TRANSLITERATED_PACING_WORDS)

    for token in tokens:
        # Check slang / contraction substitution
        substituted = SLANG_CONTRACTIONS.get(token, token)

        # Apply acoustic pacing spacing around conjunctions and major loanwords
        if substituted in all_pacing_triggers:
            output_chunks.append(f" {substituted} ")
        else:
            output_chunks.append(substituted)

    # Join chunks and collapse multiple spaces into clean single spaces
    result = "".join(output_chunks)
    result = _WHITESPACE_COLLAPSE_PATTERN.sub(" ", result).strip()

    return result
