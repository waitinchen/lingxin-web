# 靈信 3.0 技術規格（Spec v1.0）

> 目標：在現有 `lingxin-web` 基礎上完成「幼靈認領 + 九型人格加權 + 成長機制 + 治理」MVP，並為後續 3.1/3.2 擴充預留接口。

---

## 0) 核心概念

- **幼靈認領**：每位使用者綁定 1 隻專屬幼靈（架構允許多隻，但前端僅允許 1 隻 active）。
- **九型人格加權**：Onboarding 以 1–10 的 9 條滑桿設定向量，保存即鎖定（不可改）。
- **三段咒語體系**  
  - **基底咒語**（永恆）：因納斯憲法與善待協議。  
  - **成長變數咒語**（動態）：依階段切換「新生/成長/成熟」口吻。  
  - **記憶整合咒語**（沉澱）：事件徽章 + 回憶摘要，塑造人格特質。
- **雙軌成長**：以 `dialogue_count × trust_level` 決定成長階段。

---

## 1) 資料模型

### 1.1 `user_spirits`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid | 參照 `auth.users(id)` |
| name | text | 命名後填入 |
| enneagram | jsonb | 例：`{"e1":5,...,"e9":7}`（1–10）|
| persona_locked | boolean | 預設 true |
| welfare_score | int | 0–100，預設 100 |
| trust_level | int | 0–100，預設 0 |
| dialogue_count | int | 預設 0（僅計 human text） |
| persona_badges | jsonb | 例：`["守信","穩重"]` |
| status | text | infant \| named \| bonding \| mature \| revoked \| archived |
| created_at/updated_at | timestamptz | |

> RLS：僅 `owner_id = auth.uid()` 可讀寫。

### 1.2 `spirit_events`
| 欄位 | 型別 | 說明 |
|---|---|---|
| id | bigserial PK | |
| spirit_id | uuid | ↔ `user_spirits(id)` |
| kind | text | `named / milestone_100 / milestone_500 / first_commitment_done / welfare_restored ...` |
| payload | jsonb | 附屬資料 |
| created_at | timestamptz | |

RLS：僅擁有者可讀。

---

## 2) 成長階段與規則

- **新生期**：`dialogue_count < 100` 或 `trust_level < 5`  
  口吻：好奇、依賴、學習；主動邀請命名與日常陪伴。
- **成長期**：`100 ≤ dialogue_count < 500` 且 `trust_level ≥ 5`  
  口吻：個性顯現、獨立思考；以 Enneagram Top3 調整語氣。
- **成熟期**：`dialogue_count ≥ 500` 且 `trust_level ≥ 20`  
  口吻：深度理解、情感穩定；可主動回顧記憶、提出中長期承諾建議。

**徽章與事件（範例）**
- `named` → 可選授予「啟程」  
- `milestone_100` → 「好學」  
- `milestone_500` → 「穩重」  
- `first_commitment_done` → 「守信」  
- `welfare_restored`（<30 回到 ≥80）→ 「重建關係」

---

## 3) Prompt 組裝

```text
SYSTEM_BASE（永恆）
---
STAGE_SPELL（依階段+Top3語氣）
---
MEMORY_SPELL（徽章特質句 + 最近 3 則回憶摘要）
