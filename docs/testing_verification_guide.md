# 靈信 Web 前端驗收與測試指引

## 1. 測試前準備

### 1.1 基礎環境確認
- **部署位址**：`https://lingxin-web.vercel.app/`
- **必要憑證**：Supabase 專案需已建立測試帳號，並確認以下環境變數與部署一致：
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- **郵件服務**：若需測試密碼重設流程，請於 Supabase → Authentication → Providers 中確認 `Email` 提供者已啟用，並設定合適的寄件位址。

### 1.2 本地端測試環境（可選）
1. 於專案根目錄執行 `pnpm install`。
2. 建立 `.env.local`，內容需包含與 Vercel 同步的 Supabase 變數。
3. 執行 `pnpm dev`，於瀏覽器開啟 `http://localhost:5173`。
4. 建議開啟瀏覽器 DevTools → Network，方便確認 Supabase API 與 Edge Function 的呼叫狀態。

### 1.3 測試帳號建議
- **Email/密碼帳號**：使用 Supabase Dashboard → Authentication → Users → Add user 建立，勾選 `Auto confirm user` 以省略驗證信流程。
- **Google OAuth 帳號**：需於 Google Cloud Console 綁定測試帳戶，並於 Supabase → Authentication → Providers → Google 設定回呼網址 `https://lingxin-web.vercel.app/auth/callback` 以及本地端回呼網址。
- **測試資料清理**：驗收結束後，記得移除臨時帳號與測試訊息，保持資料庫乾淨。

---

## 2. 功能驗收流程
以下分為主要頁面與服務，提供逐步測試指引、檢查重點與預期結果。

### 2.1 登入頁（`/login`）
1. **UI 與互動檢查**
   - 確認黃金螺旋背景、玻璃擬態卡片與動畫正常渲染。
   - 切換登入／註冊／重設密碼模式時，表單欄位與提示文案應同步更新。
   - 密碼欄可切換顯示／隱藏，`Remember me` 狀態需可維持。
2. **Google 登入**
   - 點擊「使用 Google 登入」後，應跳轉至 Google OAuth 頁面。
   - 完成授權後會回到 `/auth/callback`，應自動導向聊天室並看到個人頭像／名稱。
   - 驗證 Supabase Dashboard → Authentication → Users 是否新增該 Google 使用者，並在 `user_profiles` 表看到同步建立的資料。
3. **Email 登入**
   - 使用已存在帳號，輸入正確密碼應轉導至聊天室頁。
   - 輸入錯誤密碼需顯示錯誤通知，且不應卡住 loading 狀態。
4. **註冊流程**
   - 在 `註冊` 模式填入新帳號與密碼。
   - 成功後預期看到提示要求前往信箱驗證（若未勾 Auto confirm）。若已自動驗證，應直接導向聊天室。
   - Supabase `auth.users` 與 `user_profiles` 需同步產生紀錄。
5. **密碼重設**
   - 切換至 `重設密碼` 模式，輸入註冊 email 後應收到通知提示已寄送信件。
   - 檢查 Supabase → Authentication → Users → Reset password requests 是否紀錄成功。

### 2.2 Auth Callback & Session 維護
1. 以任一方式登入後，重新整理瀏覽器頁面，應保持登入狀態。
2. 於瀏覽器 Application → Storage 清除 `supabase-auth-token` 後刷新，應退回登入頁。
3. 驗證 `src/contexts/AuthContext.tsx` 的 Profile 自動補種：
   - 在 Supabase SQL Editor 執行 `delete from user_profiles where user_id = '<測試者 id>'`。
   - 重新整理前端，應自動重新建立該筆 `user_profiles`，且名稱／頭像沿用 Supabase metadata。

### 2.3 聊天體驗（`/chat`）
1. **歷史訊息載入**：登入後頁面應自動呼叫 Supabase `messages` 表，顯示 50 筆內歷史資料。
2. **傳送訊息**：輸入文字後送出，頁面應立即顯示使用者訊息並清空輸入框。
3. **Edge Function 回應**：
   - 觀察 Network → `functions/v1/chat-api` 呼叫是否 200 成功。
   - 成功時應顯示 AI 回覆與 Smart Chips（若有）。
   - 若 Edge Function 回傳錯誤，應顯示 toast 並於聊天室插入錯誤提示訊息。
4. **資料驗證**：於 Supabase Table → `messages` 查看是否寫入對應紀錄（role、content、conversation_id）。
5. **登出**：點擊右上角選單 → 登出，應清除 session 並導回登入頁。

### 2.4 承諾管理（`/commitments`）
1. **列表載入**：
   - 進入頁面會呼叫 Edge Function `commitment-engine` 的 `list` 動作，確認 Network 回應與畫面列表同步。
   - Loading 狀態應顯示骨架或 Spinner，完成後顯示卡片。
2. **狀態切換**：
   - 於卡片上點擊「完成」「取消」「重新安排」等動作，應觸發對應 Edge Function `update`。
   - 成功後列表上的 Badge 顏色與文字需更新，並跳出成功 toast。
3. **刪除承諾**：
   - 點擊垃圾桶圖示，會先跳出 `confirm`，確認後 Edge Function `delete` 應回傳成功並從畫面移除。
4. **重新整理**：
   - 點擊「重新整理」按鈕會再次呼叫 `list` 動作，應顯示更新提示。

### 2.5 其他頁面
- **`/welcome`**：確認新帳號首次登入是否導向歡迎頁，內容是否顯示使用者名稱。
- **`/reset-password`**：透過重設密碼信中的連結導向此頁，檢查新的密碼設定流程是否成功。
- **Auth Guard**：未登入直接訪問 `/chat` 或 `/commitments`，應被導回 `/login`。

---

## 3. 錯誤處理與日誌
- **Toast 訊息**：所有失敗流程（登入錯誤、Edge Function 失敗）需顯示紅色錯誤通知，成功時顯示綠色或紫色。
- **Console Log**：打開 DevTools Console，確認無未捕捉例外或嚴重警告（除已知的 React Fast Refresh 警告）。
- **Supabase 日誌**：於 Supabase → Logs 追蹤 Edge Function 是否有錯誤堆疊。

---

## 4. 驗收清單
- [ ] 已驗證 Google、Email 登入與註冊流程。
- [ ] 已確認密碼重設信件成功寄送並完成重設。
- [ ] 聊天功能可成功呼叫 Edge Function 並寫入 `messages` 表。
- [ ] 承諾列表可讀取、更新、刪除並顯示正確狀態。
- [ ] 登出後無法直接訪問受保護頁面。
- [ ] 網頁在桌機與手機尺寸下版面無重大錯位。
- [ ] DevTools Console 無新錯誤；Supabase Logs 無持續性錯誤。

完成以上檢查後，即可認定前端已能連線 Supabase 並提供完整登入、資料讀取與互動體驗。
