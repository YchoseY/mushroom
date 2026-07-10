// ★ 雲端個人同步插槽 (請在此處填入你最新部署複製的 Google Apps Script 網頁應用程式 URL)
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzzCL1Bin86sj4yvtSeF2n_dMF7LDHB_EbDJI2zX4DUFI0FMidnfX1V-wco1tLGFahP/exec";

const DB_KEY = 'pikmin_mushroom_final_database';
const OFFSET_KEY = 'pikmin_app_launch_offset_time';
const KEY_STORAGE_NAME = 'pikmin_cloud_sync_6_char_key'; // 本地記憶金鑰的牆

let timers = {};
let notifiedItems = {}; 
let html5QrcodeScanner = null;
let isRespawnSectionCollapsed = false; 

// 🎯 全自動防呆校正：獲取金鑰並自動轉大寫、去空格
function getStoredSyncKey() {
    const key = localStorage.getItem(KEY_STORAGE_NAME);
    return key ? key.trim().toUpperCase() : null;
}

function loadLaunchOffset() {
    const saved = localStorage.getItem(OFFSET_KEY);
    if (saved !== null) { document.getElementById('app-launch-offset').value = saved; }
}

function saveLaunchOffset() {
    const val = document.getElementById('app-launch-offset').value;
    localStorage.setItem(OFFSET_KEY, val);
}

function migrateOldData() {
    const oldKeys = ['pikminMushrooms', 'pikminMushrooms_v2', 'pikminMushrooms_pwa', 'pikminMushrooms_v3', 'pikminMushrooms_v4'];
    let migratedData = [];
    const currentDb = localStorage.getItem(DB_KEY);
    if (currentDb) return; 
    for (let oldKey of oldKeys) {
        const oldData = localStorage.getItem(oldKey);
        if (oldData) { try { const parsed = JSON.parse(oldData); if (Array.isArray(parsed) && parsed.length > 0) { migratedData = parsed; break; } } catch(e) {} }
    }
    if (migratedData.length > 0) { localStorage.setItem(DB_KEY, JSON.stringify(migratedData)); }
}

// 🎯 核心同步存檔：每次本地變更，在背景自動與雲端最新檔案進行「三方智慧融合」後才覆蓋，確保永不洗掉任何一邊的新菇點
function saveState() {
    const container = document.getElementById('tracker-container');
    if (!container) return;
    
    const cards = document.querySelectorAll('.card:not(.ocr-confirming)'); const data = [];
    cards.forEach(card => {
        const id = card.id.replace('card-', ''); const nameEl = document.getElementById(`name-${id}`);
        if (nameEl) { data.push({ id: id, name: nameEl.value, min: document.getElementById(`m-${id}`).value, sec: document.getElementById(`s-${id}`).value, targetTime: card.dataset.respawnTime }); }
    });
    
    const jsonString = JSON.stringify(data);
    localStorage.setItem(DB_KEY, jsonString);
    
    const syncKey = getStoredSyncKey();
    if (syncKey && GAS_API_URL && GAS_API_URL.startsWith("https")) {
        // 先去雲端抓取最新的遠端資料，與剛產出的本地資料做一次無感智慧融合
        fetch(GAS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: "load", key: syncKey })
        })
        .then(res => res.json())
        .then(resData => {
            let finalMergedArray = data;
            if (resData.status === "success" && resData.data && resData.data !== "[]") {
                const cloudArray = JSON.parse(resData.data);
                finalMergedArray = backgroundExecuteMerge(data, cloudArray);
            }
            // 融合完成後，再把萬無一失的完整大合集上傳回雲端
            fetch(GAS_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "save", key: syncKey, data: JSON.stringify(finalMergedArray) })
            });
        }).catch(err => console.log("背景異步同步中...", err));
    }
}

// 🎯 開機全自動靜態讀檔：如果綁定過金鑰，一開網頁自動去雲端抓取對齊，完全免登入
function loadState() {
    try {
        migrateOldData();
        const syncKey = getStoredSyncKey();
        
        if (syncKey && GAS_API_URL && GAS_API_URL.startsWith("https")) {
            fetch(GAS_API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({ action: "load", key: syncKey })
            })
            .then(res => res.json())
            .then(resData => {
                if (resData.status === "success" && resData.data && resData.data !== "[]") {
                    localStorage.setItem(DB_KEY, resData.data); 
                    renderLoadedData(resData.data);
                } else {
                    renderLoadedData(localStorage.getItem(DB_KEY));
                }
            })
            .catch(err => {
                console.log("改用本地快取讀取", err);
                renderLoadedData(localStorage.getItem(DB_KEY));
            });
        } else {
            renderLoadedData(localStorage.getItem(DB_KEY));
        }
    } catch(error) {
        console.error("本地資料安全相容恢復中：", error);
        if (typeof ensureEmptyRow === 'function') ensureEmptyRow(false); 
    }
}

function renderLoadedData(stored) {
    const container = document.getElementById('tracker-container');
    if (container) container.innerHTML = ''; 
    if (stored) {
        let data = JSON.parse(stored);
        if (data.length > 0) {
            let hasEmpty = false; data = data.filter(item => { const isEmpty = (item.name.trim() === "" && item.min === "" && item.sec === "" && item.targetTime === "Infinity"); if (isEmpty) { if (!hasEmpty) { hasEmpty = true; return true; } return false; } return true; });
            data.forEach(item => addMushroom(item)); 
            if (typeof sortMushrooms === 'function') sortMushrooms(); 
            if (typeof renderRespawnBadges === 'function') renderRespawnBadges(); 
            return;
        }
    }
    if (typeof ensureEmptyRow === 'function') ensureEmptyRow(false); 
}

// 內部專用背景融合大腦：不更動外部 mergeArrays 介面，確保程式碼相容安全
function backgroundExecuteMerge(localArray, remoteArray) {
    const mergedMap = new Map();
    let uniqueTimeCounter = Date.now();
    localArray.forEach(item => { const nameKey = item.name.trim(); if (nameKey !== "") { mergedMap.set(nameKey, item); } });
    remoteArray.forEach(item => {
        const nameKey = item.name.trim();
        if (nameKey !== "") {
            if (mergedMap.has(nameKey)) { const oldItem = mergedMap.get(nameKey); item.id = oldItem.id; mergedMap.set(nameKey, item); } 
            else { uniqueTimeCounter++; item.id = uniqueTimeCounter; mergedMap.set(nameKey, item); }
        }
    });
    return Array.from(mergedMap.values());
}
    .catch(err => alert("❌ 金鑰連線查無資料或網路逾時，請重新檢查。"));
}
