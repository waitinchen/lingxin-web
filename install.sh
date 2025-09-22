#!/bin/bash

# 靈信 2.0 快速安裝腳本
# 使用方法: chmod +x install.sh && ./install.sh

set -e

echo "🚀 歡迎使用靈信 2.0 快速安裝腳本"
echo "========================================="

# 檢查系統需求
check_requirements() {
    echo "📋 檢查系統需求..."
    
    # 檢查 Node.js
    if ! command -v node &> /dev/null; then
        echo "❌ 未找到 Node.js，請先安裝 Node.js 18 或更高版本"
        echo "   下載地址: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "❌ Node.js 版本過低（當前: $(node -v)），需要 18 或更高版本"
        exit 1
    fi
    
    # 檢查包管理器
    if command -v pnpm &> /dev/null; then
        PKG_MANAGER="pnpm"
    elif command -v npm &> /dev/null; then
        PKG_MANAGER="npm"
    else
        echo "❌ 未找到 npm 或 pnpm"
        exit 1
    fi
    
    echo "✅ Node.js $(node -v) 已安裝"
    echo "✅ 使用包管理器: $PKG_MANAGER"
}

# 設置項目
setup_project() {
    echo ""
    echo "🔧 設置項目..."
    
    # 進入前端目錄
    cd lingxin-web
    
    # 安裝依賴
    echo "📦 安裝依賴套件..."
    if [ "$PKG_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi
    
    # 複製環境變數模板
    if [ ! -f ".env.local" ]; then
        echo "📝 創建環境變數文件..."
        cp ../.env.example .env.local
        echo "✅ 已創建 .env.local 文件"
    else
        echo "⚠️  .env.local 文件已存在，跳過創建"
    fi
    
    echo "✅ 項目設置完成"
}

# 配置嚮導
configure_env() {
    echo ""
    echo "⚙️  環境變數配置嚮導"
    echo "========================================="
    
    read -p "是否現在配置環境變數？ (y/n): " configure_now
    
    if [ "$configure_now" = "y" ] || [ "$configure_now" = "Y" ]; then
        echo ""
        echo "請輸入以下配置資訊（按 Enter 跳過可選項）："
        
        # Supabase 配置
        echo ""
        echo "📡 Supabase 配置："
        read -p "Supabase Project URL: " SUPABASE_URL
        read -p "Supabase Anon Key: " SUPABASE_ANON_KEY
        
        # Google OAuth 配置
        echo ""
        echo "🔐 Google OAuth 配置："
        read -p "Google Client ID: " GOOGLE_CLIENT_ID
        
        # Notion API（可選）
        echo ""
        echo "📚 Notion API（可選）："
        read -p "Notion API Key (可選): " NOTION_API_KEY
        
        # 寫入環境變數文件
        cat > .env.local << EOF
# Supabase 配置
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY

# Google OAuth 配置
VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID

# Notion API 配置
VITE_NOTION_API_KEY=$NOTION_API_KEY

# 應用程式配置
VITE_APP_NAME=靈信 2.0
VITE_APP_VERSION=2.0.0
EOF
        
        echo "✅ 環境變數配置完成"
    else
        echo "⚠️  請手動編輯 lingxin-web/.env.local 文件來配置環境變數"
    fi
}

# 測試安裝
test_installation() {
    echo ""
    echo "🧪 測試安裝..."
    
    # 嘗試啟動開發伺服器
    echo "正在檢查項目配置..."
    
    if [ "$PKG_MANAGER" = "pnpm" ]; then
        if pnpm run build --silent > /dev/null 2>&1; then
            echo "✅ 項目構建測試通過"
        else
            echo "⚠️  項目構建測試失敗，請檢查配置"
        fi
    else
        if npm run build --silent > /dev/null 2>&1; then
            echo "✅ 項目構建測試通過"
        else
            echo "⚠️  項目構建測試失敗，請檢查配置"
        fi
    fi
}

# 顯示下一步操作
show_next_steps() {
    echo ""
    echo "🎉 安裝完成！"
    echo "========================================="
    echo ""
    echo "下一步操作："
    echo ""
    echo "1. 配置後端服務："
    echo "   • 設置 Supabase 項目和資料庫"
    echo "   • 部署 Edge Functions"
    echo "   • 配置 Google OAuth"
    echo ""
    echo "2. 啟動開發伺服器："
    echo "   cd lingxin-web"
    if [ "$PKG_MANAGER" = "pnpm" ]; then
        echo "   pnpm dev"
    else
        echo "   npm run dev"
    fi
    echo ""
    echo "3. 構建生產版本："
    if [ "$PKG_MANAGER" = "pnpm" ]; then
        echo "   pnpm build"
    else
        echo "   npm run build"
    fi
    echo ""
    echo "4. 詳細部署指南："
    echo "   請參考 DEPLOY_GUIDE.md 文件"
    echo ""
    echo "🔗 相關連結："
    echo "   • Supabase Dashboard: https://supabase.com/dashboard"
    echo "   • Google Cloud Console: https://console.cloud.google.com/"
    echo "   • 項目文檔: 請查看 README.md"
    echo ""
    echo "🎯 開發伺服器將在 http://localhost:5173 運行"
    echo ""
}

# 主執行流程
main() {
    check_requirements
    setup_project
    configure_env
    test_installation
    show_next_steps
}

# 執行安裝
main