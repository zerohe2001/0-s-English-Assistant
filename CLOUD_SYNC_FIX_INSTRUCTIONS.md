# 🔧 云端同步修复 - 执行指南

## ⚠️ 重要提示
**在执行任何操作前，请完整阅读本文档！**

---

## 📊 当前状态
- ✅ 代码已修改完成
- ✅ 已推送到GitHub (commit: 2a9fe9e)
- ✅ Vercel 正在自动部署（1-3分钟）
- ⏳ 等待你执行数据库迁移

---

## 🎯 第一步：执行数据库迁移（必须！）

### 1.1 登录 Supabase
1. 打开 https://supabase.com/dashboard
2. 选择你的项目
3. 点击左侧菜单 **SQL Editor**

### 1.2 打开迁移文件
- 在你的项目中打开文件：`supabase-migration-20260120.sql`
- **完整复制**文件内容

### 1.3 执行迁移
1. 在 Supabase SQL Editor 中粘贴完整SQL
2. 点击右下角 **Run** 按钮
3. ⏱️ 等待执行完成（约10-30秒）

### 1.4 验证结果
执行完成后，你应该看到以下输出：

```
✅ Migration completed successfully! Check verification results above.
```

往上滚动查看验证信息，应该显示：
- 6行新字段信息（phonetic, added_at, user_sentences, review_count, deleted, deleted_at）
- 数据统计（total_words, deleted_count, words_with_sentences等）

### 1.5 如果出错
如果看到任何 ERROR，**立即停止**并：
1. 截图错误信息
2. 不要继续操作
3. 联系我帮你排查

---

## 🚀 第二步：等待代码部署

### 2.1 检查 Vercel 部署状态
1. 打开 https://vercel.com/dashboard
2. 找到你的项目
3. 查看最新部署状态
4. 等待显示 ✅ Ready

### 2.2 预计时间
- 通常 1-3 分钟
- 如果超过5分钟，刷新页面检查

---

## ✅ 第三步：测试验证

### 3.1 清除本地缓存（重要！）
1. 打开你的应用网址
2. 打开浏览器开发者工具（F12）
3. 进入 **Application** 或 **存储** 标签
4. 找到 **Local Storage**
5. 找到 `active-vocab-storage` 键
6. **删除它**（右键 → Delete）
7. 刷新页面

### 3.2 测试登录
1. 输入邮箱密码登录
2. 打开浏览器 Console（F12 → Console）
3. 查看是否有以下日志：
   ```
   ✅ fetchWords: Loaded X words from cloud (Y active)
   🔄 Persist merge: Using cloud words, Using cloud profile
   ✅ Data loaded from cloud
   ```

### 3.3 验证数据
- 检查 **Vocabulary** 页面：你的单词应该都在
- 检查 **Settings** 页面：Profile信息应该都在
- 尝试添加一个测试单词
- 退出登录，重新登录
- 检查测试单词是否还在

### 3.4 测试软删除
1. 删除一个单词
2. 退出登录
3. 重新登录
4. 检查：
   - Vocabulary 页面**不显示**被删除的单词 ✅
   - 但在 Supabase 后台能看到 `deleted=true` ✅

---

## 🔍 第四步：检查 Supabase 数据

### 4.1 查看 words 表
1. 进入 Supabase Dashboard
2. 点击 **Table Editor** → **words**
3. 检查是否有新列：
   - phonetic
   - added_at
   - user_sentences (JSONB类型)
   - review_count
   - deleted
   - deleted_at

### 4.2 验证数据同步
1. 在网页添加一个新单词 "test-sync-check"
2. 等待3秒
3. 刷新 Supabase Table Editor
4. 应该能看到新单词，并且：
   - `deleted = false`
   - `added_at` 有值
   - 如果有音标，`phonetic` 有值

---

## 🎉 成功标志

如果以下所有都成功，说明修复完成：

✅ **数据库迁移成功**
   - 6个新字段都存在
   - 验证查询都显示正常

✅ **代码部署成功**
   - Vercel 显示 Ready
   - 打开网站没有报错

✅ **登录加载成功**
   - Console 显示 "Data loaded from cloud"
   - Profile 和 Words 都正确显示

✅ **数据同步正常**
   - 添加单词后在 Supabase 能看到
   - 所有字段都有正确的值

✅ **软删除生效**
   - 删除的单词不显示在列表中
   - 但在数据库中 deleted=true

---

## 🆘 如果遇到问题

### 问题1：数据库迁移失败
**症状**：执行SQL时看到 ERROR

**解决方案**：
1. 截图完整错误信息
2. 检查是否是权限问题
3. 如果提示字段已存在，可能之前已经添加过，继续下一步

### 问题2：登录后还是没有数据
**症状**：Console 显示 "Loaded 0 words from cloud"

**排查步骤**：
1. 确认 Supabase 后台 words 表有数据
2. 检查 user_id 是否匹配（在 words 表和 auth.users 表对比）
3. 打开 Console 看是否有 Supabase 错误日志

### 问题3：重新登录数据又丢了
**可能原因**：
- 数据库迁移没执行
- 字段名不匹配
- RLS 权限问题

**解决方案**：
1. 去 Supabase 验证 words 表结构
2. 查看 Console 是否有权限错误
3. 检查 Supabase RLS 策略是否启用

---

## 📝 技术细节说明

### 修复的核心问题

#### 问题1：数据库字段缺失
**之前**：words 表只有基础字段
**现在**：添加了 phonetic、deleted、user_sentences 等完整字段
**影响**：如果不迁移，新字段数据无法保存到云端

#### 问题2：危险的 DELETE 策略
**之前**：
```typescript
// 每次同步都删除云端所有数据！
await supabase.from('words').delete().eq('user_id', user.id);
await supabase.from('words').insert(words);
```
**现在**：
```typescript
// 使用 UPSERT：更新已有，插入新的
await supabase.from('words').upsert(words, { onConflict: 'id' });
```
**影响**：不会再因为 localStorage 清空而丢失云端数据

#### 问题3：localStorage 覆盖云端数据
**之前**：persist middleware 会用 localStorage 覆盖刚加载的云端数据
**现在**：Cloud-First 策略，优先使用云端数据
**影响**：登录后看到的一定是云端最新数据

---

## 🎯 执行清单（Checklist）

请按顺序勾选：

- [ ] 阅读完整个文档
- [ ] 登录 Supabase SQL Editor
- [ ] 复制 `supabase-migration-20260120.sql` 完整内容
- [ ] 执行 SQL 迁移
- [ ] 验证看到成功消息和6个新字段
- [ ] 检查 Vercel 部署状态为 Ready
- [ ] 清除浏览器 localStorage
- [ ] 测试登录，查看 Console 日志
- [ ] 验证 Profile 和 Words 数据都在
- [ ] 测试添加新单词
- [ ] 测试退出重新登录
- [ ] 测试软删除功能
- [ ] 在 Supabase 后台验证数据正确

---

## ✨ 预期改进

修复完成后，你将获得：

1. **数据安全** 🛡️
   - 不会因为误操作丢失数据
   - 退出登录不会清空数据
   - 多设备数据保持同步

2. **完整功能** 📦
   - 所有单词字段都能正确保存
   - 音标信息保存到云端
   - 软删除后可以恢复

3. **稳定性** 🎯
   - UPSERT 策略更安全
   - Cloud-First 避免冲突
   - 详细日志便于排查

---

## 🤝 需要帮助？

如果遇到任何问题：
1. 截图错误信息（Console + Supabase）
2. 告诉我执行到哪一步
3. 我会立即帮你解决

祝修复顺利！🚀
