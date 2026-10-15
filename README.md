# GANGAN · 法语词汇学习

一个纯静态的法语词汇学习页：记忆卡片（学习 / 复习两个模块，间隔复习）、全部词库、听音拼写；页面右侧是独立的“看图表达”模块，可接入 DeepSeek 做 AI 纠错。支持多课，左上角切换。

- 打开方式：GitHub Pages 网址，手机上在浏览器菜单里选“添加到主屏幕”，就能像 App 一样使用。`网址#L6` 可以直接打开某一课。
- 朗读：单词和例句配有固定的法国法语录音（开源 Piper 语音，音色 fr_FR-siwis，训练数据 SIWIS 语料 CC BY 4.0），由 `tools/make_audio.py` 生成；没有录音时改用设备自带的法语语音。
- 深色模式跟随系统；统计里显示连续学习天数。
- 离线：首次打开后会缓存页面和图片，断网也能用。
- 进度：每课分开保存在当前浏览器（localStorage），不会自动跨设备同步；换设备时用右上角“导出进度 / 导入”。

## 目录

```
index.html            页面（加新课不用改）
lessons/index.js      课程列表 + 默认打开的课
lessons/L6.js         一课的全部内容：词卡、练习、说明
lessons/L6/           这一课的图片（WebP）
materials/            新课原始材料收件箱（只留本机，不上传）
tools/check_lesson.py 校验课程数据
.claude/skills/add-lesson  让 Claude 按固定流程加新课
```

## 加一课

把材料放进 `materials/L7/`，对 Claude 说「更新 L7」。手动添加的话：写好 `lessons/L7.js`，
在 `lessons/index.js` 里登记，再运行 `python tools/check_lesson.py L7` 校验。

本地直接双击 `index.html` 就能打开。课程文件写成 `lexiqueData({...});` 的形式（内容就是 JSON），
所以不需要服务器；用 `tools/lessonio.py` 读写。
