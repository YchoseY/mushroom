// ★ 雲端個人同步插槽
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzzCL1Bin86sj4yvtSeF2n_dMF7LDHB_EbDJI2zX4DUFI0FMidnfX1V-wco1tLGFahP/exec";

const DB_KEY = 'pikmin_mushroom_final_database';
const OFFSET_KEY = 'pikmin_app_launch_offset_time';
const KEY_STORAGE_NAME = 'pikmin_cloud_sync_6_char_key'; 

let timers = {};
let notifiedItems = {}; 
let html5QrcodeScanner = null;
let isRespawnSectionCollapsed = false; 

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
            fetch(GAS_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "save", key: syncKey, data: JSON.stringify(finalMergedArray) })
            });
        }).catch(err => console.log("背景同步中...", err));
    }
}

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
                console.log("改用本地快取", err);
                renderLoadedData(localStorage.getItem(DB_KEY));
            });
        } else {
            renderLoadedData(localStorage.getItem(DB_KEY));
        }
    } catch(error) {
        console.error("安全相容恢復中：", error);
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

// 🎯 核心大腦融合算法：維持放在 state.js
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
