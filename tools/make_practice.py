"""根据课程文件里的看图练习定义，把插画拼图里的小图拼成练习图片。

用法：python tools/make_practice.py L6

练习内容全部写在课程文件 lessons/<课号>.js 的 practice.items 里（这个脚本里没有任何课程内容）：
  - 用插画拼图的练习：写 "tiles": [["people", 0], ["people", 1]]（拼图名 + 序号）、
    "cols": 每行几张、"numbered": 是否在左上角标 1、2、3…；
    运行后自动生成 lessons/<课号>/practice/<id>.webp，并把 img 字段填好。
  - 用照片的练习：不写 tiles，直接写 "img": "lessons/<课号>/xxx.webp"，脚本不会动它。
其它字段（title / ask / points / frame / words / fr / zh）由人或 AI 直接写在课程文件里，见 AGENTS.md。
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lessonio

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON = sys.argv[1] if len(sys.argv) > 1 else 'L6'

# 只有一条横向画面的插画（眼睛）只取中间这一段，避免带上相邻插画的边
BANDS = {('hair', n): (0.2, 0.68) for n in range(16, 22)}
# 全身人像两侧留白多，并排时只取中间这一段
NARROW = {('people', n): (0.2, 0.8) for n in (0, 1, 2, 4, 7, 8)}


def bold_font(size):
    """编号用的粗体字：Windows / macOS / Linux 各找一个，都没有就用 Pillow 自带字体。"""
    for path in [r'C:\Windows\Fonts\arialbd.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
                 '/Library/Fonts/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc',
                 '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


path = os.path.join(ROOT, 'lessons', f'{LESSON}.js')
L = lessonio.read(path)
ids = {c['id'] for c in L['cards']}
grid = L.get('grid', 5)
atlas = {k: Image.open(os.path.join(ROOT, p)).convert('RGB') for k, p in L.get('atlases', {}).items()}
font = bold_font(22)
out_rel = f'lessons/{LESSON}/practice'


def tile(sheet, n, narrow=False):
    im = atlas[sheet]
    s = im.width / grid
    x, y = (n % grid) * s, (n // grid) * s
    pad = s * 0.045  # 去掉拼图边缘的串色
    top, bottom = BANDS.get((sheet, n), (0, 1))
    left, right = NARROW.get((sheet, n), (0, 1)) if narrow else (0, 1)
    return im.crop((round(x + max(pad, s * left)), round(y + max(pad, s * top)), round(x + min(s - pad, s * right)), round(y + min(s - pad, s * bottom))))


def compose(tiles, cols, numbered):
    parts = [tile(*t, narrow=len(tiles) > 1) for t in tiles]
    w = 480 if len(parts) == 1 else 300
    parts = [p.resize((w, round(p.height * w / p.width)), Image.LANCZOS) for p in parts]
    h = max(p.height for p in parts)
    gap = 12
    rows = (len(parts) + cols - 1) // cols
    W, H = cols * w + (cols - 1) * gap, rows * h + (rows - 1) * gap
    canvas = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(canvas)
    for i, p in enumerate(parts):
        x, y = (i % cols) * (w + gap), (i // cols) * (h + gap)
        canvas.paste(p, (x, y))
        if numbered:
            d.ellipse((x + 10, y + 10, x + 44, y + 44), fill=(102, 88, 217))
            d.text((x + 27, y + 27), str(i + 1), font=font, fill='white', anchor='mm')
    return canvas


items = L.get('practice', {}).get('items', [])
made = 0
for x in items:
    bad = [w for w in x.get('words', []) if w not in ids]
    assert not bad, f"{x.get('id')}: 未知词卡 {bad}"
    if not x.get('tiles'):
        continue
    missing = {t[0] for t in x['tiles']} - set(atlas)
    assert not missing, f"{x['id']}: 课程文件里没有拼图 {missing}"
    os.makedirs(os.path.join(ROOT, out_rel), exist_ok=True)
    x['img'] = f"{out_rel}/{x['id']}.webp"
    compose([tuple(t) for t in x['tiles']], x.get('cols', len(x['tiles'])), x.get('numbered', False)).save(
        os.path.join(ROOT, x['img']), 'WEBP', quality=82, method=6)
    made += 1

lessonio.write(path, L)
size = sum(os.path.getsize(os.path.join(ROOT, x['img'])) for x in items if x.get('img'))
print(f'{LESSON}: {len(items)} 组看图练习（其中 {made} 组由拼图生成），图片共 {size / 1e6:.2f} MB')
