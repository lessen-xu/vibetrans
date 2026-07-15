# VibeTrans

口语化英语翻译。把中文翻成母语者真正会说的英语，或者解读英语俚语和网络用语。

在线使用：https://lessen-xu.github.io/vibetrans/

## 功能

- 双向：中文 → 地道英语口语；英语俚语、缩写 → 中文解读
- 场景：日常、社交媒体、游戏、短信私聊、邮件
- 可自定义对话对象（如父母、好朋友、导师、亲密对象），影响语气和用词，不填则不限
- 自带 API Key，支持任意 OpenAI 兼容接口（如 DeepSeek）；Key 只保存在浏览器本地，请求直接发往所填的 API 地址

## 本地开发

```bash
npm install
npm run dev
```

## 部署

推送到 main 分支后，GitHub Actions 自动构建并发布到 GitHub Pages。
