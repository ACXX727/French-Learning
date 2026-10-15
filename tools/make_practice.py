"""把课程拼图里的插画组合成“看图表达”练习图，并写入课程文件的 practice.items。

用法：python tools/make_practice.py L6
练习内容定义在下面的 EXERCISES 里：tiles 是 (拼图名, 序号) 列表；words 是本课词卡 id，显示为可点读的提示词。
原文照片练习（img 不在 practice/ 目录下的）按 PHOTOS 的定义更新，排在最后。
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lessonio

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LESSON = sys.argv[1] if len(sys.argv) > 1 else 'L6'

# 每组练习的逻辑：一个明确的问题（ask）→ 按步骤回答（points）→ 给出句型开头（frame）→ 提示词（words）。
# 参考答案只能用 frame 和 words 里出现过的说法，学生照着句型就写得出来。
# 字段：id, 标题, 问题, 步骤, 句型, 拼图, 每行几张, 是否标号, 提示词, 参考法语, 参考中文
EXERCISES = [
    ('taille', '比身高', '这三个人谁高、谁矮、谁中等身高？',
     ['从左到右，每个人写一句', '用 être + 形容词；中间是女士，形容词要用阴性'],
     "L'homme à gauche est…\nLa femme au milieu est…\nL'homme à droite est…",
     [('people', 0), ('people', 1), ('people', 2)], 3, False, ['w1', 'w2', 'w3'],
     "L'homme à gauche est grand. La femme au milieu est petite. L'homme à droite est de taille moyenne.",
     '左边的男人很高。中间的女人个子矮。右边的男人中等身高。'),
    ('corpulence', '说体型', '这三个男人的体型有什么不同？',
     ['按图上的编号 1–3，每个人写一句', '用 être + 形容词，可以给 2 号多加一个形容词'],
     "Le premier homme est…\nLe deuxième est…\nLe troisième est…",
     [('people', 4), ('people', 7), ('people', 8)], 3, True, ['w5', 'w8', 'w9', 'w17'],
     "Le premier homme est maigre. Le deuxième est musclé et sportif. Le troisième est de corpulence moyenne.",
     '第一个男人很瘦。第二个肌肉发达，很爱运动。第三个是中等体型。'),
    ('age', '谁年轻，谁年长', '两个男人谁年轻、谁年长？他们的头发有什么不同？',
     ['先用 être 说年龄', '再用 avoir 说头发的颜色、长短，以及有没有胡子'],
     "L'homme à gauche est… Il a les cheveux…\nL'homme à droite est… Il a les cheveux… et une…",
     [('people', 24)], 1, False, ['w10', 'w11', 'w60', 'w19', 'w64', 'w25', 'w118'],
     "L'homme à gauche est jeune. Il a les cheveux bruns et courts. L'homme à droite est âgé. Il a les cheveux gris et une barbe grise.",
     '左边的男人很年轻，他是棕色短发。右边的男人年纪大了，他头发灰白，留着灰白的胡子。'),
    ('coiffure', '四种发型', '四个人分别是什么发型？',
     ['按编号 1–4，每个人写一句', '女士用 avoir les cheveux + 形容词；4 号是光头，用 être chauve'],
     "La première femme a les cheveux…\nLa deuxième a les cheveux…\nLa troisième a les cheveux…\nL'homme est…",
     [('hair', 1), ('hair', 5), ('hair', 6), ('hair', 9)], 2, True, ['w19', 'w18', 'w23', 'w24', 'w65'],
     "La première femme a les cheveux courts. La deuxième a les cheveux longs et ondulés. La troisième a les cheveux bouclés. L'homme est chauve.",
     '第一位女士留短发。第二位是长长的波浪卷发。第三位是卷发。那位男士是光头。'),
    ('barbe', '胡子', '两个男人的胡子有什么不同？',
     ['左边：满脸的络腮胡 une barbe；右边：只在上唇的小胡子 une moustache', '用 avoir 说：Il a une…'],
     "L'homme à gauche a une…\nL'homme à droite a une…\nIls ont les cheveux…",
     [('hair', 7), ('hair', 8)], 2, False, ['w25', 'w26', 'w60'],
     "L'homme à gauche a une barbe. L'homme à droite a une moustache. Ils ont les cheveux bruns.",
     '左边的男人留着络腮胡。右边的男人留着小胡子。他们都是棕色头发。'),
    ('couleur-cheveux', '发色', '四位女士的头发分别是什么颜色？',
     ['按编号 1–4，每个人写一句', '前三位用 être + 阴性形容词（blonde / brune / rousse），4 号用 avoir les cheveux noirs'],
     "La première femme est…\nLa deuxième est…\nLa troisième est…\nLa quatrième a les cheveux…",
     [('hair', 10), ('hair', 11), ('hair', 13), ('hair', 14)], 2, True, ['w59', 'w60', 'w62', 'w63'],
     "La première femme est blonde. La deuxième est brune. La troisième est rousse. La quatrième a les cheveux noirs.",
     '第一位是金发。第二位是棕发。第三位是红发。第四位是黑发。'),
    ('yeux', '眼睛的颜色', '四双眼睛分别是什么颜色？',
     ['按编号 1–4，每双眼睛写一句', 'yeux 是复数，颜色要加 s；但 marron 不变，不加 s'],
     "La personne 1 a les yeux…\nLa personne 2 a les yeux…\nLa personne 3 a les yeux…\nLa personne 4 a les yeux…",
     [('hair', 16), ('hair', 17), ('hair', 18), ('hair', 20)], 2, True, ['w66', 'w67', 'w68', 'w70'],
     "La personne 1 a les yeux bleus. La personne 2 a les yeux verts. La personne 3 a les yeux marron. La personne 4 a les yeux gris.",
     '1 号是蓝眼睛。2 号是绿眼睛。3 号是棕色眼睛。4 号是灰眼睛。'),
    ('tenue-casual', '日常穿搭', '他穿了什么？',
     ['用一句 Il porte… 依次说上衣、裤子、鞋子', '每件衣服后面加颜色；marron 和 crème 不变'],
     "Il porte un pull…, un jean… et des chaussures…",
     [('people', 8)], 1, False, ['w84', 'w27', 'w35', 'w37', 'w82', 'w116', 'w75'],
     "Il porte un pull crème, un jean bleu et des chaussures marron.",
     '他穿着奶油色的毛衣、蓝色牛仔裤和棕色的鞋。'),
    ('tenue-soiree', '晚礼服', '她要去参加晚宴。她看起来怎么样？穿了什么？',
     ['先用 Elle est… 说她给人的感觉', '再用 Elle porte… 说裙子的长短和颜色（酒红色 bordeaux 不变）'],
     "Elle est…\nElle porte une longue robe…",
     [('people', 13)], 1, False, ['w16', 'w84', 'w32', 'w83'],
     "Elle est élégante. Elle porte une longue robe bordeaux.",
     '她很优雅。她穿着一条酒红色的长裙。'),
    ('sport', '运动风', '她是什么样的人？穿了什么？',
     ['先用 Elle est… 说她的体型和爱好（两个形容词）', '再用 Elle porte… 说短裤和运动鞋，加上颜色'],
     "Elle est… et…\nElle porte un short… et des baskets…",
     [('people', 14)], 1, False, ['w17', 'w4', 'w36', 'w38', 'w53', 'w52'],
     "Elle est sportive et mince. Elle porte un short noir et des baskets blanches.",
     '她爱运动，身材苗条。她穿着黑色短裤和白色运动鞋。'),
    ('accessoires', '度假配饰', '她去海边度假，会戴哪些配饰？',
     ['用 Elle porte… 说出图中三样可以戴的配饰', '包是拿着的，不用 porter：Elle a aussi un sac…'],
     "Elle porte un…, des… et un…\nElle a aussi un sac…",
     [('objects', 19)], 1, False, ['w42', 'w41', 'w45', 'w102', 'w75'],
     "Elle porte un chapeau, des lunettes de soleil et un foulard. Elle a aussi un sac marron.",
     '她戴着帽子、太阳镜和丝巾。她还带着一个棕色的包。'),
    ('bijoux', '首饰盒', '首饰盒里有哪些首饰？',
     ['用一句 Dans la boîte, il y a… 列出四样首饰', '注意冠词：un collier、une bague、des boucles d’oreilles'],
     "Dans la boîte, il y a un…, un…, une… et des…",
     [('objects', 20)], 1, False, ['w47', 'w48', 'w49', 'w50'],
     "Dans la boîte, il y a un collier, un bracelet, une bague et des boucles d'oreilles.",
     '首饰盒里有一条项链、一只手链、一枚戒指和一对耳环。'),
    ('emotions', '脸色与情绪', '两个人分别是什么情绪？脸色怎么样？',
     ['左边的男人：用颜色表达说“气得满脸通红”', '右边的女人：先说她很害怕，再说她脸色苍白如纸（blanc 要变成阴性 blanche）'],
     "L'homme est rouge de…\nLa femme a peur : elle est blanche comme…",
     [('people', 16), ('people', 18)], 2, False, ['w72', 'w74', 'w109'],
     "L'homme est rouge de colère. La femme a peur : elle est blanche comme un linge.",
     '男人气得满脸通红。女人很害怕：她脸色苍白如纸。'),
]
# 原文照片练习：结构同上（没有拼图）
PHOTOS = {
    'image5': ('photo-1', '真实照片 · 红毯礼服', '这位女士是什么发型？穿戴了什么？',
               ['先用 avoir 说发型', '再用 porter 说裙子（长短、颜色）和项链', '最后用 être 说她给人的感觉'],
               "Elle a les cheveux…\nElle porte une longue robe… et un…\nElle est…",
               ['w19', 'w32', 'w76', 'w47', 'w16'],
               "Elle a les cheveux courts. Elle porte une longue robe orange et un collier. Elle est élégante.",
               '她留着短发。她穿着一条橙色长裙，戴着项链。她很优雅。'),
    'image6': ('photo-2', '真实照片 · 休闲装', '描述她的头发和穿着。',
               ['头发：长短、卷不卷、颜色（红发是 roux）', '衣服：牛仔裤和运动鞋，加上颜色'],
               "Elle a les cheveux…, … et…\nElle porte un jean… et des baskets…",
               ['w18', 'w23', 'w62', 'w35', 'w38', 'w116', 'w52'],
               "Elle a les cheveux longs, ondulés et roux. Elle porte un jean bleu et des baskets blanches.",
               '她留着长长的红色波浪卷发。她穿着蓝色牛仔裤和白色运动鞋。'),
    'image7': ('photo-3', '真实照片 · 男士穿搭', '他戴了什么？穿了什么？',
               ['先用 Il porte… 说两样配饰（眼镜、手表）', '再用 Il porte… 说毛衣、牛仔裤和运动鞋，加上颜色'],
               "Il porte des… et une…\nIl porte un pull…, un jean… et des baskets…",
               ['w40', 'w51', 'w27', 'w35', 'w38', 'w116', 'w118'],
               "Il porte des lunettes et une montre. Il porte un pull gris, un jean bleu et des baskets grises.",
               '他戴着眼镜和手表。他穿着灰色毛衣、蓝色牛仔裤和灰色运动鞋。'),
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


def check_words(pid, words):
    bad = [w for w in words if w not in ids]
    assert not bad, f'{pid}: 未知词卡 {bad}'


items = []
for (pid, title, ask, points, frame, tiles, cols, numbered, words, fr, zh) in EXERCISES:
    check_words(pid, words)
    rel = f'{out_rel}/{pid}.webp'
    compose(tiles, cols, numbered).save(os.path.join(ROOT, rel), 'WEBP', quality=82, method=6)
    items.append({'id': pid, 'img': rel, 'title': title, 'ask': ask, 'points': points, 'frame': frame, 'words': words, 'fr': fr, 'zh': zh})

for x in L.get('practice', {}).get('items', []):
    key = os.path.splitext(os.path.basename(x['img']))[0]
    if x['img'].startswith(out_rel) or key not in PHOTOS:
        continue
    pid, title, ask, points, frame, words, fr, zh = PHOTOS[key]
    check_words(pid, words)
    items.append({'id': pid, 'img': x['img'], 'title': title, 'ask': ask, 'points': points, 'frame': frame, 'words': words, 'fr': fr, 'zh': zh})

L['practice']['items'] = items
L['practice']['title'] = '看图，用法语说出来'
L['practice'].pop('pattern', None)  # 底部的通用句型提示已由每组的 frame 代替
lessonio.write(os.path.join(ROOT, 'lessons', f'{LESSON}.js'), L)
size = sum(os.path.getsize(os.path.join(ROOT, x['img'])) for x in items)
print(f'{LESSON}: {len(items)} 组看图练习，图片共 {size / 1e6:.2f} MB')
