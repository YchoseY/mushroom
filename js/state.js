const DB_KEY = 'pikmin_mushroom_final_database';
const OFFSET_KEY = 'pikmin_app_launch_offset_time';

let timers = {};
let notifiedItems = {}; 
let html5QrcodeScanner = null;
let isRespawnSectionCollapsed = false; 

// 🎯 追蹤目前使用者停在哪個分頁，預設是全部 'all'
let currentActiveZone = 'all';

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
    
    // ✨ 修正點：不論卡片有沒有 is-respawned 類別，通通都要掃描並打包！
    const cards = document.querySelectorAll('.card'); 
    const data = [];
    
    cards.forEach(card => {
        const id = card.id.replace('card-', ''); 
        const nameEl = document.getElementById(`name-${id}`);
        
        // 🎯 100% 精準抓取下拉選單目前的真實選擇
        const zoneEl = document.getElementById(`zone-${id}`);
        const zoneVal = zoneEl ? zoneEl.value : (card.dataset.zone || 'all');

        if (nameEl) { 
            data.push({ 
                id: id, 
                name: nameEl.value, 
                min: document.getElementById(`m-${id}`) ? document.getElementById(`m-${id}`).value : "", 
                sec: document.getElementById(`s-${id}`) ? document.getElementById(`s-${id}`).value : "", 
                targetTime: card.dataset.respawnTime,
                zone: zoneVal // 🚀 確保百分之百寫入陣列物件中！
            }); 
        }
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
                let hasEmpty = false; 
                data = data.filter(item => { 
                    const isEmpty = (item.name.trim() === "" && item.min === "" && item.sec === "" && item.targetTime === "Infinity"); 
                    if (isEmpty) { if (!hasEmpty) { hasEmpty = true; return true; } return false; } 
                    return true; 
                });
                
                data.forEach(item => {
                    // 🛡️ 安全防護防爆：如果是以前沒有 zone 屬性的老菇點，開機時一律全自動給它 'all' (未分類)
                    if (!item.zone) { item.zone = 'all'; }
                    addMushroom(item); 
                }); 
                
                if (typeof sortMushrooms === 'function') sortMushrooms(); 
                if (typeof renderRespawnBadges === 'function') renderRespawnBadges(); 
                
                // 🚀 載入完畢後，根據當前的分頁立刻做一次視覺過濾
                if (typeof filterUiByCurrentZone === 'function') filterUiByCurrentZone();
                
                saveState(); 
                return;
            }
        }
    } catch(error) {
        console.error("本地資料安全相容恢復中：", error);
    }
    if (typeof ensureEmptyRow === 'function') ensureEmptyRow(false); 
}
