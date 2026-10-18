# GANGAN · 给 AI 编程助手（Codex / Claude Code）的项目说明

这是一个纯静态的法语词汇学习网站，两个人在维护：一人用 Claude Code，一人用 Codex。
大家都通过同一个 GitHub 仓库同步：https://github.com/ACXX727/French-Learning
网站地址：https://acxx727.github.io/French-Learning/ （推送到 `main` 后一两分钟自动更新）

## 每次开始和结束都要做的同步

1. **开始任何修改之前**：`git pull --rebase origin main`，拿到对方的最新改动。
2. **改完、检查通过后**：`git add` 相关文件 → `git commit`（中文说明写清楚改了什么）→ `git push origin main`。
3. 推送被拒绝（对方先推了）：再 `git pull --rebase origin main`，解决冲突后再推。
4. **绝对不要** `git push --force`，不要改写已经推送的历史。遇到看不懂的冲突，停下来问用户。
5. 一次只做一件事，做完就提交推送，减少两边同时改同一个文件的时间。

## 目录

```
index.html            整个页面（样式和脚本都在里面）
lessons/index.js      课程列表 + 默认打开的课
lessons/L6.js         一课的全部内容：词卡、看图练习、说明、录音索引
lessons/L6/           这一课的图片（WebP）、练习图（practice/）、录音（audio/）
materials/            新课原始材料收件箱（课本原文，只留本机，不提交）
tools/                Python 工具：lessonio.py 读写课程文件、check_lesson.py 校验、
                      make_practice.py 生成看图练习、make_audio.py 生成录音
.claude/skills/add-lesson/SKILL.md   加一课的完整流程（Codex 也按这份做）
sw.js                 离线缓存
```

## 规则

- **课程文件** `lessons/*.js` 的格式是 `lexiqueData({...});`，里面是 JSON。读写一律用 `tools/lessonio.py` 的 `read` / `write`，不要手工拼外层包装。改完运行 `python tools/check_lesson.py`，必须全部通过。
- **不要改动会丢进度的东西**：`index.html` 里的 `storageKey()`（L6 的键是 `lexique-l6-v1`），以及已有词卡和看图练习的 `id`。她的学习记录、收藏和草稿都按这些键和 id 保存在浏览器里。
- **加一课 / 更新一课**：严格按 `.claude/skills/add-lesson/SKILL.md` 的步骤来（读材料 → 写课程文件 → 看图练习 → 录音 → 校验 → 预览 → 提交）。
- **看图练习的逻辑**：每组有 `ask`（一个明确的问题）、`points`（2–3 步答题步骤）、`frame`（带“…”的句型）、`words`（提示词的词卡 id）。参考答案 `fr` 里的每个词都必须在 `frame` 或 `words` 里出现过。
- **录音**：`tools/make_audio.py` 需要 Piper（`pip install piper-tts lameenc`）和 `fr_FR-siwis-medium` 模型（Hugging Face 的 rhasspy/piper-voices）。下载前先征得用户同意。没有录音时网页会自动用系统法语语音，不影响使用。
- **隐私**：不要提交 `materials/` 里的课本原文（`.gitignore` 已排除）；不要把 DeepSeek API Key 或任何密钥写进文件。
- **缓存**：替换了同名图片或录音时，把 `sw.js` 里的 `CACHE` 版本号加一；只改 `index.html` 或 `lessons/*.js` 不需要。
- **界面风格**：Apple 风格，浅色 #f5f5f7 底、近黑 #1d1d1f 正文、强调色 #5856d6；同时支持深色模式和手机宽度。改界面后在手机宽度和深色模式下都看一遍，文字对比度保持 WCAG AA。

## 本地预览

直接双击 `index.html` 就能打开（不需要服务器）。也可以在这个文件夹里运行 `python -m http.server 8765`，再打开 http://localhost:8765 。
