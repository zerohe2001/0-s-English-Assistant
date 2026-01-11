#!/bin/bash

# Direct Supabase Query Script
# 使用方法: bash direct-query.sh YOUR_SERVICE_ROLE_KEY

SUPABASE_URL="https://ibmjhqtxdqodohlbarnz.supabase.co"
USER_EMAIL="lin.hecafa@gmail.com"

# Check if service role key is provided
if [ -z "$1" ]; then
    echo "❌ 错误：请提供 service_role key"
    echo ""
    echo "使用方法："
    echo "  bash direct-query.sh YOUR_SERVICE_ROLE_KEY"
    echo ""
    echo "📝 如何获取 service_role key："
    echo "1. 在 Supabase Dashboard 页面向下滚动"
    echo "2. 找到 'service_role' 部分"
    echo "3. 点击 'Reveal' 显示密钥"
    echo "4. 复制并作为参数运行此脚本"
    echo ""
    exit 1
fi

SERVICE_ROLE_KEY="$1"

echo "🔗 连接到 Supabase..."
echo "📧 查询用户: $USER_EMAIL"
echo ""
echo "=" | awk '{s=""; for(i=1;i<=60;i++){s=s"="}; print s}'
echo ""

# Query 1: Get all users from auth.users (using admin endpoint)
echo "⏳ 正在查询用户列表..."
USERS_RESPONSE=$(curl -s -X GET \
  "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

# Check if user exists
USER_ID=$(echo "$USERS_RESPONSE" | grep -o "\"email\":\"$USER_EMAIL\"" -A 20 | grep -o "\"id\":\"[^\"]*\"" | head -1 | cut -d'"' -f4)

if [ -z "$USER_ID" ]; then
    echo "❌ 未找到用户: $USER_EMAIL"
    echo ""
    echo "📊 数据库中的所有用户："
    echo "$USERS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$USERS_RESPONSE"
    exit 1
fi

echo "✅ 找到用户！"
echo "User ID: $USER_ID"
echo ""

# Query 2: Get profile
echo "📋 查询个人资料..."
PROFILE=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${USER_ID}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

echo "👤 个人资料："
echo "$PROFILE" | python3 -m json.tool 2>/dev/null || echo "$PROFILE"
echo ""

# Query 3: Get words
echo "📚 查询单词列表..."
WORDS=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/words?user_id=eq.${USER_ID}&order=created_at.desc" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

WORD_COUNT=$(echo "$WORDS" | grep -o "\"id\"" | wc -l | tr -d ' ')
echo "📝 单词总数: $WORD_COUNT"
echo ""
echo "前 5 个单词："
echo "$WORDS" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for i, word in enumerate(data[:5], 1):
        status = '✅ 已学习' if word.get('learned') else '📖 学习中'
        print(f\"{i}. {status} {word.get('text', 'N/A')}\")
except:
    print('解析失败')
" 2>/dev/null
echo ""

# Query 4: Get token usage
echo "💰 查询 API 使用统计..."
TOKEN_USAGE=$(curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/token_usage?user_id=eq.${USER_ID}" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}")

echo "API 使用："
echo "$TOKEN_USAGE" | python3 -m json.tool 2>/dev/null || echo "$TOKEN_USAGE"
echo ""

echo "=" | awk '{s=""; for(i=1;i<=60;i++){s=s"="}; print s}'
echo "✅ 查询完成！"
echo ""
echo "💾 完整数据已保存到: user-data-${USER_ID:0:8}.json"

# Save all data to file
cat > "user-data-${USER_ID:0:8}.json" <<EOF
{
  "user_email": "$USER_EMAIL",
  "user_id": "$USER_ID",
  "profile": $PROFILE,
  "words": $WORDS,
  "token_usage": $TOKEN_USAGE
}
EOF

echo "📁 文件位置: $(pwd)/user-data-${USER_ID:0:8}.json"
