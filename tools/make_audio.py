"""用 Piper 离线生成一课的法语录音（单词 + 例句 + 看图练习参考句），写回课程文件的 audio 字段。

用法：python tools/make_audio.py L6 <模型.onnx 路径>
需要：pip install piper-tts lameenc；模型来自 huggingface.co/rhasspy/piper-voices（fr_FR-siwis-medium）。
已生成过的文本会跳过，只补新的。
"""
import hashlib, os, sys
import lameenc
from piper import PiperVoice, SynthesisConfig

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lessonio

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lesson_id, model = sys.argv[1], sys.argv[2]
path = os.path.join(ROOT, 'lessons', f'{lesson_id}.js')
L = lessonio.read(path)
out_rel = f'lessons/{lesson_id}/audio'
os.makedirs(os.path.join(ROOT, out_rel), exist_ok=True)

# 与页面 speak() 的取词规则一致：单词读 variants 用逗号连接，例句读 ex
texts = []
for c in L['cards']:
    texts.append(', '.join(c.get('variants') or c['term'].split(' / ')))
    texts.append(c['ex'])
texts += [x['fr'] for x in L.get('practice', {}).get('items', [])]
texts = list(dict.fromkeys(t.strip() for t in texts if t.strip()))

voice = PiperVoice.load(model)
cfg = SynthesisConfig(length_scale=1.08)  # 略放慢，便于跟读
audio = {}
made = 0
for t in texts:
    name = hashlib.sha1(t.encode('utf-8')).hexdigest()[:12] + '.mp3'
    rel = f'{out_rel}/{name}'
    full = os.path.join(ROOT, rel)
    if not os.path.exists(full):
        pcm, rate = b'', voice.config.sample_rate
        for chunk in voice.synthesize(t, syn_config=cfg):
            pcm += chunk.audio_int16_bytes
            rate = chunk.sample_rate
        pcm = b'\x00\x00' * int(rate * 0.12) + pcm  # 开头留一点静音，避免手机吞掉第一个音
        enc = lameenc.Encoder()
        enc.set_bit_rate(48)
        enc.set_in_sample_rate(rate)
        enc.set_channels(1)
        enc.set_quality(2)
        open(full, 'wb').write(enc.encode(pcm) + enc.flush())
        made += 1
    audio[t] = rel

# 删除不再用到的旧录音
keep = {os.path.basename(p) for p in audio.values()}
for f in os.listdir(os.path.join(ROOT, out_rel)):
    if f.endswith('.mp3') and f not in keep:
        os.remove(os.path.join(ROOT, out_rel, f))

L['audio'] = audio
lessonio.write(path, L)
size = sum(os.path.getsize(os.path.join(ROOT, p)) for p in audio.values())
print(f'{lesson_id}: {len(audio)} 条录音（新生成 {made} 条），共 {size / 1e6:.1f} MB')
