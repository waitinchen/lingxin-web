# 靈信 2.0 部署包

## 項目概述

靈信 2.0 是一個基於 Element Web 客製化的智能生活助理 IM 客戶端，採用三層架構設計：

- **戰略層**：人格設定、AI 咒語系統
- **結構層**：記憶系統、承諾引擎、技能模組
- **表現層**：IM 客戶端界面（基於 Element Web）

## 技術架構

- **前端**：React + TypeScript + Vite + Tailwind CSS
- **後端**：Supabase (Database, Auth, Edge Functions, Storage)
- **認證**：Google OAuth + Email/密碼登入
- **部署**：MiniMax Agent 平台 / 或其他支持 React 的平台

## 目錄結構

```
lingxin-2.0-deploy-package/
├── README.md                      # 本文件
├── DEPLOY_GUIDE.md               # 詳細部署指南
├── .env.example                  # 環境變數模板
├── lingxin-web/                  # 前端應用源代碼
│   ├── src/                      # React 應用源代碼
│   ├── public/                   # 靜態資源
│   ├── package.json              # 依賴配置
│   ├── vite.config.ts           # Vite 配置
│   └── ...
├── supabase/                     # Supabase 配置
│   ├── functions/               # Edge Functions
│   │   ├── chat-api/           # 聊天 API
│   │   ├── google-oauth/       # Google OAuth
│   │   ├── commitment-engine/  # 承諾引擎
│   │   └── ...
│   ├── migrations/             # 資料庫遷移文件
│   └── tables/                 # 資料庫表結構
└── docs/                        # 項目文檔
    └── 靈信_2.0_開發計畫_內容.md # 原始設計文檔
```

## 快速開始

### 1. 環境準備

確保您的系統已安裝：
- Node.js 18+
- pnpm 或 npm
- Git
- Supabase CLI（可選，用於本地開發）

### 2. 項目設置

```bash
# 1. 進入前端目錄
cd lingxin-web

# 2. 安裝依賴
pnpm install
# 或
npm install

# 3. 複製環境變數文件
cp ../.env.example .env.local

# 4. 配置環境變數（見下方說明）
```

### 3. 環境變數配置

編輯 `.env.local` 文件，設置以下變數：

```env
# Supabase 配置
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth 配置
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# Notion API（可選）
VITE_NOTION_API_KEY=your_notion_api_key
```

### 4. 運行開發伺服器

```bash
# 開發模式
pnpm dev

# 構建生產版本
pnpm build

# 預覽生產版本
pnpm preview
```

## 部署選項

### 選項 1：MiniMax Agent 平台部署
適合快速部署和測試，已包含自動配置。

### 選項 2：Vercel 部署
1. 連接 GitHub 倉庫到 Vercel
2. 設置環境變數
3. 自動部署

### 選項 3：Netlify 部署
1. 拖拽 `dist` 文件夾到 Netlify
2. 或連接 Git 倉庫
3. 配置環境變數

### 選項 4：自託管
1. 構建項目：`pnpm build`
2. 部署 `dist` 文件夾到您的 Web 伺服器
3. 配置 Nginx 或 Apache

## Supabase 後端設置

### 1. 創建 Supabase 項目
1. 訪問 [supabase.com](https://supabase.com)
2. 創建新項目
3. 獲取項目 URL 和 API Keys

### 2. 資料庫設置
```bash
# 使用提供的 SQL 文件創建表
# 依次執行 supabase/tables/ 目錄中的所有 .sql 文件

# 或使用 Supabase CLI
supabase db push
```

### 3. Edge Functions 部署
```bash
# 部署所有 Edge Functions
supabase functions deploy

# 或單獨部署
supabase functions deploy chat-api
supabase functions deploy google-oauth
```

### 4. Authentication 設置
在 Supabase Dashboard 中：
1. 啟用 Email authentication
2. 配置 Google OAuth provider
3. 設置重定向 URL

## 核心功能說明

### 登入系統
- **Google OAuth**：一鍵登入
- **Email/密碼**：傳統註冊登入
- **忘記密碼**：郵件重置功能

### 聊天功能
- **智能對話**：內建 AI 回應系統
- **記憶系統**：短期、中期、長期記憶
- **承諾引擎**：自動識別和追蹤承諾

### 用戶管理
- **個人資料**：完整的用戶檔案系統
- **權限控制**：三層管理權限
- **審計日誌**：登入行為追蹤

## 故障排除

### 常見問題

1. **Google OAuth 錯誤**
   - 檢查 Google Cloud Console 配置
   - 確認重定向 URI 正確
   - 驗證 Client ID 和 Secret

2. **Supabase 連接問題**
   - 確認 URL 和 API Key 正確
   - 檢查網路連接
   - 驗證 RLS 政策設置

3. **構建錯誤**
   - 清除 node_modules：`rm -rf node_modules && pnpm install`
   - 檢查 Node.js 版本
   - 確認所有環境變數設置

### 日誌查看

```bash
# Supabase Edge Functions 日誌
supabase functions logs chat-api

# 前端開發日誌
pnpm dev --debug
```

## 技術支援

如遇到部署問題，請參考：
1. [詳細部署指南](./DEPLOY_GUIDE.md)
2. [Supabase 官方文檔](https://supabase.com/docs)
3. [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)

## 更新日誌

### v2.0.0 (2025-09-22)
- ✅ 完整的雙重登入系統
- ✅ 智能聊天對話功能
- ✅ 基於 Element Web 的客製化界面
- ✅ Supabase 後端完整集成
- ✅ 移除所有浮水印和品牌標記
- ✅ 生產級別的錯誤處理

## 授權

基於 Element Web 的 Apache 2.0 License，靈信 2.0 的客製化部分遵循相同授權條款。