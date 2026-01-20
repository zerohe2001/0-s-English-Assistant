# Google Cloud TTS Setup Guide

## 为什么换成 Google Cloud TTS？

- **Edge TTS 问题**：在 Vercel 上超时（>60秒），即使设置 maxDuration: 60 也会 504
- **Google TTS 优势**：快（2-5秒）、音质好（Neural2）、稳定可靠

## 步骤 1：获取 Google Cloud API Key（5分钟）

### 1.1 访问 Google Cloud Console
打开：https://console.cloud.google.com/

### 1.2 创建/选择项目
- 如果没有项目，点击 "Create Project"
- 项目名称随意（如 "english-assistant-tts"）
- 点击 "Create"

### 1.3 启用 Text-to-Speech API
1. 在搜索框输入 "Text-to-Speech API"
2. 点击 "Text-to-Speech API"
3. 点击 "Enable"（启用）

### 1.4 创建 API Key
1. 左侧菜单：点击 "APIs & Services" → "Credentials"
2. 点击顶部 "Create Credentials" → "API key"
3. **复制 API key**（类似：`AIzaSyC...`）
4. ⚠️ 重要：点击 "Restrict Key" 限制权限：
   - API restrictions → "Restrict key"
   - 选择 "Cloud Text-to-Speech API"
   - 点击 "Save"

## 步骤 2：添加 API Key 到 Vercel

### 2.1 打开 Vercel Dashboard
访问：https://vercel.com/dashboard

### 2.2 进入项目设置
1. 找到你的项目 "activevocab"
2. 点击项目名称
3. 点击顶部 "Settings" 标签
4. 左侧菜单点击 "Environment Variables"

### 2.3 添加环境变量
1. 点击 "Add New"
2. **Name**：`GOOGLE_CLOUD_TTS_API_KEY`
3. **Value**：粘贴你刚才复制的 API key
4. **Environments**：勾选所有（Production, Preview, Development）
5. 点击 "Save"

### 2.4 重新部署
1. 回到 "Deployments" 标签
2. 点击最新的 deployment 右侧的 "..." 菜单
3. 点击 "Redeploy"
4. 等待部署完成（1-2分钟）

## 步骤 3：测试

1. 刷新你的网页：https://activevocab.vercel.app
2. 点击任何发音按钮
3. 应该听到高质量的 Google TTS 语音！

## 可用的语音选项

如果你想换其他声音，可以修改 `services/tts.ts` 中的默认语音：

```typescript
// 女声（温暖自然）- 类似之前的 Ava
export async function speak(text: string, voiceName: string = 'en-US-Neural2-F')

// 其他选项：
// 'en-US-Neural2-J' - 女声，年轻活泼
// 'en-US-Neural2-D' - 男声，专业清晰
// 'en-US-Neural2-A' - 男声，温和友好
```

## 费用说明

- **免费额度**：每月 **100 万字符**
- 你的使用量：大约每天 1000-3000 字符
- **完全够用**，不会产生费用

## 故障排查

### 如果没有声音：
1. 打开浏览器 Console（F12）
2. 查看错误信息
3. 如果显示 "API key not configured"：
   - 检查 Vercel 环境变量是否正确添加
   - 确保重新部署了项目

### 如果显示 403 错误：
- 检查 API key 是否限制了正确的 API（Text-to-Speech API）
- 确认 API key 没有其他限制（如 HTTP referrer）

## 联系支持

如有问题，提供以下信息：
- Console 的完整错误日志
- Vercel deployment 的 Functions 日志
- 你的 Google Cloud 项目 ID
