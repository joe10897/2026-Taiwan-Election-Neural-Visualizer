# 2026 台灣六都選情觀測站 (2026 Taiwan Election Observatory)

> **跨機構民調競速 × 全台六都選情交互地圖 × 即時民意調查箱 × 60 秒自動選情新聞同步**

本專案為針對 **2026 年台灣九合一地方公職人員選舉（11 月 28 日投票）** 所設計的互動式數據視覺化觀測網站。採用**藝術深色調（Artistic Dark Gallery）**結合**低飽和莫蘭迪藍綠配色**，整合 `Three.js` 3D 地形粒子波浪、SVG 向量互動地圖、跨機構民調競速比較、具備防重複機制的民意調查箱，以及每 60 秒自動刷新的即時選情新聞串流。

---

## ✨ 核心功能與視覺設計

### 1. 藝術深色調與 Three.js 互動重繪效果
- **低飽和色彩系統**：
  - **藍營（Pan-Blue）**：低飽和莫蘭迪藍（`#487bb6` / 標籤 `#9cc4f2`）
  - **綠營（Pan-Green）**：低飽和莫蘭迪綠（`#439256` / 標籤 `#96dfb5`）
  - **重點與機構識別色**：暖陶土銅色（`#c2745d`）
- **Three.js 3D 粒子地形波浪**：背景以 WebGL 即時渲染 3D 地形粒子波浪，當切換六都選區、點擊民調卡、投票或按下「重繪視覺動態」時，粒子波浪會產生振幅脈衝並自動轉換為該選區領先陣營的低飽和藍／綠色調。
- **SVG MorphIcons 與線條重繪**：互動按鈕搭配平滑路徑變形圖示，切換選區時自動觸發地圖輪廓 `stroke-dashoffset` 重繪與長條圖動態推進。

### 2. 全台六都選情交互地圖
- 依據各直轄市最新民調領先陣營動態填塗低飽和藍／綠色彩，並標註六都引線指標卡（台北市、新北市、桃園市、台中市、台南市、高雄市）。
- 點擊地圖任一選區或指標卡，全頁「民調競速」、「民意調查箱」、「抽樣校正分析」與「即時選情新聞」即刻同步切換。

### 3. 民調競速（跨機構民調對比）
- 完整呈現各家民調機構（`TVBS`、`信民協會`、`美麗島電子報` 等）之調查年月、領先候選人膠囊標籤、藍綠低飽和水平長條圖、支持度差距（`pp`）與抽樣備註。
- 點擊任一民調卡片可連動下方「跨機構抽樣與政黨加權分析」參數。

### 4. 民意調查箱（固定藍綠低飽和色條 × 每人每日限投一次）
- 固定採用**低飽和藍／綠／中性灰長條圖**呈現各選項得票率與累計票數。
- **單日防重複投票機制**：
  - **前端三重防護**：自動計算瀏覽器硬體與 Canvas 渲染特徵指紋（`computeDeviceFingerprint`），投票後同時寫入 `localStorage` 與 24 小時效期 `Cookie`（以台灣時間 `Asia/Taipei YYYY-MM-DD` 為界），並鎖定按鈕為「今日已完成投票」。
  - **後端全網計票擴充（`backend/cloudflare-worker.js`）**：內附 Cloudflare Worker + KV 後端腳本，結合真實請求 IP（`CF-Connecting-IP`）與裝置指紋之 `SHA-256` 雜湊鎖，徹底阻絕無痕視窗重複灌票。

### 5. 即時時間導覽列與每 60 秒自動新聞抓取
- **導覽列即時時鐘**：每秒更新台灣標準時間（`UTC+8`）與距離下次自動同步之倒數秒數（`60s 刷新`）。
- **即時民調新聞區塊**：每 60 秒自動透過 `rss2json` 抓取 Google News 針對當前焦點選區之最新選舉與民調新聞報導，並具備離線實證新聞快取備援。

### 6. 手機／平板／電腦全響應式版面（RWD）
- **電腦版（`> 1120px`）**：雙欄與三欄式資訊儀表板佈局。
- **平板與手機版（`< 1120px` / `< 680px`）**：自動轉為單欄垂直堆疊、零水平溢位；六都選區導覽列支援橫向觸控滑動，投票按鈕與圖表皆針對行動裝置觸控最佳化。

---

## 📁 專案目錄結構

```text
.
├── index.html                     # 主應用程式（包含完整 UI、Three.js 渲染、SVG 地圖、民調與即時新聞邏輯）
├── backend/
│   └── cloudflare-worker.js       # 選配 Serverless 後端（Cloudflare Worker + KV 全網計票與 IP 防灌票）
├── README.md                      # GitHub 專案說明文件
└── github.md                      # 專案完整技術與部署指南
```

---

## 🗳️ 民意調查箱：票數儲存與後端部署指南

### Q1：目前票數記錄在哪裡？有後端嗎？
1. **預設模式（純靜態前端部署，如 GitHub Pages）**：
   - 當 `index.html` 中的 `CLOUD_BALLOT_API_URL` 為空字串時，網站以純靜態模式運作，無須依賴外部伺服器即可直接開啟。
   - 使用者的投票結果與單日鎖定狀態會記錄在該使用者瀏覽器的 **`localStorage`** 與 **`Cookie`** 中（刷新頁面不會消失，且當日無法重複投票）。
2. **公開上線模式（全網共用真實票數資料庫）**：
   - 若希望所有造訪網站的網友看到同一份即時累加的總票數，並由伺服器端強制執行「同一 IP + 裝置指紋每日限投一票」，只需部署專案內附的 [`backend/cloudflare-worker.js`](./backend/cloudflare-worker.js)。

### Q2：如何免費部署 Cloudflare Worker 後端（3 分鐘完成）？
1. 登入免費的 [Cloudflare Dashboard](https://dash.cloudflare.com/)，進入 **Workers & Pages -> KV**，建立一個命名為 `ELECTION_BALLOT_KV` 的 KV Namespace。
2. 建立一個新的 **Worker**，將 [`backend/cloudflare-worker.js`](./backend/cloudflare-worker.js) 的程式碼貼上並部署。
3. 在該 Worker 的 **Settings -> Bindings** 中，綁定剛才建立的 KV Namespace（變數名稱設為 `ELECTION_BALLOT_KV`）。
4. 複製您的 Worker 網址（例如 `https://tw2026-ballot.your-name.workers.dev`），填入 [`index.html`](./index.html) 第 `716` 行的 `CLOUD_BALLOT_API_URL`：
   ```javascript
   const CLOUD_BALLOT_API_URL = 'https://tw2026-ballot.your-name.workers.dev';
   ```
5. 完成後，前端每 60 秒及每次投票時都會自動與雲端 KV 資料庫同步全網票數！

---

## 🚀 本地執行與公開部署方式

### 本地直接預覽
直接以瀏覽器開啟 `index.html`，或使用任意靜態伺服器：
```bash
# 使用 Node.js npx serve
npx serve .

# 或使用 Python 內建伺服器
python -m http.server 8080
```

### 部署至 GitHub Pages
1. 將本倉庫推送至 GitHub。
2. 進入 GitHub Repository -> **Settings** -> **Pages**。
3. 於 **Build and deployment** 選擇 `Deploy from a branch`，分支選擇 `main`（目錄 `/root`），點擊 **Save** 即可發布公開網址。
