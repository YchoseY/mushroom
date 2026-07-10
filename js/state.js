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


/* ==========================================================================
   ★ 終極人性化：6碼金鑰「生成」、「綁定與純名稱摘要防呆驗證盾」外部操控介面
   ========================================================================== */

// 【核心操作一】：一鍵生成世界上絕對不重複的 6 碼幸運短金鑰（自帶雲端查重功能）
function generateNewSyncKey() {
    if (!GAS_API_URL || !GAS_API_URL.startsWith("https")) return alert("❌ 請先在 state.js 中設定您的 GAS_API_URL！");
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    
    function loopCreateAndCheck() {
        let resultKey = "PKM"; // 前綴固定，好認好打
        for (let i = 0; i < 3; i++) { resultKey += chars.charAt(Math.floor(Math.random() * chars.length)); }
        
        // 帶著生好的 6 碼去雲端驗證有沒有撞衫
        fetch(GAS_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: "check_duplicate", key: resultKey })
        })
        .then(res => res.json())
        .then(resData => {
            if (resData.status === "success" && resData.exists === true) {
                loopCreateAndCheck(); // 萬一極低機率撞衫了，自我拋棄並重抽
            } else {
                // 雲端確認完全沒人用過！安全通關
                localStorage.setItem(KEY_STORAGE_NAME, resultKey);
                
                // 將目前本地現有的舊菇點直接整包灌進這間新房間當作初始資料
                const localData = localStorage.getItem(DB_KEY) || "[]";
                fetch(GAS_API_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "save", key: resultKey, data: localData })
                }).then(() => {
                    alert(`🎉 雲端個人同步通道開通成功！\n\n🔑 您的專屬同步金鑰為：【 ${resultKey} 】\n\n💡 請將此 6 碼記下來。在其他裝置輸入此金鑰，即可完美跨裝置同步菇點戰情！`);
                    location.reload();
                });
            }
        })
        .catch(() => alert("❌ 雲端連線失敗，請檢查網路狀態。"));
    }
    
    if(getStoredSyncKey()) {
        if(!confirm(`⚠️ 您目前已經綁定過金鑰【 ${getStoredSyncKey()} 】了。\n重新生成將會脫離目前的雲端房間，確定要重新生成嗎？`)) return;
    }
    loopCreateAndCheck();
}

// 【核心操作二】：在另一台裝置輸入金鑰（觸發純名稱摘要防錯盾，雙向安全核對）
function bindExistingSyncKey(inputRawKey) {
    if (!GAS_API_URL || !GAS_API_URL.startsWith("https")) return alert("❌ 請先在 state.js 中設定您的 GAS_API_URL！");
    if (!inputRawKey) return alert("請輸入有效的 6 碼金鑰！");
    
    // 全自動大寫、去空格校正防呆
    const cleanKey = inputRawKey.trim().toUpperCase();
    
    // 前往雲端索取指定金鑰房間內的菇點
    fetch(GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "load", key: cleanKey })
    })
    .then(res => res.json())
    .then(resData => {
        if (resData.status === "success") {
            const cloudArray = JSON.parse(resData.data || "[]");
            
            // 🔒 遺漏風險 1 防護盾：如果保險箱是空的，跳出空置提示
            if (cloudArray.length === 0) {
                if (confirm(`💡 您輸入的金鑰【 ${cleanKey} 】目前在雲端是「空置的保險箱」（內部無任何菇點紀錄）。\n\n確認這是否為您剛建立的全新金鑰？點擊「確定」將會把此裝置目前的菇點綁定上傳。`)) {
                    localStorage.setItem(KEY_STORAGE_NAME, cleanKey);
                    saveState();
                    setTimeout(() => { location.reload(); }, 300);
                }
                return;
            }
            
            // 🔒 人性化防護盾：只過濾出純菇點「名稱」，排開做成簡潔摘要
            const nameList = cloudArray
                .map(item => item.name ? item.name.trim() : "")
                .filter(name => name !== "")
                .map(name => `📌 ${name}`);
            
            const summaryText = nameList.length > 0 ? nameList.join("\n") : "(內含未命名地點紀錄)";
            
            // 彈出終極防錯核對視窗
            const userChoice = confirm(
                `🔍 雲端同步確認安全盾\n\n` +
                `已成功在雲端找到該金鑰包含的以下菇點摘要：\n` +
                `----------------------------------------\n` +
                `${summaryText}\n` +
                `----------------------------------------\n` +
                `⚠️ 請核對：這是否為您另一台裝置的資料？\n\n` +
                `點擊「確定」將合併兩台裝置的菇點。\n` +
                `點擊「取消」將中止連線，保護您的資料。`
            );
            
            if (userChoice) {
                // 使用者點選確定！執行本地與雲端融合
                localStorage.setItem(KEY_STORAGE_NAME, cleanKey);
                const localString = localStorage.getItem(DB_KEY);
                const localArray = localString ? JSON.parse(localString) : [];
                
                // 本地(3) + 雲端(4) = 完美融合(7)
                const finalMerged = backgroundExecuteMerge(localArray, cloudArray);
                localStorage.setItem(DB_KEY, JSON.stringify(finalMerged));
                
                // 融合完立刻回傳更新雲端，全裝置達成完全體同步
                fetch(GAS_API_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "save", key: cleanKey, data: JSON.stringify(finalMerged) })
                }).then(() => {
                    alert("✅ 雲端智慧同步綁定成功！裝置已完美交織合併。");
                    location.reload();
                });
            }
        }
    })
    .catch(err => alert("❌ 金鑰連線查無資料或網路逾時，請重新檢查。"));
}
