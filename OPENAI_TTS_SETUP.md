# OpenAI TTS Setup Guide

## 为什么换成 OpenAI TTS？

- **Edge TTS 问题**：在 Vercel 上超时（>60秒）
- **Google TTS 问题**：API key 权限配置复杂，音质不够自然
- **OpenAI TTS 优势**：
  - ✅ **最真实的人声** (行业领先，用户偏好率 43%)
  - ✅ **超快** (200ms 延迟)
  - ✅ **配置简单** (只需一个 API key)
  - ✅ **价格便宜** (你的使用量完全在免费额度内)

## 步骤 1：获取 OpenAI API Key（3分钟）

### 1.1 访问 OpenAI Platform
打开：https://platform.openai.com/

### 1.2 注册/登录账号
- 如果没有账号，点击 "Sign up" 注册
- 如果有账号，直接登录

### 1.3 创建 API Key
1. 登录后，点击右上角头像
2. 选择 **"View API keys"** 或直接访问：https://platform.openai.com/api-keys
3. 点击 **"Create new secret key"**
4. 给 key 起个名字（如 "english-assistant-tts"）
5. **复制 API key**（类似：`sk-proj-...`）
6. ⚠️ 重要：这个 key 只显示一次，一定要复制保存好！

### 1.4 检查余额（可选）
- 访问：https://platform.openai.com/usage
- 新用户通常有 $5-18 免费额度
- 你的使用量：每月大约 0.1-0.3 美元（几乎免费）

## 步骤 2：添加 API Key 到 Vercel

### 2.1 打开 Vercel Dashboard
访问：https://vercel.com/dashboard

### 2.2 进入项目设置
1. 找到你的项目 "activevocab"
2. 点击项目名称
3. 点击顶部 **"Settings"** 标签
4. 左侧菜单点击 **"Environment Variables"**

### 2.3 添加环境变量
1. 点击 **"Add New"**
2. **Name**：`OPENAI_API_KEY`
3. **Value**：粘贴你刚才复制的 API key（`sk-proj-...`）
4. **Environments**：勾选所有（Production, Preview, Development）
5. 点击 **"Save"**

### 2.4 重新部署
1. 回到 **"Deployments"** 标签
2. 点击最新的 deployment 右侧的 **"..."** 菜单
3. 点击 **"Redeploy"**
4. 等待部署完成（1-2分钟）

## 步骤 3：测试

1. 刷新你的网页：https://activevocab.vercel.app
2. 点击任何发音按钮
3. 应该听到超级真实的人声！🎉

## 可用的语音选项

如果你想换其他声音，可以修改 `services/tts.ts` 中的默认语音：

```typescript
// 默认：Nova - 女声，温暖自然（最像真人）
export async function speak(text: string, voiceName: string = 'nova')

// 其他选项：
// 'alloy' - 中性平衡，男女都适合
// 'echo' - 男声，温暖有吸引力
// 'shimmer' - 女声，明亮有活力
// 'fable' - 英式口音，富有表现力
// 'onyx' - 深沉男声，权威感
```

## 费用说明

### OpenAI TTS 定价：
- **价格**：$15 / 百万字符
- **你的使用量**：每天约 1000-3000 字符 = 每月约 3-9 万字符
- **每月费用**：$0.45 - $1.35（不到 10 元人民币）
- **免费额度**：新用户有 $5-18 免费额度，够用几个月！

### 与其他方案对比：
| 服务 | 价格 | 音质 | 速度 | 稳定性 |
|------|------|------|------|--------|
| OpenAI TTS | $15/百万字符 | ⭐️⭐️⭐️⭐️⭐️ | 200ms | ⭐️⭐️⭐️⭐️⭐️ |
| Google TTS | $16/百万字符 | ⭐️⭐️⭐️ | 2-5s | ⭐️⭐️⭐️⭐️ |
| Edge TTS | 免费 | ⭐️⭐️⭐️⭐️ | 超时 | ⭐️ (不稳定) |

## 故障排查

### 如果没有声音：
1. 打开浏览器 Console（F12）
2. 查看错误信息：
   - 如果显示 **"OpenAI API key not configured"**：
     - 检查 Vercel 环境变量是否正确添加
     - 确保变量名是 `OPENAI_API_KEY`（注意大小写）
     - 确保重新部署了项目

   - 如果显示 **401 错误**：
     - API key 无效或已过期
     - 重新生成一个新的 API key

   - 如果显示 **429 错误**：
     - 超出速率限制或余额不足
     - 检查 OpenAI 账户余额：https://platform.openai.com/usage

### 正常日志应该显示：
```
🎤 Using OpenAI TTS for: [你的文本]
✅ OpenAI TTS playback completed
```

### 如果看到 fallback 警告：
```
❌ OpenAI TTS failed, using browser fallback
⚠️ Using fallback speechSynthesis
```
说明 OpenAI API 调用失败了，检查上面的错误日志。

## 联系支持

如有问题，提供以下信息：
- Console 的完整错误日志
- Vercel deployment 的 Functions 日志
- 你的 OpenAI API key 的前 10 个字符（不要发完整 key！）

## 资源链接

- OpenAI Platform: https://platform.openai.com/
- OpenAI API Keys: https://platform.openai.com/api-keys
- OpenAI Usage Dashboard: https://platform.openai.com/usage
- OpenAI TTS Documentation: https://platform.openai.com/docs/guides/text-to-speech
- Vercel Dashboard: https://vercel.com/dashboard
