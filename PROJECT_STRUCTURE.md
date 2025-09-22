# 靈信 2.0 項目結構說明

```
lingxin-2.0-deploy-package/
├── 📄 README.md                     # 項目總覽和快速開始指南
├── 📄 DEPLOY_GUIDE.md              # 詳細部署說明文檔
├── 📄 .env.example                 # 環境變數配置模板
├── 📄 install.sh                   # 快速安裝腳本
├── 📄 PROJECT_STRUCTURE.md         # 本文件 - 項目結構說明
│
├── 📁 lingxin-web/                 # 前端應用（基於 Element Web 客製化）
│   ├── 📄 package.json             # 項目依賴和腳本
│   ├── 📄 vite.config.ts          # Vite 構建配置
│   ├── 📄 tailwind.config.js      # TailwindCSS 配置
│   ├── 📄 tsconfig.json           # TypeScript 配置
│   ├── 📄 index.html              # 應用程式入口 HTML
│   │
│   ├── 📁 src/                     # 源代碼目錄
│   │   ├── 📄 App.tsx              # 主應用組件
│   │   ├── 📄 main.tsx             # 應用程式入口點
│   │   ├── 📄 App.css              # 全局樣式
│   │   ├── 📄 index.css            # 基礎樣式
│   │   │
│   │   ├── 📁 components/          # React 組件
│   │   │   ├── 📁 ui/              # UI 基礎組件
│   │   │   ├── 📁 auth/            # 認證相關組件
│   │   │   ├── 📁 chat/            # 聊天界面組件
│   │   │   └── 📁 layout/          # 布局組件
│   │   │
│   │   ├── 📁 pages/               # 頁面組件
│   │   │   ├── 📄 LoginPage.tsx    # 登入頁面
│   │   │   ├── 📄 ChatPage.tsx     # 聊天主頁面
│   │   │   ├── 📄 ResetPasswordPage.tsx # 密碼重置頁面
│   │   │   └── 📄 ProfilePage.tsx  # 用戶資料頁面
│   │   │
│   │   ├── 📁 contexts/            # React Context
│   │   │   ├── 📄 AuthContext.tsx  # 認證狀態管理
│   │   │   └── 📄 ChatContext.tsx  # 聊天狀態管理
│   │   │
│   │   ├── 📁 hooks/               # 自定義 React Hooks
│   │   │   ├── 📄 useAuth.ts       # 認證相關 hooks
│   │   │   ├── 📄 useChat.ts       # 聊天相關 hooks
│   │   │   └── 📄 useSupabase.ts   # Supabase 相關 hooks
│   │   │
│   │   └── 📁 lib/                 # 工具函數和配置
│   │       ├── 📄 supabase.ts      # Supabase 客戶端配置
│   │       ├── 📄 auth.ts          # 認證工具函數
│   │       └── 📄 utils.ts         # 通用工具函數
│   │
│   ├── 📁 public/                  # 靜態資源
│   │   ├── 📄 favicon.ico          # 網站圖標
│   │   └── 📄 manifest.json        # PWA 配置
│   │
│   └── 📁 dist/                    # 構建輸出目錄（構建後生成）
│       ├── 📄 index.html           # 生產版本 HTML
│       └── 📁 assets/              # 優化後的靜態資源
│
├── 📁 supabase/                    # Supabase 後端配置
│   ├── 📁 functions/               # Edge Functions（伺服器端函數）
│   │   ├── 📁 chat-api/            # 聊天 API 處理
│   │   │   ├── 📄 index.ts         # 聊天功能主邏輯
│   │   │   └── 📄 supabase.ts      # Supabase 客戶端
│   │   │
│   │   ├── 📁 google-oauth/        # Google OAuth 處理
│   │   │   ├── 📄 index.ts         # OAuth 認證邏輯
│   │   │   └── 📄 supabase.ts      # 資料庫操作
│   │   │
│   │   ├── 📁 commitment-engine/   # 承諾引擎（Mark-1）
│   │   │   ├── 📄 index.ts         # 承諾解析和調度
│   │   │   └── 📄 parser.ts        # 承諾內容解析
│   │   │
│   │   ├── 📁 memory-system/       # 九靈記憶系統
│   │   │   ├── 📄 index.ts         # 記憶管理主邏輯
│   │   │   └── 📄 summarizer.ts    # 內容摘要功能
│   │   │
│   │   ├── 📁 notion-sync/         # Notion 內容同步
│   │   │   ├── 📄 index.ts         # Notion API 集成
│   │   │   └── 📄 content-sync.ts  # 內容同步邏輯
│   │   │
│   │   ├── 📁 ics-calendar/        # ICS 行事曆功能
│   │   │   ├── 📄 index.ts         # 日曆生成和訂閱
│   │   │   └── 📄 ics-generator.ts # ICS 格式生成
│   │   │
│   │   ├── 📁 cron-scheduler/      # 定時任務調度
│   │   │   └── 📄 index.ts         # Worker 任務系統
│   │   │
│   │   └── 📁 create-admin-user/   # 管理員用戶創建
│   │       └── 📄 index.ts         # 初始化管理員帳戶
│   │
│   ├── 📁 tables/                  # 資料庫表結構 SQL
│   │   ├── 📄 users.sql            # 用戶基本資料表
│   │   ├── 📄 user_identities.sql  # 用戶身份認證表
│   │   ├── 📄 user_profiles.sql    # 用戶詳細資料表
│   │   ├── 📄 audit_login_events.sql # 登入審計日誌
│   │   ├── 📄 messages.sql         # 聊天消息記錄
│   │   ├── 📄 memory_summaries.sql # 記憶摘要表
│   │   ├── 📄 scheduled_nudges.sql # 預定提醒表
│   │   ├── 📄 nudges_log.sql       # 提醒執行日誌
│   │   ├── 📄 nudge_prefs.sql      # 提醒偏好設置
│   │   ├── 📄 personas.sql         # AI 人格定義
│   │   ├── 📄 persona_prompts.sql  # AI 咒語提示詞
│   │   ├── 📄 user_persona_prefs.sql # 用戶人格偏好
│   │   ├── 📄 start_phrases.sql    # 智能啟動詞
│   │   ├── 📄 datasets.sql         # 訓練數據集
│   │   └── 📄 guardrails.sql       # 安全防護規則
│   │
│   └── 📁 migrations/              # 資料庫遷移文件
│       ├── 📄 1757050801_enable_rls_policies.sql    # 啟用 RLS
│       ├── 📄 1757050819_create_rls_policies.sql    # 創建 RLS 政策
│       ├── 📄 1757050837_create_admin_rls_policies.sql # 管理員權限
│       ├── 📄 1757079219_add_conversation_id_to_messages.sql # 對話 ID
│       └── 📄 1757079260_fix_message_role_column.sql # 修復消息角色欄位
│
└── 📁 docs/                        # 項目文檔
    └── 📄 靈信_2.0_開發計畫_內容.md # 原始設計文檔
```

## 核心組件說明

### 🎨 前端架構 (lingxin-web/)

**技術棧：**
- **React 18** + **TypeScript** - 主框架
- **Vite** - 構建工具和開發伺服器
- **TailwindCSS** - 樣式框架
- **Supabase JS** - 後端客戶端
- **React Router** - 路由管理

**關鍵特性：**
- 基於 Element Web 的客製化 UI
- 響應式設計，支援手機和桌面
- PWA 支援（漸進式網路應用）
- 模組化組件架構
- TypeScript 類型安全

### ⚙️ 後端架構 (supabase/)

**Edge Functions：**
- **chat-api** - 處理 AI 對話邏輯
- **google-oauth** - Google 認證流程
- **commitment-engine** - 承諾解析和追蹤
- **memory-system** - 智能記憶管理
- **notion-sync** - Notion 內容集成
- **ics-calendar** - 日曆訂閱功能

**資料庫設計：**
- **用戶系統** - 多重認證支援
- **聊天系統** - 消息記錄和會話管理
- **記憶系統** - 三層記憶架構
- **承諾系統** - 任務追蹤和提醒
- **權限系統** - 三層管理權限

### 🛡️ 安全架構

**認證方式：**
- Google OAuth 2.0
- Email + 密碼
- 會話管理
- JWT Token 驗證

**資料安全：**
- Row Level Security (RLS)
- API 金鑰保護
- HTTPS 強制加密
- 輸入驗證和清理

## 開發工作流程

### 🚀 快速開始
```bash
# 1. 使用安裝腳本
chmod +x install.sh
./install.sh

# 2. 或手動安裝
cd lingxin-web
pnpm install
cp ../.env.example .env.local
# 編輯 .env.local 配置
pnpm dev
```

### 🔧 開發指令
```bash
# 開發伺服器
pnpm dev

# 類型檢查
pnpm type-check

# 代碼檢查
pnpm lint

# 格式化代碼
pnpm format

# 構建生產版本
pnpm build

# 預覽構建結果
pnpm preview
```

### 📦 部署流程
```bash
# 1. 設置 Supabase 項目
# 2. 部署 Edge Functions
# 3. 配置資料庫
# 4. 設置 Google OAuth
# 5. 構建前端
pnpm build
# 6. 部署到目標平台
```

## 擴展開發

### 新增前端功能
1. 在 `src/components/` 創建新組件
2. 在 `src/pages/` 添加新頁面
3. 更新 `src/App.tsx` 路由配置
4. 添加相應的 TypeScript 類型

### 新增後端功能
1. 在 `supabase/functions/` 創建新 Edge Function
2. 在 `supabase/tables/` 添加資料庫表結構
3. 創建相應的 RLS 政策
4. 更新前端 API 調用

### 自定義 UI 組件
- 基於 Element Web 的設計系統
- 使用 TailwindCSS 進行樣式定制
- 支援深色/淺色主題切換
- 響應式設計最佳實踐

## 故障排除

常見問題和解決方案請參考：
- `README.md` - 基本問題
- `DEPLOY_GUIDE.md` - 部署相關問題
- Supabase Dashboard Logs - 後端問題
- 瀏覽器開發者工具 - 前端問題