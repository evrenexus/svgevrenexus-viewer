# scripts/content_policy.py — Python twin of content-policy.mjs.
import json
import re
from pathlib import Path

_TERMS = json.loads(Path(__file__).with_name("policy-terms.json").read_text(encoding="utf-8"))["terms"]

def _norm(s):
    s = str(s or "")
    s = re.sub("[\\u200c\\u200d\\u200e\\u200f]", " ", s)
    s = s.replace("\u064a", "\u06cc").replace("\u0643", "\u06a9")
    s = re.sub("[\\u064b-\\u065f\\u0670]", "", s)
    return re.sub(r"\s+", " ", s).strip().lower()

_RULES = [(t, re.compile(r"(?<!\w)" + re.escape(_norm(t)) + r"(?!\w)")) for t in _TERMS]

def out_of_scope(item):
    """Return matched term, or None when title + summary are in scope."""
    text = _norm(f"{item.get('title', '')} {item.get('summary', '')}")
    for term, rx in _RULES:
        if rx.search(text):
            return term
    return None
