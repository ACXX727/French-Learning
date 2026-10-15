"""检查课程数据是否完整：python tools/check_lesson.py [L7]  (不带参数则检查全部课程)"""
import json, os, sys

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REQUIRED = ['id', 'cat', 'term', 'ipa', 'zh', 'ex', 'tr', 'hint']


def check(meta):
    errs = []
    path = os.path.join(ROOT, meta['file'])
    if not os.path.exists(path):
        return [f"找不到 {meta['file']}"], 0
    L = json.load(open(path, encoding='utf-8'))
    if L.get('id') != meta['id']:
        errs.append(f"index.json 里的 id {meta['id']} 与文件里的 id {L.get('id')} 不一致")
    grid = L.get('grid', 5)
    atlases = L.get('atlases', {})
    for name, p in atlases.items():
        if not os.path.exists(os.path.join(ROOT, p)):
            errs.append(f'拼图 {name} 的文件不存在：{p}')
    seen = set()
    for i, c in enumerate(L.get('cards', [])):
        tag = c.get('id', f'第{i + 1}张')
        for k in REQUIRED:
            if not str(c.get(k, '')).strip():
                errs.append(f'{tag} 缺少字段 {k}')
        if c.get('id') in seen:
            errs.append(f'{tag} 的 id 重复')
        seen.add(c.get('id'))
        if 'art' in c:
            sheet, n = c['art']
            if sheet not in atlases:
                errs.append(f'{tag} 引用了不存在的拼图 {sheet}')
            if not 0 <= n < grid * grid:
                errs.append(f'{tag} 的拼图序号 {n} 超出 0–{grid * grid - 1}')
        if 'img' in c and not os.path.exists(os.path.join(ROOT, c['img'])):
            errs.append(f"{tag} 的图片不存在：{c['img']}")
    for i, x in enumerate(L.get('practice', {}).get('items', [])):
        if not os.path.exists(os.path.join(ROOT, x.get('img', ''))):
            errs.append(f"看图练习 {i + 1} 的图片不存在：{x.get('img')}")
    lost = [t for t, p in L.get('audio', {}).items() if not os.path.exists(os.path.join(ROOT, p))]
    if lost:
        errs.append(f'{len(lost)} 条录音文件不存在，例如：{lost[0]}（重跑 tools/make_audio.py）')
    if not L.get('cards'):
        errs.append('没有任何词卡')
    return errs, len(L.get('cards', []))


idx = json.load(open(os.path.join(ROOT, 'lessons', 'index.json'), encoding='utf-8'))
want = sys.argv[1:] or [l['id'] for l in idx['lessons']]
if idx.get('default') not in [l['id'] for l in idx['lessons']]:
    print(f"✗ index.json 的 default {idx.get('default')} 不在课程列表里")
bad = False
for meta in idx['lessons']:
    if meta['id'] not in want:
        continue
    errs, n = check(meta)
    bad |= bool(errs)
    print(('✗ ' if errs else '✓ ') + f"{meta['id']} · {n} 张卡")
    for e in errs:
        print('   - ' + e)
missing = set(want) - {l['id'] for l in idx['lessons']}
for m in missing:
    print(f'✗ {m} 没有登记在 lessons/index.json')
    bad = True
sys.exit(1 if bad else 0)
