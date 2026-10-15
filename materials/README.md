# materials · 新课程收件箱

把新一课的原始材料放进以 课号 命名的文件夹，例如：

```
materials/L7/课件.pdf
materials/L7/补充词汇.docx
materials/L7/练习照片1.jpg
```

然后对 Claude 说「更新 L7」。Claude 会按 `.claude/skills/add-lesson` 里的流程生成 `lessons/L7.js`、图片和录音，
本地预览确认后再推送到 GitHub。

这个文件夹里除了本说明，**不会上传到 GitHub**（见 `.gitignore`），课本原文只留在本机。
