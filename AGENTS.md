# GANGAN · 项目规则（Codex 和 Claude Code 共用）

GANGAN 是一个纯静态的法语词汇学习网站，两个人一起维护：一人用 Claude Code，一人用 Codex。
**这份文件是唯一的项目规则。** Codex 会自动读它，Claude Code 通过 `CLAUDE.md` 读它。改规则只改这里。

- GitHub 仓库：https://github.com/ACXX727/French-Learning
- 网站：https://acxx727.github.io/French-Learning/ （推送到 `main` 后一两分钟自动更新）

## 1. 同步：两个人不能同时改

1. **动手前**：`git pull --rebase origin main`，拿到对方的最新改动。
2. **一次只做一件事**，做完马上提交推送，缩短两边同时改的时间。
3. **推送被拒绝**（对方先推了）：`git pull --rebase origin main`，没有冲突就再推。
4. **遇到冲突**：先停下来，告诉用户冲突在哪个文件、两边各改了什么，问用户保留哪边。
5. **绝对不要** `git push --force`，不要改写已经推送的历史（rebase / amend 已推送的提交、filter-branch 等）。

## 2. 什么时候提交推送

| 改动 | 做法 |
|---|---|
| 小改动：改文字、修 bug、调样式 | 自己检查通过后，简单告诉用户改了什么，然后提交推送 |
| 大改动：加新课、改页面结构、改动多个模块 | 先让用户在本地预览确认，确认后再提交推送 |
| 用户说“先别推送” | 只提交到本地，等用户说再推 |

- 提交说明用中文写清楚改了什么。**不要加 `Co-Authored-By` 之类的 AI 署名行。**
- 提交身份用各自 GitHub 的匿名邮箱（`…@users.noreply.github.com`），设在本仓库：`git config --local user.email …`。

## 3. 目录

```
index.html            页面结构（HTML）
app.css               全部样式，每条规则一行；后面的规则覆盖前面的
app.js                全部交互逻辑
lessons/index.js      课程列表 + 默认打开的课
lessons/L6.js         一课的全部内容：词卡、看图练习、说明、录音索引
lessons/L6/           这一课的图片、练习图（practice/）、录音（audio/）
materials/            新课原始材料（课本原文，只留本机，已被 .gitignore 排除）
tools/lessonio.py     课程文件读写
tools/check_lesson.py 校验课程数据
tools/make_practice.py 按课程文件里的 tiles 生成看图练习图片
tools/make_audio.py   用 Piper 生成法语录音
.claude/skills/add-lesson/SKILL.md   加一课 / 更新一课的完整流程（两个 AI 都按它做）
sw.js                 离线缓存
```

## 4. 不能乱动的东西

- **学习进度**：`app.js` 里的 `storageKey()`（L6 的键是 `lexique-l6-v1`）、已有词卡和看图练习的 `id`。学习记录、收藏、草稿都按它们保存在浏览器里，一改就丢。
- **课程文件** `lessons/*.js` 的格式是 `lexiqueData({...});`，里面是 JSON。**只能用 `tools/lessonio.py` 的 `read` / `write` 读写**（它会统一排版），改完运行 `python tools/check_lesson.py`，必须全部通过。
- **隐私**：不提交 `materials/` 里的课本原文；不把 DeepSeek API Key 或任何密钥写进文件。
- **缓存**：替换了同名的图片或录音，要把 `sw.js` 里的 `CACHE` 版本号加一。只改 `index.html`、`app.css`、`app.js`、`lessons/*.js` 不需要。

## 5. 加一课 / 更新一课

按 `.claude/skills/add-lesson/SKILL.md` 一步步做。要点：

- 课本材料放在 `materials/<课号>/`。
- 看图练习每组要有 `ask`（一个问题）、`points`（答题步骤）、`frame`（带“…”的句型）、`words`（提示词）。**参考答案里的每个词都必须在 `frame` 或 `words` 里出现过。**
- 练习图的拼图布局写在课程文件的 `tiles` / `cols` / `numbered` 里，用 `tools/make_practice.py` 生成。这个脚本里不放任何课程内容，两个人加不同的课也不会互相覆盖。
- 录音需要下载 Piper 模型，先征得用户同意；不生成录音时网页会用系统法语语音。

## 6. 改界面时

- 风格：Apple 风格，浅色 `#f5f5f7` 底、近黑 `#1d1d1f` 正文、强调色 `#5856d6`；同时支持深色模式和手机宽度。
- 样式加在 `app.css` 对应的位置，每条规则一行；深色模式写在文件末尾的 `@media(prefers-color-scheme:dark)` 里。
- 改完在桌面宽度、手机宽度、深色模式下都看一遍，文字对比度保持 WCAG AA（4.5:1 以上）。

## 7. 本地预览

直接双击 `index.html`（不需要服务器），或者运行 `python -m http.server 8765` 再打开 http://localhost:8765 。
