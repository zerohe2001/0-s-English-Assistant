# 🚀 Vercel 部署指南

## ⚠️ 重要：部署前必读

### API Keys 安全配置

**当前架构**：API keys 在前端代码中（适合本地开发）
**生产环境**：需要配置环境变量

---

## 📋 部署步骤

### 1. 访问 Vercel 并导入项目

1. 访问 [vercel.com](https://vercel.com)
2. 点击 "Add New Project"
3. 导入你的 GitHub 仓库: `zerohe2001/0-s-English-Assistant`

### 2. ⚡ 配置环境变量（关键步骤）

在 Vercel 项目设置中，添加以下环境变量：

```
VITE_GEMINI_API_KEY=你的_Gemini_API_Key
VITE_DEEPGRAM_API_KEY=你的_Deepgram_API_Key
```

**获取 API Keys：**
- **Gemini API**: https://aistudio.google.com/app/apikey
- **Deepgram API**: https://console.deepgram.com/

### 3. 构建设置

Vercel 会自动检测 Vite 项目，默认设置通常正确：

```
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### 4. 部署

点击 "Deploy" 按钮，等待构建完成（约 1-2 分钟）

---

## 🔒 安全建议

### ⚠️ 当前限制

**前端 API Keys 风险**：
- 当前架构将 API keys 编译到前端 JavaScript
- 任何人都可以在浏览器开发者工具中查看
- 可能导致 API quota 被他人使用

### 🛡️ 生产环境推荐（可选但强烈建议）

为了安全的公开部署，应该将 API 调用移到后端：

#### 方案 1：Vercel Serverless Functions（推荐）

1. 创建 `api/gemini.ts`:
```typescript
import { GoogleGenAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // API key 保存在服务器端
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  const { prompt } = req.body;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt
  });

  res.json(response);
}
```

2. 前端调用:
```typescript
// 替代直接调用 Gemini
const response = await fetch('/api/gemini', {
  method: 'POST',
  body: JSON.stringify({ prompt })
});
```

#### 方案 2：使用访问限制

在 Vercel 设置中：
1. 启用 "Password Protection"
2. 或使用 Vercel Authentication
3. 限制访问域名

---

## 🚀 部署后验证

### 检查清单

- [ ] 网站可以访问
- [ ] 环境变量正确配置（检查 Vercel 环境变量页面）
- [ ] 语音识别正常工作（Deepgram）
- [ ] AI 功能正常（Gemini）
- [ ] 无控制台错误
- [ ] 性能符合预期（<200ms 语音识别）

### 性能监控

Vercel 提供内置的 Analytics：
- 访问量
- 响应时间
- 错误率
- Web Vitals

---

## 🔧 常见问题

### 1. Deepgram 语音识别错误

**症状**：控制台反复显示 "❌ Deepgram error"，语音识别无法工作

**可能原因**：
- Deepgram API 密钥未配置或配置错误
- API 密钥无效或已过期
- API 配额已用尽（免费额度 $200）
- 环境变量名称错误

**解决方案**：
```bash
# 1. 检查 Vercel 环境变量配置（必须以 VITE_ 开头）
VITE_GEMINI_API_KEY=你的_Gemini_密钥
VITE_DEEPGRAM_API_KEY=你的_Deepgram_密钥

# 2. 确认 Deepgram 账户状态
# 访问 https://console.deepgram.com/
# 检查余额和 API 密钥是否有效

# 3. 重新部署（修改环境变量后必须重新部署）
# 在 Vercel 项目页面点击 "Redeploy"
```

### 2. API keys 不工作

**症状**：API 调用失败，控制台显示 "API key not found"

**解决方案**：
```bash
# 检查环境变量名称必须以 VITE_ 开头（Vite 要求）
VITE_GEMINI_API_KEY=...
VITE_DEEPGRAM_API_KEY=...

# 重新部署
```

### 3. 构建失败

**症状**：Vercel 构建过程中出错

**解决方案**：
```bash
# 本地测试构建
npm run build

# 检查 package.json 依赖
npm install
```

### 4. 运行时错误

**症状**：部署成功但运行时报错

**解决方案**：
- 检查 Vercel 函数日志
- 查看浏览器控制台
- 验证环境变量设置

### 5. API 配额耗尽

**症状**：Gemini 或 Deepgram API 达到限额

**解决方案**：
- 实施访问限制（密码保护）
- 添加速率限制
- 监控 API 使用情况
- 考虑升级 API 计划

---

## 📊 预期性能指标

部署后应达到的性能（基于优化）：

| 指标 | 目标 | 实际 |
|------|------|------|
| **First Contentful Paint** | < 1.5s | 检查 Vercel Analytics |
| **语音识别延迟** | < 200ms | 浏览器 DevTools |
| **AI 响应时间** | 0.7-1.5s | 浏览器 Network |
| **页面加载时间** | < 2s | Vercel Analytics |

---

## 🎯 下一步

1. ✅ 完成 Vercel 部署
2. 📊 监控性能和使用情况
3. 🔒 如果公开访问，实施 API 代理（推荐）
4. 📈 收集用户反馈
5. 🔄 持续优化

---

## 📞 支持资源

- **Vercel 文档**: https://vercel.com/docs
- **Vite 文档**: https://vitejs.dev/
- **项目性能报告**: 查看 `PERFORMANCE_OPTIMIZATIONS.md`

---

**祝部署顺利！** 🚀

如有问题，检查 Vercel 部署日志或项目文档。
