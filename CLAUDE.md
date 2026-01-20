# 🤖 Claude Collaboration Rules

This document outlines the rules and workflows for Claude Code when working on this project.

---

## 📋 Core Rules

### 1. **Always Push After Completing a Feature or Bug Fix**

**Rule**: Every time Claude completes a feature implementation or bug fix, Claude **MUST** push the code to Git immediately.

**Why**: This allows you (the user) to:
- ✅ Check the changes in real-time
- ✅ See the deployment on Vercel (auto-deploys from `main` branch)
- ✅ Test the feature immediately in production
- ✅ Review the commit history and understand what was changed

**Workflow**:
```bash
# After completing any feature or fix:
git add -A
git commit -m "descriptive message"
git push origin main
```

**Examples of when to push**:
- ✅ Fixed a bug (e.g., "fix: Correct word sync logic")
- ✅ Added a new feature (e.g., "feat: Add ReadingArticles cloud sync")
- ✅ Updated UI (e.g., "feat: Improve Library word filters")
- ✅ Modified database schema (e.g., "feat: Add new Profile fields")

**Do NOT push**:
- ❌ In the middle of a multi-step refactor (wait until complete)
- ❌ When code is broken or incomplete
- ❌ During investigation/exploration (read-only operations)

---

### 2. **Commit Message Format**

Use conventional commit format:

```
<type>: <description>

- Detail 1
- Detail 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `test`: Adding tests
- `chore`: Maintenance tasks

---

### 3. **Database Migrations**

When creating database migrations:
1. Create migration SQL file (e.g., `supabase-migration-*.sql`)
2. Update `supabase-schema.sql` (master schema)
3. Update TypeScript interfaces in `services/supabase.ts`
4. Update sync functions if needed
5. **Push code first**
6. **Then inform user** to run the SQL migration in Supabase Dashboard

**Important**: Never assume the user has run the migration. Always remind them after pushing.

---

### 4. **Testing Before Push**

Before pushing, Claude should verify:
- ✅ No TypeScript errors
- ✅ Code compiles successfully
- ✅ No obvious runtime errors
- ✅ Changes are complete (not half-done)

If local dev server shows errors, fix them before pushing.

---

### 5. **Communication After Push**

After pushing, Claude should always tell the user:
1. ✅ What was changed
2. ✅ The commit hash (e.g., `commit: abc1234`)
3. ✅ Vercel deployment status (auto-deploys in 1-3 minutes)
4. ✅ Any manual steps required (e.g., database migration, environment variables)

**Example**:
```
✅ Pushed! commit: 588adca

Changes:
- Reordered Library tags: To Learn → Learned → All
- Added word counts to each filter

Vercel will auto-deploy in 1-3 minutes.
```

---

## 🚀 Deployment Workflow

```
Code Change → Git Push → GitHub → Vercel Auto-Deploy (1-3 min) → Live
```

**User can check**:
- GitHub: See commits at https://github.com/zerohe2001/0-s-English-Assistant/commits/main
- Vercel: See deployments at https://vercel.com/dashboard

---

## 📝 Documentation Updates

When making significant changes:
- Update relevant `.md` files (e.g., `SUPABASE_SETUP.md`, `README.md`)
- Add entries to `BUGFIX_LOG.md` for bug fixes
- Update `CLOUD_SYNC_FIX_INSTRUCTIONS.md` for sync-related changes

---

## 🎯 Summary

**Golden Rule**:
> **Every completed feature or bug fix MUST be pushed to Git immediately so the user can verify the changes.**

This ensures transparency, allows real-time testing, and maintains a clean commit history.

---

## 👤 User Information

**Email**: lin.hecafa@gmail.com

**Query user_id**:
```sql
SELECT id FROM auth.users WHERE email = 'lin.hecafa@gmail.com';
```

---

**Last Updated**: 2026-01-20
