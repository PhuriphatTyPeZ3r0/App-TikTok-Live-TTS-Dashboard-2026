"""Tests for PyThaiNLP speech normalization pipeline."""
import pytest
from src.thai_normalizer import normalize_thai_speech


def test_empty_and_whitespace():
    """Verify empty and whitespace-only strings return empty strings safely."""
    assert normalize_thai_speech("") == ""
    assert normalize_thai_speech("   ") == ""
    assert normalize_thai_speech("\n\t") == ""


def test_slang_and_number_expansion():
    """Verify Thai slang, contractions, and laugh numbers expand properly."""
    # Laugh numbers
    assert "ห้าห้าห้า" in normalize_thai_speech("555")
    assert "ห้าห้าห้า" in normalize_thai_speech("55555")
    assert "ห้าห้าห้า" in normalize_thai_speech("555+")

    # Pronouns & vulgar contractions
    assert "กู" in normalize_thai_speech("กุ")
    assert "มึง" in normalize_thai_speech("มุง")

    # Common chat slang
    assert "จริงดิ" in normalize_thai_speech("จิงดิ")
    assert "จริงหรือเปล่า" in normalize_thai_speech("จิงปะ")
    assert "จริง" in normalize_thai_speech("จิง")

    # Politeness particles
    assert "ครับ" in normalize_thai_speech("คับ")
    assert "ครับ" in normalize_thai_speech("งับ")
    assert "ครับ" in normalize_thai_speech("ฮะ")

    # Question endings
    assert "หรือเปล่า" in normalize_thai_speech("ป่าว")
    assert "หรือเปล่า" in normalize_thai_speech("ป้ะ")

    # Misspellings & colloquial forms
    assert "ขำ" in normalize_thai_speech("ขรรม")
    assert "ไม่" in normalize_thai_speech("ม่าย")
    assert "เป็น" in normalize_thai_speech("เปน")
    assert "เห็น" in normalize_thai_speech("เหน")


def test_english_loanwords_transliteration():
    """Verify English loanwords are transliterated into Thai phonetics case-insensitively."""
    result = normalize_thai_speech("วันนี้ Live สตรีมเกมส์ rov")
    assert "ไลฟ์" in result
    assert "สตรีม" in result
    assert "อาร์โอวี" in result

    # Additional loanwords and case insensitivity
    res_pk = normalize_thai_speech("มา PK กันเลย")
    assert "พีเค" in res_pk

    res_gift = normalize_thai_speech("ส่ง Gift ให้ streamer หน่อย")
    assert "กิฟต์" in res_gift
    assert "สตรีมเมอร์" in res_gift

    res_sub = normalize_thai_speech("กด sub และ follow ให้ด้วย")
    assert "ซับ" in res_sub
    assert "ฟอล" in res_sub

    res_pro = normalize_thai_speech("เล่นอย่าง Pro ดู clips นี้สิ")
    assert "โปร" in res_pro
    assert "คลิป" in res_pro


def test_tokenization_pacing():
    """Verify tokenization preserves Thai natural flow while inserting pacing spaces at conjunctions and loanwords."""
    result = normalize_thai_speech("ผมชอบเล่นเกมและดูไลฟ์แต่ไม่มีเวลา")
    assert isinstance(result, str)
    assert len(result) > 0
    # Thai words shouldn't all be split by spaces (no robotic stutter)
    assert "ผมชอบ" in result or "ผม ชอบ" in result  # Not character-split
    # Conjunctions have spacing for acoustic breathing
    assert " และ " in result
    assert " แต่ " in result


def test_lru_cache_hit():
    """Verify normalize_thai_speech is decorated with lru_cache."""
    assert hasattr(normalize_thai_speech, "cache_info")
    info_before = normalize_thai_speech.cache_info()
    _ = normalize_thai_speech("ข้อความทดสอบแคช 123")
    _ = normalize_thai_speech("ข้อความทดสอบแคช 123")
    info_after = normalize_thai_speech.cache_info()
    assert info_after.hits > info_before.hits
