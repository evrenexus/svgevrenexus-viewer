# scripts/content_policy.py — Python twin of content-policy.mjs.
import json
import re
import html
from pathlib import Path

_TERMS = json.loads(Path(__file__).with_name("policy-terms.json").read_text(encoding="utf-8"))["terms"]

def _norm(s):
    s = str(s or "")
    s = re.sub("[\\u200c\\u200d\\u200e\\u200f]", " ", s)
    s = s.replace("\u064a", "\u06cc").replace("\u0643", "\u06a9")
    s = re.sub("[\\u064b-\\u065f\\u0670]", "", s)
    return re.sub(r"\s+", " ", s).strip().lower()

_RULES = [(t, re.compile(r"(?<!\w)" + re.escape(_norm(t)) + r"(?!\w)")) for t in _TERMS]

DAILY_MARKET_PRICE_TITLE = re.compile(r"^(?:قیمت|نرخ)\s+(?:(?:روز|امروز|لحظه‌ای|لحظه ای)\s+)*(?:پوند(?:\s+انگلیس)?|دلار(?:\s+آمریکا)?|یورو|درهم(?:\s+امارات)?|لیر(?:\s+ترکیه)?|دینار(?:\s+عراق)?|روبل|یوآن|فرانک|طلا|سکه|نیم\s+سکه|ربع\s+سکه|ارز)(?=.*(?:امروز|جدول|قیمت روز|نرخ روز|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند|شنبه|یکشنبه|دوشنبه|سه\s+شنبه|چهارشنبه|پنجشنبه|جمعه|[۰-۹0-9]{1,2}\s*(?:مهر|آبان|آذر|دی|بهمن|اسفند|فروردین|اردیبهشت|خرداد|تیر|مرداد|شهریور))")

def out_of_scope(item):
    """Return matched term, or None when title + summary are in scope."""
    plain = lambda value: re.sub(r"<[^>]*>", " ", html.unescape(str(value or "")))
    title = _norm(plain(item.get("title", "")))
    if DAILY_MARKET_PRICE_TITLE.search(title):
        return "daily-market-price"
    text = _norm(" ".join(plain(item.get(key, "")) for key in ("title", "summary", "content")))
    for term, rx in _RULES:
        if rx.search(text):
            return term
    return None
