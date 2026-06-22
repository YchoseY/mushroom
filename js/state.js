// 全域資料庫與計時狀態定義（強制鎖定所有新舊箱子基因）
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

// ★ 終極移轉防護盾：在開檔第一秒，強行檢查並融合你所有的舊蘑菇箱子
function migrateOldData() {
    const oldKeys = ['pikminMushrooms', 'pikminMushrooms_v2', 'pikminMushrooms_pwa', 'pikminMushrooms_v3', 'pikminMushrooms_v4'];
    let migratedData = [];
    
    // 巡查所有可能用過的舊儲存名稱
    for (let oldKey of oldKeys) {
        const oldData = localStorage.getItem(oldKey);
        if (oldData) { 
            try { 
                const parsed = JSON.parse(oldData); 
                if (Array.isArray(parsed) && parsed.length > 0) { 
                    migratedData = parsed; 
                    break; // 抓到你最珍貴的舊資料了！
                } 
            } catch(e) {} 
        }
    }
    
    // 如果新箱子是空的，而舊箱子有資料，立刻全自動安全搬家！
    const currentDb = localStorage.getItem(DB_KEY);
    if (!currentDb && migratedData.length > 0) { 
        localStorage.setItem(DB_KEY, JSON.stringify(migratedData)); 
    }
}

function saveState() {
    const cards = document.querySelectorAll('.card:not(.ocr-confirming)'); const data = [];
    cards.forEach(card => {
        const id = card.id.replace('card-', ''); const nameEl = document.getElementById(`name-${id}`);
        if (nameEl) { data.push({ id: id, name: nameEl.value, min: document.getElementById(`m-${id}`).value, sec: document.getElementById(`s-${id}`).value, targetTime: card.dataset.respawnTime }); }
    });
    localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function loadState() {
    try {
        migrateOldData(); // 🎯 確保讀取前先執行搬家，一秒撈回所有舊菇點！
        const stored = localStorage.getItem(DB_KEY); 
        document.getElementById('tracker-container').innerHTML = ''; 
        if (stored) {
            let data = JSON.parse(stored);
            if (data.length > 0) {
                let hasEmpty = false; data = data.filter(item => { const isEmpty = (item.name.trim() === "" && item.min === "" && item.sec === "" && item.targetTime === "Infinity"); if (isEmpty) { if (!hasEmpty) { hasEmpty = true; return true; } return false; } return true; });
                data.forEach(item => addMushroom(item)); sortMushrooms(); ensureEmptyRow(false); renderRespawnBadges(); saveState(); return;
            }
        }
    } catch(e) {
        console.error("相容恢復中", e);
    }
    ensureEmptyRow(false); 
}
