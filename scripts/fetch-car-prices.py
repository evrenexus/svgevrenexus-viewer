#!/usr/bin/env python3
import json
import re
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "car-data" / "car-prices.json"
SOURCE_URL = "https://www.iranjib.ir/showgroup/45/%D9%82%DB%8C%D9%85%D8%AA-%D8%AE%D9%88%D8%AF%D8%B1%D9%88-%D8%AA%D9%88%D9%84%DB%8C%D8%AF-%D8%AF%D8%A7%D8%AE%D9%84/"
SOURCE_NAME = "ایران جیب"

DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")

def clean(s):
    s = re.sub(r"\\s+", " ", str(s or ""))
    return s.replace("\\xa0", " ").strip()

def number_value(s):
    s = clean(s).translate(DIGITS)
    if not s or s in {"-", "---", "ناموجود", "به زودی", "توقف تولید", "توقف فروش"}:
        return None
    s = re.sub(r"[^0-9.]", "", s.replace(",", ""))
    try:
        return int(float(s)) if s else None
    except ValueError:
        return None

def change_value(s):
    s = clean(s).translate(DIGITS)
    m = re.search(r"(-?\\d+(?:\\.\\d+)?)\\s*%?", s)
    return float(m.group(1)) if m else None

class PriceParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.heading = ""
        self.in_heading = False
        self.heading_buf = []
        self.in_row = False
        self.in_cell = False
        self.cell_buf = []
        self.row_cells = []
        self.groups = []
        self.current = None
        self.source_text = []

    def handle_starttag(self, tag, attrs):
        if tag in ("h2", "h3"):
            self.in_heading = True
            self.heading_buf = []
        elif tag == "tr":
            self.in_row = True
            self.row_cells = []
        elif tag in ("td", "th") and self.in_row:
            self.in_cell = True
            self.cell_buf = []

    def handle_endtag(self, tag):
        if tag in ("h2", "h3") and self.in_heading:
            name = clean("".join(self.heading_buf))
            self.in_heading = False
            self.heading_buf = []
            if name and "قیمت خودرو" not in name:
                self.heading = name
                self.current = {"name": name, "cars": []}
                self.groups.append(self.current)
        elif tag in ("td", "th") and self.in_cell:
            self.row_cells.append(clean("".join(self.cell_buf)))
            self.in_cell = False
            self.cell_buf = []
        elif tag == "tr" and self.in_row:
            self.in_row = False
            cells = self.row_cells
            self.row_cells = []
            if len(cells) >= 4 and cells[0] not in ("نام خودرو", "") and self.current:
                name, market, factory, change = cells[:4]
                if market or factory:
                    self.current["cars"].append({
                        "name": name,
                        "market": market,
                        "market_value": number_value(market),
                        "factory": factory,
                        "factory_value": number_value(factory),
                        "change": change,
                        "change_value": change_value(change)
                    })

    def handle_data(self, data):
        self.source_text.append(data)
        if self.in_heading:
            self.heading_buf.append(data)
        elif self.in_cell:
            self.cell_buf.append(data)

def fetch():
    req = Request(SOURCE_URL, headers={
        "User-Agent": "Mozilla/5.0 (compatible; EvrenNexusPriceBot/1.0)",
        "Accept-Language": "fa-IR,fa;q=0.9,en;q=0.5"
    })
    with urlopen(req, timeout=30) as r:
        raw = r.read()
        charset = r.headers.get_content_charset() or "utf-8"
    return raw.decode(charset, "replace")

def main():
    html = fetch()
    parser = PriceParser()
    parser.feed(html)
    groups = [g for g in parser.groups if g["cars"]]

    total = sum(len(g["cars"]) for g in groups)
    if len(groups) < 3 or total < 30:
        raise RuntimeError(f"Unexpected IranJib structure: groups={len(groups)}, cars={total}")

    text = clean(" ".join(parser.source_text))
    m = re.search(r"آخرین به روز رسانی.*?(?=\\n|$)", text)
    source_updated = m.group(0)[:160] if m else ""

    payload = {
        "source": SOURCE_NAME,
        "source_url": SOURCE_URL,
        "fetched_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source_updated": source_updated,
        "groups": groups
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {total} vehicles in {len(groups)} groups")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise
