# 靈信 2.0 詳細部署指南

## 部署準備清單

在開始部署之前，請確保您擁有以下資源：

- [ ] Supabase 帳戶和項目
- [ ] Google Cloud Console 項目（用於 OAuth）
- [ ] Notion 帳戶和 API Key（可選）
- [ ] 域名或部署平台帳戶

## 第一步：後端設置（Supabase）

### 1.1 創建 Supabase 項目

1. 前往 [supabase.com](https://supabase.com) 並登入
2. 點擊「New Project」
3. 填寫項目資訊：
   - Name: `lingxin-2-0`
   - Database Password: 設置強密碼（記錄下來）
   - Region: 選擇離您最近的區域
4. 點擊「Create new project」並等待初始化完成

### 1.2 獲取 Supabase 配置

項目創建完成後，在 Settings > API 頁面記錄：
- Project URL: `https://xxx.supabase.co`
- anon public key: `eyJhbGciOiJIUzI1NiIsInR...`
- service_role secret key: `eyJhbGciOiJIUzI1NiIsInR...` (僅後端使用)

### 1.3 設置資料庫表結構

在 Supabase Dashboard > SQL Editor 中，依次執行以下 SQL 文件：

1. **基礎表結構**：
```sql
-- 執行 supabase/tables/users.sql
-- 執行 supabase/tables/user_identities.sql
-- 執行 supabase/tables/user_profiles.sql
-- 執行 supabase/tables/audit_login_events.sql
```

2. **聊天和記憶系統**：
```sql
-- 執行 supabase/tables/messages.sql
-- 執行 supabase/tables/memory_summaries.sql
```

3. **承諾引擎相關**：
```sql
-- 執行 supabase/tables/scheduled_nudges.sql
-- 執行 supabase/tables/nudges_log.sql
-- 執行 supabase/tables/nudge_prefs.sql
```

4. **AI 和管理系統**：
```sql
-- 執行 supabase/tables/personas.sql
-- 執行 supabase/tables/persona_prompts.sql
-- 執行 supabase/tables/user_persona_prefs.sql
-- 執行 supabase/tables/start_phrases.sql
-- 執行 supabase/tables/datasets.sql
-- 執行 supabase/tables/guardrails.sql
```

### 1.4 設置 Row Level Security (RLS)

執行資料庫遷移文件：

```sql
-- 執行 supabase/migrations/1757050801_enable_rls_policies.sql
-- 執行 supabase/migrations/1757050819_create_rls_policies.sql
-- 執行 supabase/migrations/1757050837_create_admin_rls_policies.sql
-- 執行 supabase/migrations/1757079219_add_conversation_id_to_messages.sql
-- 執行 supabase/migrations/1757079260_fix_message_role_column.sql
```

### 1.5 部署 Edge Functions

使用 Supabase CLI 或手動部署：

#### 方法 1：使用 Supabase CLI（推薦）

```bash
# 安裝 Supabase CLI
npm install -g supabase

# 登入 Supabase
supabase login

# 連接到您的項目
supabase link --project-ref YOUR_PROJECT_REF

# 部署所有 Edge Functions
supabase functions deploy chat-api
supabase functions deploy google-oauth
supabase functions deploy commitment-engine
supabase functions deploy memory-system
supabase functions deploy notion-sync
supabase functions deploy ics-calendar
supabase functions deploy cron-scheduler
supabase functions deploy create-admin-user
```

#### 方法 2：手動部署

1. 在 Supabase Dashboard > Edge Functions 頁面
2. 點擊「Create a new function」
3. 逐個創建並上傳 `supabase/functions/` 目錄中的函數

### 1.6 配置 Authentication

在 Supabase Dashboard > Authentication > Settings：

1. **啟用 Providers**：
   - ✅ Enable email confirmations
   - ✅ Enable email auth
   - ✅ Enable Google auth

2. **Google OAuth 設置**：
   - Client ID: 來自 Google Cloud Console
   - Client Secret: 來自 Google Cloud Console

3. **重定向 URLs**：
   - 添加您的前端域名，例如：
     - `http://localhost:5173/auth/callback` (開發)
     - `https://yourdomain.com/auth/callback` (生產)

## 第二步：Google OAuth 設置

### 2.1 創建 Google Cloud 項目

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新項目或選擇現有項目
3. 啟用 Google+ API

### 2.2 配置 OAuth 同意畫面

1. 前往「APIs & Services > OAuth consent screen」
2. 選擇「External」用戶類型
3. 填寫應用資訊：
   - App name: `靈信 2.0`
   - User support email: 您的郵箱
   - Developer contact information: 您的郵箱

### 2.3 創建 OAuth 2.0 憑證

1. 前往「APIs & Services > Credentials」
2. 點擊「Create Credentials > OAuth 2.0 Client IDs」
3. 選擇「Web application」
4. 設置重定向 URI：
   - 開發：`http://localhost:5173/oauth/google/callback`
   - 生產：`https://yourdomain.com/oauth/google/callback`
5. 記錄 Client ID 和 Client Secret

## 第三步：前端部署

### 3.1 環境變數配置

創建 `.env.local` 文件：

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Optional: Notion Integration
VITE_NOTION_API_KEY=secret_your_notion_integration_key

# App Configuration
VITE_APP_NAME=靈信 2.0
VITE_APP_VERSION=2.0.0
```

### 3.2 本地開發測試

```bash
cd lingxin-web

# 安裝依賴
pnpm install

# 啟動開發伺服器
pnpm dev

# 開啟瀏覽器訪問 http://localhost:5173
```

### 3.3 生產構建

```bash
# 構建生產版本
pnpm build

# 預覽構建結果
pnpm preview
```

## 第四步：選擇部署平台

### 選項 1：Vercel 部署

1. **連接 GitHub**：
   - 將代碼推送到 GitHub
   - 在 Vercel 中導入倉庫

2. **配置設置**：
   - Framework Preset: Vite
   - Root Directory: `lingxin-web`
   - Build Command: `pnpm build`
   - Output Directory: `dist`

3. **環境變數**：
   在 Vercel Dashboard 中設置所有 VITE_ 開頭的環境變數

### 選項 2：Netlify 部署

1. **拖拽部署**：
   - 將 `lingxin-web/dist` 文件夾拖拽到 Netlify
   
2. **Git 部署**：
   - 連接 GitHub 倉庫
   - Base directory: `lingxin-web`
   - Build command: `pnpm build`
   - Publish directory: `dist`

### 選項 3：Firebase Hosting

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入 Firebase
firebase login

# 初始化項目
firebase init hosting

# 部署
firebase deploy
```

### 選項 4：自託管（Nginx）

```bash
# 複製構建文件到伺服器
scp -r dist/* user@server:/var/www/lingxin-2.0/

# Nginx 配置範例
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/lingxin-2.0;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 第五步：測試和驗證

### 5.1 功能測試清單

- [ ] 訪問主頁載入正常
- [ ] Google OAuth 登入功能
- [ ] Email/密碼註冊功能
- [ ] Email/密碼登入功能
- [ ] 忘記密碼功能
- [ ] 聊天界面載入正常
- [ ] AI 對話回應正常
- [ ] 用戶資料保存正確

### 5.2 檢查項目

1. **網路請求檢查**：
   - 開發者工具 > Network
   - 確認所有 API 請求返回 200

2. **控制台錯誤檢查**：
   - 開發者工具 > Console
   - 確認無 JavaScript 錯誤

3. **資料庫檢查**：
   - Supabase Dashboard > Table Editor
   - 確認用戶數據正確儲存

## 第六步：域名和 SSL

### 6.1 域名配置

如果使用自定義域名：

1. **DNS 設置**：
   - A 記錄指向伺服器 IP
   - 或 CNAME 指向部署平台

2. **更新重定向 URI**：
   - Google Cloud Console
   - Supabase Authentication Settings

### 6.2 SSL 證書

大多數現代部署平台自動提供 SSL，如果自託管：

```bash
# 使用 Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

## 故障排除

### 常見錯誤和解決方案

1. **「Failed to get OAuth URL」**：
   - 檢查 Google OAuth 重定向 URI
   - 確認 Supabase Google provider 配置

2. **「Network Error」**：
   - 檢查 Supabase URL 和 API Key
   - 確認網路連接

3. **「RLS Policy Error」**：
   - 檢查 Row Level Security 政策
   - 確認用戶權限設置

4. **Edge Function 錯誤**：
   - 查看 Supabase Edge Functions 日誌
   - 確認函數部署成功

### 日誌查看命令

```bash
# Supabase Edge Functions 日誌
supabase functions logs chat-api --follow

# 前端錯誤日誌
# 瀏覽器開發者工具 > Console
```

## 性能優化

### 前端優化

1. **代碼分割**：
   - Vite 自動進行代碼分割
   - 懶加載路由組件

2. **圖片優化**：
   - 壓縮圖片資源
   - 使用 WebP 格式

3. **快取策略**：
   - 設置適當的 HTTP 快取頭
   - 使用 CDN 分發靜態資源

### 後端優化

1. **資料庫索引**：
   - 為經常查詢的欄位添加索引
   - 優化複雜查詢

2. **Edge Function 優化**：
   - 減少冷啟動時間
   - 優化函數記憶體使用

## 監控和維護

### 設置監控

1. **Supabase Analytics**：
   - 監控 API 使用量
   - 追蹤錯誤率

2. **前端監控**：
   - Google Analytics
   - 錯誤追蹤服務

### 定期維護

1. **依賴更新**：
   - 定期更新 npm 套件
   - 檢查安全漏洞

2. **資料庫維護**：
   - 定期備份
   - 清理舊數據

3. **日誌清理**：
   - 清理過期日誌
   - 監控儲存使用量

## 擴展功能

### 計劃中的功能

1. **WeChat OAuth**：
   - 微信登入集成
   - 需要微信開發者帳戶

2. **承諾引擎增強**：
   - 智能承諾識別
   - 自動提醒系統

3. **Notion 集成**：
   - 內容管理系統
   - 動態提示詞庫

### 自定義開發

如需添加新功能：

1. **前端組件**：
   - 在 `src/components/` 添加新組件
   - 更新路由配置

2. **後端 API**：
   - 創建新的 Edge Functions
   - 更新資料庫結構

3. **資料庫更新**：
   - 創建遷移文件
   - 更新 RLS 政策

## 技術支援聯絡

如果在部署過程中遇到問題，可以：

1. 檢查本指南的故障排除部分
2. 查看項目 GitHub Issues
3. 參考相關官方文檔：
   - [Supabase 文檔](https://supabase.com/docs)
   - [Vite 文檔](https://vitejs.dev/)
   - [React 文檔](https://reactjs.org/)

---

**部署成功後，您將擁有一個完整的靈信 2.0 智能生活助理系統！**