"""Phonetic normalization, regex rules, and profanity moderation engine.

This module provides text cleaning, emoji stripping, Thai slang normalization
(such as '555+' to 'ฮ่าๆๆ'), character elongation compression, URL and mention
removal, custom phonetic substitutions, username sanitization, and profanity
moderation for TikTok Live Text-to-Speech (TTS) Bot.
"""

import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Set, Tuple, Union


class TextNormalizer:
    """Normalizes and moderates text comments and usernames for speech synthesis.

    Attributes:
        blacklist_path: File system path to the text file containing blacklisted words.
        phonetics_path: File system path to the JSON file containing phonetic mappings.
        max_length: Maximum allowed character length for incoming comments.
        blacklist: Set of banned words/phrases for profanity moderation.
        phonetics: Dictionary of slang/acronym to Thai pronunciation phonetic mappings.
    """

    # Characters allowed in cleaned usernames: Thai, English letters, and digits
    _RE_USERNAME_CLEAN = re.compile(r"[^a-zA-Z0-9\u0e00-\u0e7f]+")

    # Multiple contiguous whitespace characters
    _RE_WHITESPACE = re.compile(r"\s+")

    # Thai laughter slang: e.g. 555, 55555, 555+, 55555+++
    _RE_555_PLUS = re.compile(r"([5]{3,})([+]*)")

    # Character elongation: 3 or more repeating consecutive characters
    _RE_ELONGATION = re.compile(r"(.)\1{2,}")

    # URLs (HTTP/HTTPS)
    _RE_URL = re.compile(r"https?://\S+")

    # Social media mentions: e.g. @username
    _RE_MENTION = re.compile(r"@\w+")

    # Unicode emojis, pictographs, decorative symbols, and dingbats
    _RE_EMOJI_AND_SYMBOLS = re.compile(
        r"[\U00010000-\U0010ffff"  # Supplemental symbols, pictographs, emoticons
        r"\u2600-\u27bf"          # Misc symbols, dingbats
        r"\u2300-\u23ff"          # Misc technical
        r"\u2b50-\u2b55"          # Stars & geometric shapes
        r"\ufe00-\ufe0f"          # Variation selectors
        r"\u200d\u200b\u200c"      # Zero-width joiner / non-joiner / space
        r"\u25a0-\u25ff"          # Geometric shapes
        r"\ua980-\ua9df"          # Javanese decorative ornaments (e.g. ꧁ ꧂)
        r"]+",
        flags=re.UNICODE,
    )

    def __init__(
        self,
        blacklist_path: Optional[Union[Path, str]] = None,
        phonetics_path: Optional[Union[Path, str]] = None,
        max_length: int = 80,
        config: Optional[Any] = None,
    ) -> None:
        """Initialize TextNormalizer with blacklist, phonetics, and configuration.

        Args:
            blacklist_path: Path to blacklist.txt file. If None, defaults to data/blacklist.txt.
            phonetics_path: Path to phonetics.json file. If None, defaults to data/phonetics.json.
            max_length: Maximum allowed character length for cleaned comments.
            config: Optional AppConfig object to inherit max_comment_length setting.
        """
        project_root = Path(__file__).resolve().parent.parent

        resolved_bl = (
            Path(blacklist_path)
            if blacklist_path is not None
            else project_root / "data" / "blacklist.txt"
        )
        resolved_ph = (
            Path(phonetics_path)
            if phonetics_path is not None
            else project_root / "data" / "phonetics.json"
        )

        if config is not None and hasattr(config, "max_comment_length"):
            self.max_length: int = config.max_comment_length
        else:
            self.max_length = max_length

        self.blacklist_path = resolved_bl
        self.phonetics_path = resolved_ph

        self.blacklist: Set[str] = self._load_blacklist(self.blacklist_path)
        self.phonetics: Dict[str, str] = self._load_phonetics(self.phonetics_path)

        # Precompile case-insensitive word-boundary phonetic rules sorted by length descending
        self._phonetic_rules: List[Tuple[re.Pattern, str]] = []
        self._compile_phonetic_rules()

    def _compile_phonetic_rules(self) -> None:
        """Compile regex pattern substitution rules sorted by descending key length.

        For ASCII alphanumeric phrases, word boundary markers (\\b) are enforced.
        For Non-ASCII scripts (such as Thai script without inter-word whitespace),
        direct substring patterns are compiled to ensure accurate phonetic matching.
        """
        rules = []
        for k, v in sorted(self.phonetics.items(), key=lambda item: len(item[0]), reverse=True):
            if not k:
                continue
            if k.isascii() and k.isalnum():
                pattern = re.compile(rf"\b{re.escape(k)}\b", re.IGNORECASE)
            else:
                pattern = re.compile(rf"{re.escape(k)}", re.IGNORECASE)
            rules.append((pattern, v))
        self._phonetic_rules = rules

    def add_phonetics(self, phonetics: Dict[str, str]) -> None:
        """Add or update phonetic substitution mappings and recompile regex rules.

        Rules are compiled with word boundaries and case-insensitivity, sorted
        in descending order of key length to prioritize longer matches.

        Args:
            phonetics: Dictionary of slang/acronym to pronunciation mappings.
        """
        if not phonetics:
            return
        for k, v in phonetics.items():
            if k:
                self.phonetics[str(k)] = str(v)
        self._compile_phonetic_rules()

    def add_blacklist(self, words: Union[List[str], Set[str], Tuple[str, ...]]) -> None:
        """Add prohibited words or phrases to the profanity moderation blacklist.

        Args:
            words: Collection of words to ban.
        """
        if not words:
            return
        for word in words:
            if word and isinstance(word, str):
                cleaned = word.strip().lower()
                if cleaned:
                    self.blacklist.add(cleaned)

    def _load_blacklist(self, path: Path) -> Set[str]:
        """Load profanity blacklist from file.

        Args:
            path: Path to text file with one word per line.

        Returns:
            Set of cleaned lowercase blacklisted strings.
        """
        words: Set[str] = set()
        if not path.is_file():
            return words

        try:
            content = path.read_text(encoding="utf-8")
            for line in content.splitlines():
                cleaned_line = line.strip()
                if cleaned_line and not cleaned_line.startswith("#"):
                    words.add(cleaned_line.lower())
        except Exception:
            # Fallback gracefully if reading fails
            pass
        return words

    def _load_phonetics(self, path: Path) -> Dict[str, str]:
        """Load phonetic substitutions mapping from JSON file.

        Args:
            path: Path to JSON mapping file.

        Returns:
            Dictionary of phonetic replacements.
        """
        if not path.is_file():
            return {}

        try:
            content = path.read_text(encoding="utf-8")
            data = json.loads(content)
            if isinstance(data, dict):
                return {str(k): str(v) for k, v in data.items()}
        except Exception:
            # Fallback gracefully if JSON parsing fails
            pass
        return {}

    def clean_username(self, nickname: str) -> str:
        """Sanitize streamer/viewer username by stripping decorative fonts and symbols.

        Preserves only Thai script, English alphanumeric characters, and single spaces.

        Args:
            nickname: Raw username or nickname string from TikTok event.

        Returns:
            Sanitized single-space separated username string.
        """
        if not nickname:
            return ""

        # Replace non-alphanumeric, non-Thai characters with space
        cleaned = self._RE_USERNAME_CLEAN.sub(" ", nickname)
        # Collapse multiple spaces and strip leading/trailing whitespace
        return self._RE_WHITESPACE.sub(" ", cleaned).strip()

    def clean_comment(self, text: str) -> Optional[str]:
        r"""Normalize, sanitize, and moderate incoming comment text for TTS speech.

        Execution pipeline:
        1. Replace phonetic slang words (case-insensitive word boundary).
        2. Normalize Thai laughter pattern r'([5]{3,})([+]*)' to 'ฮ่าๆๆ'.
        3. Compress elongated repeating characters r'(.)\1{2,}' to r'\1\1'.
        4. Strip URLs (r'https?://\S+') and mentions (@\w+).
        5. Filter profanity against blacklist; return None if banned word is found.
        6. Truncate text to max_length.
        7. If result is empty or whitespace-only, return None.

        Args:
            text: Raw comment text string from TikTokLive event.

        Returns:
            Cleaned and moderated string suitable for TTS, or None if rejected.
        """
        if not text or not isinstance(text, str):
            return None

        # 1. Phonetics mapping (Case-insensitive word boundary)
        for pattern, replacement in self._phonetic_rules:
            text = pattern.sub(replacement, text)

        # 2. Thai laughter slang normalization
        text = self._RE_555_PLUS.sub("ฮ่าๆๆ", text)

        # 3. Compress elongated characters (repeating >= 3 times down to 2)
        text = self._RE_ELONGATION.sub(r"\1\1", text)

        # 4. Strip URLs and @mentions
        text = self._RE_URL.sub("", text)
        text = self._RE_MENTION.sub("", text)

        # Clean emojis and decorative symbols
        text = self._RE_EMOJI_AND_SYMBOLS.sub("", text)

        # Normalize whitespace
        text = self._RE_WHITESPACE.sub(" ", text).strip()
        if not text:
            return None

        # 5. Profanity filtering against Blacklist
        text_lower = text.lower()
        for bad_word in self.blacklist:
            if not bad_word:
                continue
            # For pure ASCII alphanumeric words, enforce word boundary to avoid substring collisions
            if bad_word.isascii() and bad_word.isalnum():
                if re.search(rf"\b{re.escape(bad_word)}\b", text_lower):
                    return None
            else:
                if bad_word in text_lower:
                    return None

        # 6. Truncate length to max_length
        text = text[: self.max_length].strip()

        # 7. Final empty/whitespace check
        if not text:
            return None

        return text

    def format_gift_message(self, user_name: str, gift_name: str, repeat_count: int) -> str:
        """Format gift announcement message for speech synthesis.

        Template: "ขอบคุณ {user_name} สำหรับ {gift_name} จำนวน {repeat_count} ชิ้น"

        Args:
            user_name: Sanitized or display name of the gift sender.
            gift_name: Name of the TikTok gift (e.g. Rose, Heart, Finger Heart).
            repeat_count: Cumulative repeat / combo count of the gift streak.

        Returns:
            Standardized Thai announcement string for TTS narration.
        """
        clean_user = (user_name or "").strip() or "ผู้ชม"
        clean_gift = (gift_name or "").strip() or "ของขวัญ"
        return f"ขอบคุณ {clean_user} สำหรับ {clean_gift} จำนวน {repeat_count} ชิ้น"
