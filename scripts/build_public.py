import json, os, sys, datetime

NEWS_IN, ED_IN, OUT = 'data/news.json', 'data/editorial.json', 'data/public'
MIN_NEWS = 20

def fail(msg):
    print(f'::error::{msg}'); sys.exit(1)

def load(path):
    try:
        with open(path, encoding='utf-8') as f: return json.load(f)
    except Exception as e:
        fail(f'{path}: {e}')

def split_news(raw):
    if isinstance(raw, list): return None, raw
    if isinstance(raw, dict):
        for k in ('items', 'news', 'articles'):
            if isinstance(raw.get(k), list): return k, raw[k]
    fail('news.json: ساختار شناخته نشد')

from content_policy import out_of_scope

def clean_news(items):
    out, seen, dropped, policy_dropped, valid_before_policy = [], set(), 0, 0, 0
    for it in items:
        ok = (isinstance(it, dict)
              and isinstance(it.get('id'), str) and it['id']
              and isinstance(it.get('title'), str) and it['title'].strip()
              and isinstance(it.get('url'), str) and it['url']
              and it['id'] not in seen)
        if not ok:
            dropped += 1
            print(f"::warning::خبر نامعتبر حذف شد: {str(it)[:80] if not isinstance(it, dict) else it.get('id')}")
            continue
        valid_before_policy += 1
        if out_of_scope(it):
            policy_dropped += 1
            continue
        seen.add(it['id']); out.append(it)
    return out, dropped, policy_dropped, valid_before_policy

STR = ['category', 'title', 'summary', 'content', 'image', 'updated_at']
BOOL = ['edited', 'republish', 'published', 'important', 'slider', 'deleted']

def clean_editorial(raw):
    if not isinstance(raw, dict) or not isinstance(raw.get('items'), dict):
        fail('editorial.json: items باید شیء باشد')
    items, dropped = {}, 0
    for nid, e in raw['items'].items():
        if not isinstance(e, dict):
            dropped += 1; print(f'::warning::آیتم سردبیری نامعتبر: {nid}'); continue
        e = dict(e)
        if out_of_scope(e):
            dropped += 1
            continue
        for k in STR:
            if k in e and not isinstance(e[k], str): del e[k]
        for k in BOOL:
            if k in e and not isinstance(e[k], bool): del e[k]
        items[nid] = e
    return {**raw, 'items': items}, dropped

def dump(obj): return json.dumps(obj, ensure_ascii=False, indent=2) + '\n'

def prev_count():
    p = f'{OUT}/news.json'
    if not os.path.exists(p): return 0
    try:
        with open(p, encoding='utf-8') as f: return len(split_news(json.load(f))[1])
    except Exception: return 0

raw_news = load(NEWS_IN)
key, items = split_news(raw_news)
items, dropped_news, policy_dropped, valid_before_policy = clean_news(items)

floor = max(MIN_NEWS, prev_count() // 2)
if valid_before_policy < floor:
    fail(f'خبر معتبر قبل از فیلتر سیاستی {valid_before_policy} کمتر از حداقل {floor}؛ انتشار متوقف شد')
if dropped_news > max(5, int(valid_before_policy * 0.05)):
    fail(f'{dropped_news} خبر نامعتبر؛ انتشار متوقف شد')

news_out = items if key is None else {**raw_news, key: items}
ed_out, dropped_ed = clean_editorial(load(ED_IN))

policy_path = os.path.join(os.path.dirname(__file__), 'policy-terms.json')
with open(policy_path, encoding='utf-8') as f: policy_out = json.load(f)
files = {'news.json': dump(news_out), 'editorial.json': dump(ed_out), 'policy-terms.json': dump(policy_out)}
for text in files.values(): json.loads(text)

os.makedirs(OUT, exist_ok=True)
changed = False
for name, text in files.items():
    p = f'{OUT}/{name}'
    old = open(p, encoding='utf-8').read() if os.path.exists(p) else None
    if old != text:
        with open(p + '.tmp', 'w', encoding='utf-8') as f: f.write(text)
        os.replace(p + '.tmp', p); changed = True

if changed:
    meta = {'generated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'news_count': len(items), 'editorial_count': len(ed_out['items']),
            'dropped_news': dropped_news, 'dropped_editorial': dropped_ed}
    with open(f'{OUT}/meta.json', 'w', encoding='utf-8') as f: f.write(dump(meta))

summary = (f'news={len(items)} policy_dropped={policy_dropped} dropped_news={dropped_news} '
           f'editorial={len(ed_out["items"])} dropped_editorial={dropped_ed} changed={changed}')
print(summary)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f: f.write(summary + '\n')
