// ★ 全獨立定時巡邏雲端模組 - 漸進式折疊（點擊監聽絕對修正版）
const MY_GAS_API_URL = "https://script.google.com/macros/s/AKfycbzzCL1Bin86sj4yvtSeF2n_dMF7LDHB_EbDJI2zX4DUFI0FMidnfX1V-wco1tLGFahP/exec"; 
const SYNC_KEY_STORAGE = 'pikmin_cloud_sync_6_char_key';

let isCloudPanelExpanded = false;

// 🎯 全域點擊防禦網：不論內部 HTML 怎麼刷，只要點到面板，100% 觸發開合
document.addEventListener("click", function(e) {
    // 尋找點擊的目標是不是在雲端面板內
    const panel = document.getElementById("cloud-sync-panel");
    if (!panel) return;
    
    // 如果點擊的地方在面板裡面
    if (panel.contains(e.target)) {
        // 防呆：如果是點到裡面的「按鈕」或「輸入框」，乖乖執行原功能，不要收合
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
        
        // 點到空白處或文字，立刻觸發折疊
        isCloudPanelExpanded = !isCloudPanelExpanded;
        updateSyncUiStatus();
    }
});

// 🎯 定時巡邏，當 <h2> 出現就注入面板
let uiCheckTimer = setInterval(() => {
    const h2El = document.querySelector("h2");
    if (h2El) {
        clearInterval(uiCheckTimer);
        initCloudSyncSystem(h2El);
    }
}, 300);

function getStoredSyncKey() {
    const key = localStorage.getItem(SYNC_KEY_STORAGE);
    return key ? key.trim().toUpperCase() : null;
}

function initCloudSyncSystem(h2El) {
    if (document.getElementById("cloud-sync-panel")) return;
    
    const panel = document.createElement("div");
    panel.id = "cloud-sync-panel";
    // 🎨 滑鼠懸停會變手指，代表可點擊
    panel.style = "background: #f0f7ff; border: 1px solid #d0e3ff; padding: 10px 12px; border-radius: 8px; margin: 10px auto 15px auto; max-width: 500px; font-size: 0.9rem; font-family: sans-serif; box-sizing: border-box; cursor: pointer; transition: all 0.2s ease-in-out; position: relative; box-shadow: 0 2px 6px rgba(37,117,252,0.05);";
    
    h2El.parentNode.insertBefore(panel, h2El.nextSibling);
    
    updateSyncUiStatus();
    loadCloudDataOnInit();

    if (typeof window.saveState === "function") {
        const originalSaveState = window.saveState;
        window.saveState = function() {
            originalSaveState(); 
            uploadToCloudBackground(); 
        };
    }
}

// 核心：動態渲染面板內部（平時只保留第一行，展開才露出按鈕群）
function updateSyncUiStatus() {
    const panel = document.getElementById("cloud-sync-panel");
    if (!panel) return;
    
    const currentKey = getStoredSyncKey();
    const arrow = isCloudPanelExpanded ? "▵" : "▿";
    
    let htmlContent = "";
    
    if (currentKey) {
        htmlContent = `
            <div style="font-weight: bold; color: #333; display: flex; justify-content: center; align-items: center; gap: 6px; user-select: none;">
                🟢 雲端同步中：專屬金鑰【 <span style="color:#2575fc; font-weight:bold; font-size:1.02rem;">${currentKey}</span> 】
                <span style="color: #888; font-size: 0.8rem; margin-left: 4px;">${arrow}</span>
            </div>
        `;
    } else {
        htmlContent = `
            <div style="font-weight: bold; color: #555; display: flex; justify-content: center; align-items: center; gap: 6px; user-select: none;">
                ⚪ 雲端狀態：單機模式 (資料僅存於此手機)
                <span style="color: #888; font-size: 0.8rem; margin-left: 4px;">${arrow}</span>
            </div>
        `;
    }
    
    if (isCloudPanelExpanded) {
        panel.style.background = "#e6f2ff";
        panel.style.borderColor = "#b3d7ff";
        
        if (currentKey) {
            htmlContent += `
                <div style="border-top: 1px dashed #d0e3ff; margin-top: 8px; padding-top: 8px; animation: fadeIn 0.2s ease-out;">
                    <span style="color: #666; font-size:0.8rem; display:block; margin-bottom:8px; user-select: none;">💡 所有日常修改（點擊 ✓、刪除 ✕ 等）皆會自動送上雲端。</span>
                    <div style="display:flex; justify-content:center; gap:8px;">
                        <button onclick="forceManualSync()" style="background: #2ecc71; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; font-weight:bold;">
                            🔄 手動同步/刷新
                        </button>
                        <button onclick="unlinkSyncKey()" style="background: #ff4d4d; color: white; border: none; padding: 5px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">
                            ❌ 解除雲端綁定
                        </button>
                    </div>
                </div>
            `;
        } else {
            htmlContent += `
                <div style="border-top: 1px dashed #d0e3ff; margin-top: 8px; padding-top: 8px; animation: fadeIn 0.2s ease-out;">
                    <div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:4px;">
                        <button onclick="generateNewSyncKey()" style="background: #2575fc; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                            🔗 產生同步金鑰
                        </button>
                        <span style="color: #ccc; margin: 0 4px;">|</span>
                        <input type="text" id="sync-input-field" placeholder="輸入6碼金鑰" maxlength="10" style="width: 100px; padding: 5px; text-align: center; border: 1px solid #ccc; border-radius: 4px; font-size: 0.85rem; box-sizing: border-box;">
                        <button onclick="triggerUiBinding()" style="background: #2ecc71; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">
                            🤝 連線綁定
                        </button>
                    </div>
                </div>
            `;
        }
    } else {
        panel.style.background = "#f0f7ff";
        panel.style.borderColor = "#d0e3ff";
    }
    
    panel.innerHTML = htmlContent;
}

// 開機自動拉取雲端
function loadCloudDataOnInit() {
    const syncKey = getStoredSyncKey();
    if (!syncKey || !MY_GAS_API_URL || !MY_GAS_API_URL.startsWith("https")) return;
    
    fetch(MY_GAS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "load", key: syncKey })
    })
    .then(res => res.json())
    .then(resData => {
        if (resData.status === "success" && resData.data && resData.data !== "[]") {
            localStorage.setItem('pikmin_mushroom_final_database', resData.data);
            if (typeof renderLoadedData === "function") renderLoadedData(resData.data);
        }
    }).catch(err => console.log("雲端自動加載略過", err));
}

// 背景默默同步上傳
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
    }).catch(err => console.log("背景同步略過", err));
}

// 🔄 手動刷新
function forceManualSync() {
    const syncKey = getStoredSyncKey();
    if (!syncKey) return;
    alert("正在連線雲端進行三方智慧融合...");
    
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
        if (typeof renderLoadedData === "function") renderLoadedData(JSON.stringify(finalArray));
        
        fetch(MY_GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "save", key: syncKey, data: JSON.stringify(finalArray) })
        }).then(() => {
            alert("🚀 雲端三方智慧融合與同步刷新成功！");
            isCloudPanelExpanded = false; 
            updateSyncUiStatus();
        });
    }).catch(() => alert("❌ 刷新失敗，請確認網路連線。"));
}

// 🔗 產生金鑰
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
                isCloudPanelExpanded = false; 
                updateSyncUiStatus();
            });
        }
    }).catch(() => alert("❌ 雲端連線失敗，請檢查網路狀態。"));
}

// 🤝 連線綁定
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
                    isCloudPanelExpanded = false; 
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
                    isCloudPanelExpanded = false; 
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
        isCloudPanelExpanded = false; 
        updateSyncUiStatus();
    }
}

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

const styleSheet = document.createElement("style");
styleSheet.innerText = `@keyframes fadeIn { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(styleSheet);
