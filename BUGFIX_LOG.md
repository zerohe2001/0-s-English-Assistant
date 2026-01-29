# Bug Fix Log

记录项目中发现和修复的问题，避免重复发生。

---

## 2026-01-28

### 0. 云同步与复习稳定性修复
**时间**: 2026-01-28
**问题**:
1. 阅读文章的 JSON 解析失败会导致加载崩溃
2. 复习单词没有句子时会卡住或空白
3. AI 接口返回非 JSON 时错误处理会二次失败
4. 同步/加载任一失败导致整体失败且无提示
**解决**:
- 增加安全 JSON 解析，解析失败自动降级
- 复习无有效句子时自动跳过并提示
- 统一 AI 接口错误处理与网络异常兜底
- 同步/加载改为部分失败可继续，并提示用户
**修改的文件**:
- `store.ts`
- `components/ReviewWord.tsx`
- `services/geminiClient.ts`
**提交**: [待提交]

### 1. 词表选择强制 5 个单词
**时间**: 2026-01-28
**问题**: 选词开始学习时数量不固定，打卡口径难以统一
**解决**:
- 词表选择限制最多 5 个
- 仅当选中正好 5 个时允许开始学习
**修改的文件**:
- `pages/Vocabulary.tsx`
**提交**: [待提交]

## 2026-01-20

### 0. Library 重复单词检测与智能清洗
**时间**: 2026-01-20
**改进**: Library添加单词时缺少重复检测和单词清洗功能
**问题**:
1. 用户可以重复添加相同单词，导致列表混乱
2. 批量添加时格式混乱（中文释义、音标、词性标注等）
**解决**:

**单词清洗逻辑** (bulkAddWords):
```javascript
// 支持的混乱格式示例：
previous 之前的 → previous
hint 暗示v. → hint
resume ['rezumeɪ] 简历 → resume
Unaware 无意识的 /ˌʌnəˈwer/ → unaware
further adj.adv.v. 更远 → further
popped into my head → popped into my head (保留短语)
```

清洗规则:
- 移除音标 `[...]` 和 `/.../`
- 移除中文字符及之后的所有内容
- 移除词性标注 (adj. adv. v. n. 等)
- 移除翻译符号 `=` 之后的内容
- 提取前1-4个英文单词（保留短语）
- 统一转小写

**重复检测逻辑**:

**单个添加模式**:
1. 检测是否已存在（忽略大小写）
2. 发现重复 → 弹窗确认
3. 用户可选择"Add anyway"强制添加

**批量添加模式**:
1. 自动清洗所有单词
2. 检测所有重复单词
3. 显示重复词复选框列表（默认不勾选）
4. 用户选择要添加的重复词
5. 自动添加所有新词 + 用户选中的重复词

**UI设计**:
```
Found Existing Words
Select duplicates you want to add anyway

☐ hello (added 2026-01-10)
☐ world (added 2026-01-15)

默认不勾选 = 跳过
勾选 = 添加为新的一条

[Cancel] [Add Selected]

提示: "3 new words + 1 duplicate will be added"
```

**修改的文件**:
- `store.ts` - addWord 返回 duplicate 信息
- `store.ts` - bulkAddWords 返回 duplicates + newWords
- `store.ts` - 新增 bulkAddWordsForce 强制添加
- `store.ts` - 增强 cleanWord 清洗逻辑
- `Library.tsx` - 添加 duplicate modal 和处理逻辑

**提交**: [待提交]
**教训**:
1. 批量导入功能要考虑真实数据的混乱程度
2. 重复检测要提供灵活的用户选择（不是简单的yes/no）
3. 复选框默认状态要符合安全原则（不勾选=不添加重复）

---

## 2026-01-16

### 0. Review录音交互bug修复（两个关键问题）
**时间**: 2026-01-16
**问题1**: 录音后没有Retry/Next/Skip按钮
**原因**: `stopRecording`和`handleTextSubmit`调用`setStep('comparing')`更新了本地state，但组件读取的是`reviewState.step`（store state），状态不同步
**解决**: 改为`setReviewStep('comparing')`更新store state

**问题2**: Review使用两个按钮（Start/Stop），Learn使用一个toggle按钮，交互不一致
**原因**: VoiceOrTextInput设计时使用了分离的`onStartRecording`/`onStopRecording`回调
**解决**:
- VoiceOrTextInput增加`onToggleRecording`可选prop（单按钮toggle模式）
- 保留legacy的分离回调模式向后兼容
- ReviewWord改用`toggleRecording`单函数处理开始/停止
- 按钮样式根据`isRecording`动态变化（黑色→红色闪烁）
- 文字提示从"Click to start"变为"Recording... Tap to Stop"
**提交**: 7b89e97
**教训**:
1. 组件状态管理要统一（要么都用store，要么都用local state）
2. 相同交互流程应该使用相同的UI模式（单按钮toggle）

## 2026-01-12

### 0. Review页面添加进度保存和Back按钮
**时间**: 2026-01-12
**改进**: Review页面缺少Back按钮和进度保存，体验不如Learn页面
**解决**:
- 创建独立的ReviewState在store中管理状态
- 添加Back按钮（左上角）返回上一句子/单词
- 添加Exit按钮（右上角）退出到列表
- 显示"Word X/Y"和"Sentence X/Y"进度
- 进度自动保存，可中途退出后恢复
- 创建VoiceOrTextInput共用组件，减少重复代码
**提交**: c0043ea, 9dd4362
**教训**: 重要流程应该有一致的UX（保存进度、返回按钮）

### 1. 复习间隔逻辑重新设计（遵循艾宾浩斯曲线）
**时间**: 2026-01-12
**改进**: 原设计第一次复习在7天后，不符合记忆规律
**原因**: 艾宾浩斯遗忘曲线显示，学习后1天内遗忘最快，需要及时复习
**新设计**:
- **初次学完 → 第1次**: 1天后
- **第1次 → 第2次**: 3天后（完美）/ 2天后（一般）/ 1天后（差）
- **第2次 → 第3次**: 7天后（完美）/ 3天后（一般）/ 1天后（差）
- **第3次 → 第4次**: 15天后（完美）/ 7天后（一般）/ 3天后（差）
- **第4次 → 第5次**: 30天后（完美）/ 15天后（一般）/ 7天后（差）
- **第5次+**: 90天后（完美）/ 30天后（一般）/ 15天后（差）

**新增字段**: `reviewCount` 跟踪成功复习次数，用于计算间隔
**提交**: [待提交]

### 1. Review页面显示错误单词
**时间**: 2026-01-12
**问题**: Review页面显示正在学习的单词（甚至未完成3个句子），而应该复习的单词却没有显示
**原因**: `isDueForReview`逻辑中，`if (!word.nextReviewDate) return true` 导致任何没有复习日期的单词都会显示
**解决**: 改为 `if (!word.learned || !word.nextReviewDate) return false`，只显示已学习且有复习日期的单词
**提交**: d87fc20

### 2. Library已学习单词显示优化
**时间**: 2026-01-12
**改进**: Library的learned单词列表显示添加日期，不够实用
**原因**: 用户更关心下次复习时间而非添加时间
**解决**: 已学习单词显示"Review on [日期]"，未学习单词显示"Added [日期]"
**提交**: 3d6b325

### 3. Vocabulary选择单词后跳转错误页面
**时间**: 2026-01-12
**问题**: 在Vocabulary选择单词后点击"Start Learning"，跳转到Today页面而非Learn页面
**原因**: 历史遗留bug，代码注释写"Navigate to Learn page"但实际是`navigate('/')`
**解决**: 改为`navigate('/learn')`
**提交**: 1c72db7
**注意**: 这是从最早版本就存在的bug

---

## 2026-01-11

### 4. Sentence 2显示"已保存"错误
**时间**: 2026-01-11
**问题**: 进入Sentence 2时显示"This sentence was previously saved"，但实际是新句子
**原因**: `saveUserSentence`保存的是字符串而非数组，导致`userSentences[wordId][1]`访问到字符串的第2个字符（空格），判断为truthy
**解决**: 修改`saveUserSentence`使用数组结构，通过`currentSentenceIndex`索引保存
**提交**: 50be0ce
**教训**: 数据结构要一致，字符串索引和数组索引完全不同

### 5. Review翻译显示为句号
**时间**: 2026-01-11
**问题**: Review页面中文翻译只显示一个句号"。"而非完整中文
**原因**: `ClickableText`组件使用`/\w/`正则表达式，只匹配ASCII字符，中文被当作标点符号
**解决**: 移除ClickableText包装，直接渲染中文文本
**提交**: 85639a7
**教训**: ClickableText仅适用于英文文本，不要用于中文

### 6. Review性能优化
**时间**: 2026-01-11
**改进**: 每次Review都调用AI比较，即使句子完全相同
**原因**: 未做快速检查，直接调用AI
**解决**: 添加`compareWithOriginal`函数，先检查精确匹配（忽略大小写/空格/标点），相同则跳过AI调用
**提交**: 2d5185c
**效果**: 节省API成本，提升响应速度

---

## 2026-01-09

### 7. Vocabulary选择的单词未被使用
**时间**: 2026-01-09
**问题**: 在Vocabulary选择5个单词开始学习，但系统使用的是默认选择的单词
**原因**: `handleStartSession`总是重新选择单词，忽略了`learningQueue`
**解决**: 先检查`learningQueue`是否存在，存在则使用，否则才选择新单词
**提交**: 5dce588

### 8. Back按钮导航错误
**时间**: 2026-01-09
**问题**: 在Sentence 2完成后点Back返回，显示输入界面而非完成结果
**原因**: `handleGoBack`清除了transcript/evaluation状态，然后useEffect才尝试恢复
**解决**: 移除`handleGoBack`中的状态清除，让useEffect根据保存的数据决定是恢复还是清除
**提交**: be01524, 5eaba5f

---

## 重要提醒

### 数据结构一致性
- `userSentences`应该是数组，按索引0/1/2存储三个句子
- 不要混用字符串和数组结构
- 访问前检查数据类型

### 组件使用限制
- `ClickableText`仅用于英文文本（基于`/\w/`正则）
- 中文文本直接渲染，不要包装

### 导航路径
- Today页面: `/`
- Learn页面: `/learn`
- Review页面: `/review`
- Vocabulary页面: `/vocabulary`
- Library页面: `/library`

### Review逻辑
- 只显示 `learned=true` 且有 `nextReviewDate` 的单词
- 必须 `today >= nextReviewDate`
- 不显示正在学习中的单词

### 性能优化
- 相同输入先做快速比较再调用AI
- 减少不必要的API调用
