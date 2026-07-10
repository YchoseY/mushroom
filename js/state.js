// 🎯 全自動外掛載入器：自動幫 index.html 引入雲端同步面板
(function() {
    if (!document.querySelector('script[src="js/sync-ui.js"]')) {
        const script = document.createElement('script');
        script.src = 'js/sync-ui.js';
        document.body.appendChild(script);
    }
})();

const DB_KEY = 'pikmin_mushroom_final_database';
const OFFSET_KEY = 'pikmin_app_launch_offset_time';

let timers = {};
let notifiedItems = {}; 
let html5QrcodeScanner = null;
let isRespawnSectionCollapsed = false; 

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
    // 安全防護：如果畫面上連一個 card 節點都還沒有建立（代表 main.js 還沒跑完），絕對不允許覆蓋存檔！
    const container = document.getElementById('tracker-container');
    if (!container) return;
    
    const cards = document.querySelectorAll('.card:not(.ocr-confirming)'); const data = [];
    cards.forEach(card => {
        const id = card.id.replace('card-', ''); const nameEl = document.getElementById(`name-${id}`);
        if (nameEl) { data.push({ id: id, name: nameEl.value, min: document.getElementById(`m-${id}`).value, sec: document.getElementById(`s-${id}`).value, targetTime: card.dataset.respawnTime }); }
    });
    localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function loadState() {
    try {
        migrateOldData();
        const stored = localStorage.getItem(DB_KEY); 
        const container = document.getElementById('tracker-container');
        if (container) container.innerHTML = ''; 
        
        if (stored && typeof addMushroom === 'function') {
            let data = JSON.parse(stored);
            if (data.length > 0) {
                let hasEmpty = false; data = data.filter(item => { const isEmpty = (item.name.trim() === "" && item.min === "" && item.sec === "" && item.targetTime === "Infinity"); if (isEmpty) { if (!hasEmpty) { hasEmpty = true; return true; } return false; } return true; });
                data.forEach(item => addMushroom(item)); 
                if (typeof sortMushrooms === 'function') sortMushrooms(); 
                if (typeof renderRespawnBadges === 'function') renderRespawnBadges(); 
                saveState(); 
                return;
            }
        }
    } catch(error) {
        console.error("本地資料安全相容恢復中：", error);
    }
    if (typeof ensureEmptyRow === 'function') ensureEmptyRow(false); 
}
