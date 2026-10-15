"""把课程拼图里的插画组合成“看图表达”练习图，并写入课程文件的 practice.items。

用法：python tools/make_practice.py L6
练习内容定义在下面的 EXERCISES 里：tiles 是 (拼图名, 序号) 列表；words 是本课词卡 id，显示为可点读的提示词。
已有的照片练习（img 不在 practice/ 目录下的）会保留并排在最后。
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lessonio

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON = sys.argv[1] if len(sys.argv) > 1 else 'L6'

# 每组：id, 标题, 任务, 拼图, 每行几张, 是否标号, 提示词, 参考法语, 参考中文
EXERCISES = [
    ('taille', '比身高', '三个人站在一样高的门前：谁高、谁矮、谁中等身高？', [('people', 0), ('people', 1), ('people', 2)], 3, False,
     ['w1', 'w2', 'w3', 'w87'],
     "L'homme à gauche est grand. La femme au milieu est petite. L'homme à droite est de taille moyenne.",
     '左边的男人很高。中间的女人个子矮。右边的男人中等身高。'),
    ('corpulence', '说体型', '描述这三个男人的体型，可以再加一句他们穿了什么。', [('people', 4), ('people', 7), ('people', 8)], 3, True,
     ['w5', 'w8', 'w9', 'w17', 'w88'],
     "Le premier homme est maigre. Le deuxième est musclé et sportif. Le troisième est de corpulence moyenne : il porte un pull et un jean.",
     '第一个男人很瘦。第二个肌肉发达、很爱运动。第三个是中等体型：他穿着毛衣和牛仔裤。'),
    ('age', '谁年轻，谁年长', '比较两个男人的年龄，再说说他们的头发和胡子。', [('people', 24)], 1, False,
     ['w10', 'w11', 'w64', 'w25', 'w60'],
     "L'homme à gauche est jeune : il a les cheveux bruns et courts. L'homme à droite est âgé : il a les cheveux gris et une barbe grise.",
     '左边的男人很年轻：他是棕色短发。右边的男人年纪大了：他头发花白，留着灰白的胡子。'),
    ('coiffure', '四种发型', '按 1–4 的顺序描述每个人的发型。', [('hair', 1), ('hair', 5), ('hair', 6), ('hair', 9)], 2, True,
     ['w19', 'w18', 'w23', 'w24', 'w65'],
     "La première femme a les cheveux courts. La deuxième a les cheveux longs et ondulés. La troisième a les cheveux bouclés. L'homme est chauve.",
     '第一位女士留短发。第二位是长长的波浪卷发。第三位是卷发。那位男士是光头。'),
    ('barbe', '胡子', '两个男人的胡子不一样：一个是 barbe，一个是 moustache。', [('hair', 7), ('hair', 8)], 2, False,
     ['w25', 'w26', 'w60', 'w19'],
     "L'homme à gauche a une barbe et les cheveux bruns. L'homme à droite a une moustache et les cheveux courts.",
     '左边的男人留着络腮胡，头发是棕色的。右边的男人留着小胡子，头发很短。'),
    ('couleur-cheveux', '发色', '四位女士的发色各不相同，用 blond / brun / roux / noir 描述。', [('hair', 10), ('hair', 11), ('hair', 13), ('hair', 14)], 2, True,
     ['w59', 'w60', 'w62', 'w63', 'w18'],
     "La première femme est blonde. La deuxième est brune. La troisième est rousse. La quatrième a les cheveux noirs. Elles ont toutes les cheveux longs.",
     '第一位是金发。第二位是棕发。第三位是红发。第四位是黑发。她们都留着长发。'),
    ('yeux', '眼睛的颜色', '用 avoir les yeux… 说出每双眼睛的颜色。注意 marron 不变化。', [('hair', 16), ('hair', 17), ('hair', 18), ('hair', 20)], 2, True,
     ['w66', 'w67', 'w68', 'w70', 'w95'],
     "La personne 1 a les yeux bleus. La personne 2 a les yeux verts. La personne 3 a les yeux marron. La personne 4 a les yeux gris.",
     '1 号是蓝眼睛。2 号是绿眼睛。3 号是棕色眼睛。4 号是灰眼睛。'),
    ('tenue-casual', '日常穿搭', '他穿了什么？说出衣服、颜色和鞋子。', [('people', 8)], 1, False,
     ['w84', 'w27', 'w35', 'w37', 'w82', 'w75'],
     "Il porte un pull crème, un jean bleu et des chaussures marron. Il a les cheveux courts.",
     '他穿着奶油色的毛衣、蓝色牛仔裤和棕色的鞋。他留着短发。'),
    ('tenue-soiree', '晚礼服', '她要去参加晚宴：描述她的样子和穿着。', [('people', 13)], 1, False,
     ['w16', 'w32', 'w83', 'w84', 'w102'],
     "Elle est élégante. Elle porte une longue robe bordeaux et elle a un petit sac noir.",
     '她很优雅。她穿着一条酒红色的长裙，拿着一个黑色的小包。'),
    ('sport', '运动风', '她在跑步：用 sportive、mince 和 porter 描述她。', [('people', 14)], 1, False,
     ['w17', 'w4', 'w36', 'w38', 'w18'],
     "Elle est sportive et mince. Elle a les cheveux longs. Elle porte un short noir et des baskets blanches.",
     '她爱运动，身材苗条。她留着长发。她穿着黑色短裤和白色运动鞋。'),
    ('accessoires', '度假配饰', '她要去海边度假，会戴哪些配饰？', [('objects', 19)], 1, False,
     ['w42', 'w41', 'w45', 'w102', 'w97'],
     "Elle porte un chapeau, des lunettes de soleil et un foulard. Elle a aussi un sac marron.",
     '她戴着帽子、太阳镜和丝巾。她还带着一个棕色的包。'),
    ('bijoux', '首饰盒', '首饰盒里有什么？再说说她经常戴哪一件。', [('objects', 20)], 1, False,
     ['w47', 'w48', 'w49', 'w50', 'w98', 'w123'],
     "Dans la boîte, il y a un collier, un bracelet, une bague et des boucles d'oreilles. Elle porte souvent son collier.",
     '首饰盒里有一条项链、一只手链、一枚戒指和一对耳环。她经常戴那条项链。'),
    ('emotions', '脸色与情绪', '用本课的颜色表达说出两个人的状态。', [('people', 16), ('people', 18)], 2, False,
     ['w72', 'w74', 'w106', 'w109'],
     "L'homme est rouge de colère. La femme a peur : elle est blanche comme un linge.",
     '男人气得满脸通红。女人很害怕：她脸色苍白如纸。'),
]
# 原文照片练习：沿用原来的参考描述，补上标题、任务和提示词
PHOTOS = {
    'image5': ('photo-1', '真实照片 · 晚礼服', '综合练习：头发、衣服、颜色，至少写三句。', ['w19', 'w32', 'w76', 'w16']),
    'image6': ('photo-2', '真实照片 · 休闲装', '综合练习：头发、上衣、裤子和鞋。', ['w18', 'w62', 'w35', 'w38']),
    'image7': ('photo-3', '真实照片 · 男士穿搭', '综合练习：衣服、颜色和配饰。', ['w27', 'w34', 'w51', 'w40']),
}

L = lessonio.read(os.path.join(ROOT, 'lessons', f'{LESSON}.js'))
ids = {c['id'] for c in L['cards']}
grid = L.get('grid', 5)
atlas = {k: Image.open(os.path.join(ROOT, p)).convert('RGB') for k, p in L['atlases'].items()}
font = ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf', 22)
out_rel = f'lessons/{LESSON}/practice'
os.makedirs(os.path.join(ROOT, out_rel), exist_ok=True)


# 只有一条横向画面的插画（眼睛）只取中间这一段，避免带上相邻插画的边
BANDS = {('hair', n): (0.2, 0.68) for n in range(16, 22)}
# 全身人像两侧留白多，并排时只取中间这一段
NARROW = {('people', n): (0.2, 0.8) for n in (0, 1, 2, 4, 7, 8)}


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


items = []
for (pid, title, task, tiles, cols, numbered, words, fr, zh) in EXERCISES:
    bad = [w for w in words if w not in ids]
    assert not bad, f'{pid}: 未知词卡 {bad}'
    rel = f'{out_rel}/{pid}.webp'
    compose(tiles, cols, numbered).save(os.path.join(ROOT, rel), 'WEBP', quality=82, method=6)
    items.append({'id': pid, 'img': rel, 'title': title, 'task': task, 'words': words, 'fr': fr, 'zh': zh})

for x in L.get('practice', {}).get('items', []):
    key = os.path.splitext(os.path.basename(x['img']))[0]
    if x['img'].startswith(out_rel) or key not in PHOTOS:
        continue
    pid, title, task, words = PHOTOS[key]
    items.append({**x, 'id': pid, 'title': title, 'task': task, 'words': words})

L['practice']['items'] = items
L['practice']['title'] = '看图，用法语说出来'
lessonio.write(os.path.join(ROOT, 'lessons', f'{LESSON}.js'), L)
size = sum(os.path.getsize(os.path.join(ROOT, x['img'])) for x in items)
print(f'{LESSON}: {len(items)} 组看图练习，图片共 {size / 1e6:.2f} MB')
