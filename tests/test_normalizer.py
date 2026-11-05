"""Tests for TextNormalizer, phonetic normalization, and profanity moderation."""
import json
from pathlib import Path
import pytest
from src.normalizer import TextNormalizer


def test_text_normalizer_rules(tmp_path: Path):
    """Test standard normalizer rules according to spec."""
    blacklist = tmp_path / "blacklist.txt"
    blacklist.write_text("คำต้องห้าม1\nคำต้องห้าม2\n", encoding="utf-8")

    phonetics = tmp_path / "phonetics.json"
    phonetics.write_text(json.dumps({"GG": "กู๊ดเกม", "ez": "อีซี่"}), encoding="utf-8")

    normalizer = TextNormalizer(blacklist_path=blacklist, phonetics_path=phonetics, max_length=50)

    # Review Focus 1: Empty string after cleaning emojis/symbols
    assert normalizer.clean_comment("😊😊😊 ✨✨") is None

    # 555+ normalization and elongation compression
    assert normalizer.clean_comment("ขำมากกกกก 55555+++") == "ขำมากก ฮ่าๆๆ"

    # Stripping URL & Mentions
    assert normalizer.clean_comment("ดูคลิปที่ https://tiktok.com/@user นะครับ @test") == "ดูคลิปที่ นะครับ"

    # Phonetic mapping
    assert normalizer.clean_comment("เล่นตาเมื่อกี้ GG ez มาก") == "เล่นตาเมื่อกี้ กู๊ดเกม อีซี่ มาก"

    # Profanity filtering returns None
    assert normalizer.clean_comment("ทำไมพูด คำต้องห้าม1 ละครับ") is None

    # Username cleaning (strips decorative fonts/symbols)
    assert normalizer.clean_username("★꧁Somchai_Pro꧂★") == "Somchai Pro"

    # Gift formatting
    msg = normalizer.format_gift_message("Somchai", "Rose", 5)
    assert msg == "ขอบคุณ Somchai สำหรับ Rose จำนวน 5 ชิ้น"


def test_clean_comment_edge_cases(tmp_path: Path):
    """Test edge cases such as empty input, only URLs, and length truncation."""
    blacklist = tmp_path / "blacklist.txt"
    blacklist.write_text("badword\n", encoding="utf-8")
    phonetics = tmp_path / "phonetics.json"
    phonetics.write_text("{}", encoding="utf-8")

    normalizer = TextNormalizer(blacklist_path=blacklist, phonetics_path=phonetics, max_length=20)

    # Empty and whitespace inputs
    assert normalizer.clean_comment("") is None
    assert normalizer.clean_comment("   ") is None

    # Only URLs or mentions should result in None
    assert normalizer.clean_comment("https://example.com/video") is None
    assert normalizer.clean_comment("@streamer @user123") is None

    # Truncation to max_length
    long_text = "ก" * 30
    cleaned = normalizer.clean_comment(long_text)
    assert cleaned == "กก"
    assert len(cleaned) <= normalizer.max_length

    # Diverse text exceeding max_length
    long_diverse_text = "สวัสดีครับทุกท่านยินดีต้อนรับสู่ไลฟ์สดของเราครับ"
    cleaned_diverse = normalizer.clean_comment(long_diverse_text)
    assert cleaned_diverse is not None
    assert len(cleaned_diverse) <= 20

    # Case-insensitive ASCII profanity check with word boundary
    assert normalizer.clean_comment("You are a badword person") is None
    assert normalizer.clean_comment("BADWORD alert") is None


def test_clean_username_variations(tmp_path: Path):
    """Test cleaning usernames with decorative fonts, symbols, emojis, and Thai script."""
    bl = tmp_path / "bl.txt"
    bl.write_text("", encoding="utf-8")
    ph = tmp_path / "ph.json"
    ph.write_text("{}", encoding="utf-8")

    normalizer = TextNormalizer(blacklist_path=bl, phonetics_path=ph)

    assert normalizer.clean_username("★꧁สมชาย_สายลุย꧂★") == "สมชาย สายลุย"
    assert normalizer.clean_username("   User___Name   ") == "User Name"
    assert normalizer.clean_username("✨🎮Gamer_Girl99🎮✨") == "Gamer Girl99"
    assert normalizer.clean_username("😊😊😊") == ""


def test_phonetic_replacement_case_insensitivity(tmp_path: Path):
    """Test case-insensitive phonetic replacements."""
    bl = tmp_path / "bl.txt"
    bl.write_text("", encoding="utf-8")
    ph = tmp_path / "ph.json"
    ph.write_text(json.dumps({"AFK": "เอเอฟเค", "gg": "กู๊ดเกม"}), encoding="utf-8")

    normalizer = TextNormalizer(blacklist_path=bl, phonetics_path=ph)
    assert normalizer.clean_comment("เขา afk ไปแล้ว GG") == "เขา เอเอฟเค ไปแล้ว กู๊ดเกม"


def test_default_data_files_loading():
    """Test that TextNormalizer loads default data files if paths are omitted."""
    normalizer = TextNormalizer()
    assert isinstance(normalizer.blacklist, set)
    assert isinstance(normalizer.phonetics, dict)


def test_format_gift_message_whitespace_fallback():
    """Test gift formatting fallback when username or gift name is whitespace or None."""
    normalizer = TextNormalizer()
    assert normalizer.format_gift_message("   ", "   ", 1) == "ขอบคุณ ผู้ชม สำหรับ ของขวัญ จำนวน 1 ชิ้น"
    assert normalizer.format_gift_message("", "", 2) == "ขอบคุณ ผู้ชม สำหรับ ของขวัญ จำนวน 2 ชิ้น"
    assert normalizer.format_gift_message(None, None, 3) == "ขอบคุณ ผู้ชม สำหรับ ของขวัญ จำนวน 3 ชิ้น"


def test_default_blacklist_no_false_positives():
    """Test that default blacklist does not block common words like Google or distant."""
    normalizer = TextNormalizer()
    # Should NOT be blocked:
    assert normalizer.clean_comment("ค้นหาในกูเกิลสิครับ") == "ค้นหาในกูเกิลสิครับ"
    assert normalizer.clean_comment("อยู่ห่างไกลกันมาก") == "อยู่ห่างไกลกันมาก"
    # SHOULD be blocked:
    assert normalizer.clean_comment("อย่ามาด่ากูนะ") is None
    assert normalizer.clean_comment("ไอ้ห่าเอ๊ย") is None

