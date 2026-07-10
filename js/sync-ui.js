// ★ 全獨立非同步安全雲端同步模組 (保證不干擾原架構版本)
const MY_GAS_API_URL = "https://script.google.com/macros/s/AKfycbzzCL1Bin86sj4yvtSeF2n_dMF7LDHB_EbDJI2zX4DUFI0FMidnfX1V-wco1tLGFahP/exec"; 
const SYNC_KEY_STORAGE = 'pikmin_cloud_sync_6_char_key';

// 🎯 安全機制：等待原本所有 main.js 載入完畢，網頁載入完成 1.5 秒後才初始化雲端，確保不干擾原本菇點出現
window.addEventListener("load", () => {
    setTimeout(() => {
        initCloudSyncSystem();
    }, 1500); 
});

function getStoredSyncKey() {
    const key = localStorage.getItem(SYNC_KEY_STORAGE);
    return key ? key.trim().toUpperCase() : null;
}

function initCloudSyncSystem() {
    // 1. 動態在 <h2> 蘑菇戰情板下方插入獨立的雲端面板
    const h2El = document.querySelector("h2");
    if (!h2El) return;
    
    // 如果已經有面板就不重複加
    if (document.getElementById("cloud-sync-panel")) return;
    
    const panel = document.createElement("div");
    panel.id = "cloud-sync-panel";
    panel.style = "background: #f0f7ff; border: 1px solid #d0e3ff; padding: 12px; border-radius: 8px; margin: 10px auto 15px auto; max-width: 500px; text-align: center; font-size: 0.9rem; font-family: sans-serif;";
    h2El.parentNode.insertBefore(panel, h2El.nextSibling);
    
    // 2. 刷新介面按鈕
    updateSyncUiStatus();
    
    // 3. 攔截原本健康的 saveState，讓它存完本地後自動順便上傳，不傷原程式
    if (typeof window.saveState === "function") {
        const originalSaveState = window.saveState;
        window.saveState = function() {
            originalSaveState(); 
            uploadToCloudBackground(); 
        };
    }
}

// 介面與狀態切換
function updateSyncUiStatus() {
    const panel = document.getElementById("cloud-sync-panel");
    if (!panel) return;
    
    const currentKey = getStoredSyncKey();
    if (currentKey) {
        panel.innerHTML = `
            <div style="font-weight: bold; color: #333; margin-bottom: 8px;">
                🟢 雲端同步中：專屬金鑰【 <span style="color:#2575fc; font-weight:bold; font-size:1.05rem;">${currentKey}</span> 】
            </div>
            <span style="color: #666; font-size:0.8rem; display:block; margin-bottom:6px;">💡 所有日常修改（點擊 ✓、刪除 ✕ 等）皆會自動送上雲端。</span>
            <div style="display:flex; justify-content:center; gap:8px;">
                <button onclick="forceManualSync()" style="background: #2ecc71; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight:bold;">
                    🔄 手動同步/刷新
                </button>
                <button onclick="unlinkSyncKey()" style="background: #ff4d4d; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                    ❌ 解除雲端綁定
                </button>
            </div>
        `;
    } else {
        panel.innerHTML = `
            <div style="font-weight: bold; color: #333; margin-bottom: 8px;">
                ⚪ 雲端狀態：單機模式 (資料僅存於此手機)
            </div>
            <div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:4px;">
                <button onclick="generateNewSyncKey()" style="background: #2575fc; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                    🔗 產生同步金鑰
                </button>
                <span style="color: #ccc; margin: 0 4px;">|</span>
                <input type="text" id="sync-input-field" placeholder="輸入6碼金鑰" maxlength="10" style="width: 100px; padding: 5px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem;">
                <button onclick="triggerUiBinding()" style="background: #2ecc71; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                    🤝 連線綁定
                </button>
            </div>
        `;
    }
}

// 背景靜態上傳
function uploadToCloudBackground() {
    const syncKey = getStoredSyncKey();
    if (!syncKey || !MY_GAS_API_URL || !MY_GAS_API_URL.startsWith("https")) return;
    
    const localData = localStorage.getItem('pikmin_mushroom_final_database') || "[]";
    const localArray = JSON.parse(localData);
    
    fetch(MY_GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "load", key: syncKey })
    })
    .then(res => res.json())
    .then(resData => {
        let finalArray = localArray;
        if (resData.status === "success" && resData.data && resData.data !== "[]") {
            finalArray = uiModuleMerge(localArray, JSON.parse(resData.data));
        }
        fetch(MY_GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save", key: syncKey, data: JSON.stringify(finalArray) })
        });
    }).catch(err => console.log("備份同步略過", err));
}

// 🔄 按鈕功能：手動智慧融合與重新加載
function forceManualSync() {
    const syncKey = getStoredSyncKey();
    if (!syncKey) return;
    
    const localData = localStorage.getItem('pikmin_mushroom_final_database') || "[]";
    const localArray = JSON.parse(localData);
    
    fetch(MY_GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "load", key: syncKey })
    })
    .then(res => res.json())
    .then(resData => {
        let finalArray = localArray;
        if (resData.status === "success" && resData.data && resData.data !== "[]") {
            finalArray = uiModuleMerge(localArray, JSON.parse(resData.data));
        }
        localStorage.setItem('pikmin_mushroom_final_database', JSON.stringify(finalArray));
        
        // 安全呼叫原廠健康的渲染器重新畫圖
        if (typeof renderLoadedData === "function") {
            renderLoadedData(JSON.stringify(finalArray));
        }
        
        fetch(MY_GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save", key: syncKey, data: JSON.stringify(finalArray) })
        }).then(() => {
            alert("🚀 雲端三方智慧融合與同步刷新成功！");
        });
    }).catch(() => alert("❌ 刷新失敗，請確認網路連線。"));
}

// 🔗 按鈕功能：產生 6 碼
function generateNewSyncKey() {
    if (!MY_GAS_API_URL || !MY_GAS_API_URL.startsWith("https")) return alert("❌ 請填入正確的 API 網址！");
    
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let resultKey = "PKM";
    for (let i = 0; i < 3; i++) { resultKey += chars.charAt(Math.floor(Math.random() * chars.length)); }
    
    fetch(MY_GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "check_duplicate", key: resultKey })
    })
    .then(res => res.json())
    .then(resData => {
        if (resData.status === "success" && resData.exists === true) {
            generateNewSyncKey(); 
        } else {
            localStorage.setItem(SYNC_KEY_STORAGE, resultKey);
            const localData = localStorage.getItem('pikmin_mushroom_final_database') || "[]";
            
            fetch(MY_GAS_API_URL, {
                method: "POST",
                mode: "no-cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "save", key: resultKey, data: localData })
            }).then(() => {
                alert(`🎉 雲端個人同步通道開通成功！\n\n🔑 您的專屬同步金鑰為：【 ${resultKey} 】`);
                updateSyncUiStatus();
            });
        }
    }).catch(() => alert("❌ 雲端連線失敗，請檢查網路狀態。"));
}

// 🤝 按鈕功能：手動輸入連線與名稱摘要
function triggerUiBinding() {
    const inputEl = document.getElementById("sync-input-field");
    if (!inputEl || !inputEl.value.trim()) return alert("請輸入有效的 6 碼金鑰！");
    
    const cleanKey = inputEl.value.trim().toUpperCase();
    
    fetch(MY_GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "load", key: cleanKey })
    })
    .then(res => res.json())
    .then(resData => {
        if (resData.status === "success") {
            const cloudArray = JSON.parse(resData.data || "[]");
            
            if (cloudArray.length === 0) {
                if (confirm(`💡 您輸入的金鑰【 ${cleanKey} 】目前在雲端無任何菇點紀錄。\n\n點擊「確定」將會把此裝置目前的菇點綁定上傳。`)) {
                    localStorage.setItem(SYNC_KEY_STORAGE, cleanKey);
                    updateSyncUiStatus();
                    uploadToCloudBackground();
                }
                return;
            }
            
            const nameList = cloudArray
                .map(item => item.name ? item.name.trim() : "")
                .filter(name => name !== "")
                .map(name => `📌 ${name}`);
            
            const summaryText = nameList.length > 0 ? nameList.join("\n") : "(內含未命名地點紀錄)";
            
            if (confirm(`🔍 雲端同步確認安全盾\n\n已成功找到該金鑰包含的以下菇點摘要：\n----------------------------------------\n${summaryText}\n----------------------------------------\n⚠️ 請核對：這是否為您另一台裝置的資料？\n\n點擊「確定」將合併兩台裝置的菇點。`)) {
                localStorage.setItem(SYNC_KEY_STORAGE, cleanKey);
                const localString = localStorage.getItem('pikmin_mushroom_final_database');
                const localArray = localString ? JSON.parse(localString) : [];
                
                const finalMerged = uiModuleMerge(localArray, cloudArray);
                localStorage.setItem('pikmin_mushroom_final_database', JSON.stringify(finalMerged));
                
                if (typeof renderLoadedData === "function") {
                    renderLoadedData(JSON.stringify(finalMerged));
                }
                
                fetch(MY_GAS_API_URL, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "save", key: cleanKey, data: JSON.stringify(finalMerged) })
                }).then(() => {
                    alert("✅ 雲端智慧同步綁定成功！");
                    updateSyncUiStatus();
                });
            }
        }
    }).catch(() => alert("❌ 金鑰連線查無資料或網路逾時。"));
}

function unlinkSyncKey() {
    if (confirm("確定要斷開與雲端的連線嗎？\n\n斷開後這台手機新增的菇點將不會傳上雲端，但目前的菇點紀錄依然會保留。")) {
        localStorage.removeItem(SYNC_KEY_STORAGE);
        alert("已成功退回本地單機模式！");
        updateSyncUiStatus();
    }
}

// 智慧合併演算法
function uiModuleMerge(localArray, remoteArray) {
    const mergedMap = new Map();
    let uniqueTimeCounter = Date.now();
    localArray.forEach(item => { if (item.name && item.name.trim() !== "") { mergedMap.set(item.name.trim(), item); } });
    remoteArray.forEach(item => {
        if (item.name && item.name.trim() !== "") {
            const nameKey = item.name.trim();
            if (mergedMap.has(nameKey)) { const oldItem = mergedMap.get(nameKey); item.id = oldItem.id; mergedMap.set(nameKey, item); } 
            else { uniqueTimeCounter++; item.id = uniqueTimeCounter; mergedMap.set(nameKey, item); }
        }
    });
    return Array.from(mergedMap.values());
}
