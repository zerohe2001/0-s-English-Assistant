# Supabase 设置指南

本应用现在支持跨设备数据同步！按照以下步骤设置 Supabase。

## 第一步：创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com)
2. 点击 "Start your project" 注册账号（可以使用 GitHub 账号登录）
3. 创建新项目（New Project）：
   - **Organization**: 选择或创建一个组织
   - **Name**: `activevocab` 或任意名字
   - **Database Password**: 设置一个强密码（保存好，后面可能需要）
   - **Region**: 选择 `Northeast Asia (Tokyo)` 或离你最近的区域
   - 点击 "Create new project"

4. 等待项目创建完成（约2分钟）

## 第二步：获取 API Keys

项目创建完成后：

1. 在左侧菜单点击 **Settings** (齿轮图标)
2. 点击 **API**
3. 找到以下信息：
   - **Project URL**: 类似 `https://xxxxx.supabase.co`
   - **anon public key**: 一串很长的字符串

4. 复制这两个值，稍后需要添加到环境变量

## 第三步：创建数据库表

1. 在左侧菜单点击 **SQL Editor** (数据库图标)
2. 点击 **New Query**
3. 打开项目中的 `supabase-schema.sql` 文件
4. 复制全部内容粘贴到 SQL Editor
5. 点击右下角 **Run** 按钮执行

成功后你会看到 "Success. No rows returned" 消息。

## 第四步：配置环境变量

在项目根目录创建或编辑 `.env` 文件，添加：

```bash
# Existing API keys
VITE_GEMINI_API_KEY=your_existing_gemini_key
VITE_DEEPGRAM_API_KEY=your_existing_deepgram_key

# New Supabase configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
```

**重要提示**：
- 将上面的 `https://xxxxx.supabase.co` 替换为你的 Project URL
- 将 `your_anon_public_key_here` 替换为你的 anon public key
- `.env` 文件已在 `.gitignore` 中，不会被提交到 Git

## 第五步：Vercel 环境变量配置

如果你使用 Vercel 部署：

1. 访问 [vercel.com](https://vercel.com) 进入你的项目
2. 点击 **Settings** → **Environment Variables**
3. 添加以下两个变量：
   - `VITE_SUPABASE_URL` = 你的 Project URL
   - `VITE_SUPABASE_ANON_KEY` = 你的 anon public key

4. 重新部署项目使环境变量生效

## 第六步：启动应用

本地开发：
```bash
npm run dev
```

首次打开应用会看到登录/注册界面。

## 功能说明

✅ **数据同步**：
- 用户资料（名字、等级、目标等）
- 单词列表
- 学习进度
- 单词解释缓存
- Token 使用统计

✅ **跨设备访问**：
- 在手机上添加单词，电脑上立即可见
- 在电脑上学习，手机上进度同步
- 所有设备使用同一账号登录即可

✅ **离线支持**：
- 数据会先保存到本地
- 联网后自动同步到云端

## 安全说明

- 所有数据都加密传输 (HTTPS)
- Row Level Security (RLS) 确保用户只能访问自己的数据
- Supabase 免费额度：
  - 500MB 数据库存储
  - 5GB 带宽/月
  - 50,000 次请求/月
  - 对个人使用完全足够

## 故障排查

**Q: 登录后看不到数据？**
A: 检查浏览器控制台是否有错误，确保 API keys 配置正确

**Q: 提示 "Not authenticated"？**
A: 退出重新登录，或清除浏览器缓存

**Q: 数据没有同步？**
A: 检查网络连接，查看控制台是否有 Supabase 错误

**Q: 忘记密码？**
A: 在 Supabase Dashboard → Authentication → Users 可以重置密码

## 下一步

设置完成后，应用会自动处理数据同步。你可以：

1. 创建账号并登录
2. 开始添加单词
3. 在其他设备上用同一账号登录
4. 享受无缝的跨设备学习体验！
