# D2 Survivors 繁體中文化

為 D2 Survivors 新增「繁體中文」選項，包含 6,708 筆翻譯、12 筆補充技能說明、中文字型與換行修正，保留原有英文及韓文。已驗證的遊戲基準為 `2026.1021.3`。

本專案與 CoA 中文化採相同命名與發布方式：私人 repo 保存原始碼及翻譯，下載包放在 Releases。下載需要自己的 GitHub 帳號及本專案存取權。

## 下載與套用

1. 從 [最新版本](https://github.com/NiceJobGuys/D2Survivors-Translate-zh-TW/releases/latest) 下載 `D2Survivors-zhTW-1.0.0.zip`，完整解壓。
2. 準備 Node.js 22.18 以上版本及 npm，正常離開遊戲。
3. 在解壓後的目錄執行，路徑改成自己的遊戲安裝位置：

```powershell
node .\patch.mjs "D:\Games\D2 Survivors"
```

工具使用 `npx --yes @electron/asar@3` 解開並重新封裝玩家自己的 `resources/app.asar`，首次執行需要連線 npm。預設遊戲路徑為 `D:\Games\D2 Survivors`。

4. 啟動遊戲，在「選項 → 遊戲選項 → 語言」切換為「繁體中文」，設定會保留。

## 備份、還原與更新

工具自動在解壓目錄的 `backup/app.asar` 保留使用者自己的原檔。請保留整個中文化目錄與備份；不要在遊戲執行中套用或還原。

```powershell
node .\patch.mjs --restore "D:\Games\D2 Survivors"
```

遊戲更新會覆蓋 `app.asar`，更新後可重新執行套用指令，工具會備份新版原檔。如果遊戲程式結構改變，必須修訂 patch；比對失敗時不會替換遊戲檔案。新版新增、尚未翻譯的句子會保留英文，清單寫入 `untranslated.txt`。

## 翻譯與原始碼

- `patch.mjs`：既有套用／還原程式。
- `zh-TW.json`：英文原句對應繁體中文。
- `zh-TW.extra.json`：技能說明補充鍵。
- `tests/check.mjs`：翻譯格式與補充槽位檢查；可傳入遊戲原韓文字典模組驗證覆蓋率。

字典鍵中的 `#` 是數字、`*` 是任意文字，譯文用 `{0}`、`{1}` 等對應槽位順序。中文顯示使用玩家 Windows 本機的微軟正黑體，下載包不含字型檔。

```powershell
node --check .\patch.mjs
node .\tests\check.mjs
```

Repo 和下載包均不包含原版 `app.asar`、遊戲原始碼、遊戲素材、使用者備份或存檔。遊戲及原有內容權利屬原權利人，本專案為非官方中文化。

本次發布沿用既有 patch 與翻譯，未重新啟動遊戲實測。私人專案權限不會自動開放給 CoA 的既有成員。
