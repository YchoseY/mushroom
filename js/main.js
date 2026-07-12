// ★ 核心打菇戰情大腦 - 隱形歸檔與解除凍結修正完全體

// ★ 精準通知授權盾：讓使用者點擊最上方的「🍄 皮克敏蘑菇戰情板」標題時，100% 強制逼出 iPhone 通知詢問視窗
document.addEventListener("DOMContentLoaded", () => { const h2 = document.querySelector("h2"); if (h2) { h2.style.cursor = "pointer"; h2.onclick = () => { if ("Notification" in window) { Notification.requestPermission().then(permission => { alert(`通知權限狀態：${permission} (若為 granted 代表成功開通！)`); }); } }; } });

function requestNotificationPermission() { if ("Notification" in window) { Notification.requestPermission(); } }

// ★ 核心修復：精準重寫通知發送語法，完美對齊 iPhone (iOS) PWA 的 Service Worker 推送規範
function sendWebNotification(title, bodyText) {
    try { document.getElementById('alert-sound').play(); } catch(e){}
    
    if ("Notification" in window && Notification.permission === "granted") {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: bodyText,
                    icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food%20Drink/Mushroom.png"
                });
            });
        } else {
            new Notification(title, { 
                body: bodyText, 
                icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food%20Drink/Mushroom.png" 
            });
        }
    }
}

// 🌐 切換分頁控制函式（由 index.html 的按鈕觸發）
function switchZoneTab(zoneKey) {
    currentActiveZone = zoneKey; // 更新 state.js 裡的全域變數
    
    const tabs = document.querySelectorAll('.zone-tab-btn');
    tabs.forEach(tab => {
        if (tab.id === `tab-${zoneKey}`) {
            tab.style.background = "#2575fc";
            tab.style.color = "white";
            tab.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
        } else {
            tab.style.background = "#e0e0e0";
            tab.style.color = "#333";
            tab.style.boxShadow = "none";
        }
    });

    filterUiByCurrentZone();
}

// 🔍 核心過濾邏輯：控制卡片與歷史標籤的隱形/現身
function filterUiByCurrentZone() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (card.classList.contains('is-respawned')) {
            card.style.setProperty('display', 'none', 'important');
            return;
        }

        const id = card.id.replace('card-', '');
        const zoneEl = document.getElementById(`zone-${id}`);
        const cardZone = zoneEl ? zoneEl.value : (card.dataset.zone || 'all');

        // ✅ 修改這裡：新增 unassigned 判斷邏輯
        if (currentActiveZone === 'all') {
            card.style.setProperty('display', 'flex', 'important');
        } else if (currentActiveZone === 'unassigned' && cardZone === 'all') {
            card.style.setProperty('display', 'flex', 'important'); // 未分類專屬
        } else if (cardZone === currentActiveZone) {
            card.style.setProperty('display', 'flex', 'important'); // 吻合當前分類
        } else {
            card.style.setProperty('display', 'none', 'important');
        }
    });

    // 過濾已重生的「紅色歷史標籤」
    const badges = document.querySelectorAll('.badge-item');
    badges.forEach(badge => {
        const badgeZone = badge.dataset.zone || 'all';
        
        // ✅ 歷史標籤也要同步修改邏輯
        if (currentActiveZone === 'all') {
            badge.style.setProperty('display', 'flex', 'important');
        } else if (currentActiveZone === 'unassigned' && badgeZone === 'all') {
            badge.style.setProperty('display', 'flex', 'important');
        } else if (badgeZone === currentActiveZone) {
            badge.style.setProperty('display', 'flex', 'important');
        } else {
            badge.style.setProperty('display', 'none', 'important');
        }
    });
}

function updateCountdown(id, targetTime, timeString) {
    const resDiv = document.getElementById(`res-${id}`); 
    const card = document.getElementById(`card-${id}`); 
    if (!resDiv || !card) return;
    
    const now = Date.now(); 
    const diff = targetTime - now;
    
    if (diff > 0 && diff <= 60000 && !notifiedItems[id]) { 
        notifiedItems[id] = true; 
        sendWebNotification("🍄 蘑菇即將重生！", `「${document.getElementById(`name-${id}`).value || "蘑菇"}」將在 1 分鐘後重生！`);
    }
    
    if (diff <= 0) {
        if (timers[id]) clearInterval(timers[id]);
        resDiv.innerHTML = `<span class="countdown" style="color:#2ecc71;">已重生！</span>`;
        if (!card.classList.contains('is-respawned') && card.dataset.respawnTime !== "Infinity" && !card.classList.contains('ocr-confirming')) { 
            card.classList.add('is-respawned');
            renderRespawnBadges(); 
            filterUiByCurrentZone(); 
        }
        return;
    }
    
    const totalRemainingSec = Math.floor(diff / 1000);
    const rM = Math.floor(totalRemainingSec / 60); 
    const rS = totalRemainingSec % 60;
    
    const startSuggestion = calculateAppStartSuggestion(totalRemainingSec);
    let suggestionHtml = "";
    if (startSuggestion !== null) {
        const sugM = Math.floor(startSuggestion / 60);
        const sugS = startSuggestion % 60;
        const formattedTime = sugM > 0 ? `${sugM}分${sugS}秒` : `${sugS}秒`;
        suggestionHtml = `<div class="app-start-hint">建議開Game：倒數 <b>${formattedTime}</b></div>`;
    }

    if(window.innerWidth > 768) { 
        resDiv.innerHTML = `
            <div class="countdown">剩餘 ${rM} 分 ${rS} 秒</div>
            <div class="target-time">預計重生於 ${timeString}</div>
            ${suggestionHtml}
        `; 
    } else { 
        resDiv.innerHTML = `
            <div class="countdown">${rM}分${rS}秒</div>
            <div class="target-time">(${timeString} 重生)</div>
            ${suggestionHtml}
        `; 
    }
}

function addMushroom(data = null) {
    const container = document.getElementById('tracker-container');
    if(!container) return;
    const id = data ? data.id : Date.now();
    const card = document.createElement('div');
    card.className = 'card'; card.id = `card-${id}`;
    card.dataset.respawnTime = data && data.targetTime ? data.targetTime : Infinity;
    card.dataset.zone = data && data.zone ? data.zone : 'all'; 

    const targetTimeNum = data && data.targetTime ? parseFloat(data.targetTime) : Infinity;
    if (targetTimeNum !== Infinity && targetTimeNum <= Date.now()) {
        card.classList.add('is-respawned');
    }

    // ✨ 語法修正點：徹底重寫並修正三元運算子 missing ] 錯誤
    const isAll = (data && data.zone === 'all') || !data ? 'selected' : '';
    const isHome = data && data.zone === 'home' ? 'selected' : '';
    const isOffice = data && data.zone === 'office' ? 'selected' : '';
    const isTravel = data && data.zone === 'travel' ? 'selected' : '';

// 🏡 究極血統鎖：一改變就直接改寫底層 LocalStorage，不經過任何變數轉手
    const zoneSelectHtml = `
        <select id="zone-${id}" onchange="
            try {
                let db = JSON.parse(localStorage.getItem('pikmin_mushroom_final_database') || '[]');
                let item = db.find(x => x.id == '${id}');
                if(item) { item.zone = this.value; localStorage.setItem('pikmin_mushroom_final_database', JSON.stringify(db)); }
                document.getElementById('card-${id}').dataset.zone = this.value;
                if(typeof uploadToCloudBackground === 'function'){ uploadToCloudBackground(); }
                filterUiByCurrentZone();
            } catch(e){ console.error(e); }
        " style="padding: 6px 2px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.85rem; background: #fff; outline: none; cursor: pointer; width: 44px; text-align: center; font-family: sans-serif; flex-shrink: 0; margin-right: 2px;">
            <option value="all" ${data && data.zone==='all'?'selected':''}>🌐</option>
            <option value="home" ${data && data.zone==='home'?'selected':''}>🏠</option>
            <option value="office" ${data && data.zone==='office'?'selected':''}>🏢</option>
            <option value="travel" ${data && data.zone==='travel'?'selected':''}>🏖️</option>
        </select>
    `;

      // 替換 addMushroom 裡的 card.innerHTML 這段
    card.innerHTML = `
    <div class="input-item-wrap">
        <input type="text" id="name-${id}" placeholder="地點" value="${data ? data.name : ''}">
        ${zoneSelectHtml}
        <input type="number" inputmode="numeric" pattern="[0-9]*" id="m-${id}" placeholder="分" min="0" value="${data ? data.min : ''}">:
        <input type="number" inputmode="numeric" pattern="[0-9]*" id="s-${id}" placeholder="秒" min="0" value="${data ? data.sec : ''}">
        <button class="btn-calc" id="btn-${id}" onclick="startTracking('${id}')">✓</button>
    </div>
    <div class="mobile-row-two">
        <div class="result-box" id="res-${id}"> <span style="color: #bbb; font-size:0.85rem;">未設定</span> </div>
        <button class="btn-edit" id="edit-${id}" onclick="editMushroom('${id}')" style="display:none;">編輯</button>
        <button class="btn-delete" id="del-${id}" onclick="removeMushroom('${id}')">✕</button>
    </div>
    `;

    
    container.appendChild(card); attachEvents(id); updateButtonText(id);
    
    if (data && data.targetTime && data.targetTime !== "Infinity" && targetTimeNum > Date.now()) { 
        resumeTracking(id, parseInt(data.targetTime)); 
    } else {
        const resDiv = document.getElementById(`res-${id}`);
        if (resDiv) resDiv.innerHTML = `<span class="countdown" style="color:#2ecc71;">已重生！</span>`;
        if (!data) { saveState(); }
    }
    return id; 
}

function updateButtonText(id) {
    const btnCalc = document.getElementById(`btn-${id}`); 
    const btnDel = document.getElementById(`del-${id}`);
    const btnEdit = document.getElementById(`edit-${id}`);
    if (!btnCalc || !btnDel) return;
    
    // 檢查目前這張卡片是否正在編輯中
    const card = document.getElementById(`card-${id}`);
    const isEditing = card ? card.classList.contains('is-editing') : false;

    if (window.innerWidth > 768) { 
        btnCalc.innerText = "確認"; 
        btnDel.innerText = "刪除"; 
        if(btnEdit) btnEdit.innerText = isEditing ? "取消" : "編輯"; // ✅ 變身為取消
    } else { 
        btnCalc.innerText = "✓"; 
        btnDel.innerText = "✕"; 
        if(btnEdit) btnEdit.innerText = isEditing ? "↩️" : "✏️";  // ✅ 變身為返回圖示
    }
}


function attachEvents(id) {
    const nameInput = document.getElementById(`name-${id}`); const minInput = document.getElementById(`m-${id}`); const secInput = document.getElementById(`s-${id}`); const btnCalc = document.getElementById(`btn-${id}`);
    if(!nameInput) return;
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); minInput.focus(); }});
    minInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); secInput.focus(); }});
    secInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); btnCalc.click(); }});
    minInput.addEventListener('focus', () => { setTimeout(() => { minInput.select(); }, 10); });
    secInput.addEventListener('focus', () => { setTimeout(() => { secInput.select(); }, 10); });
    nameInput.addEventListener('change', saveState);
    minInput.addEventListener('change', saveState);
    secInput.addEventListener('change', saveState);
}

function ensureEmptyRow(shouldFocus = false) {
    const cards = document.querySelectorAll('.card:not(.ocr-confirming)'); 
    let hasTrueEmptyRow = false; let emptyCardId = null;
    for (let card of cards) {
        const id = card.id.replace('card-', '');
        const nameVal = document.getElementById(`name-${id}`).value.trim(); const minVal = document.getElementById(`m-${id}`).value.trim(); const secVal = document.getElementById(`s-${id}`).value.trim();
        if (card.dataset.respawnTime === "Infinity" && nameVal === "" && minVal === "" && secVal === "") { hasTrueEmptyRow = true; emptyCardId = id; break; }
    }
    if (!hasTrueEmptyRow) { 
        const defaultZone = currentActiveZone === 'all' ? 'all' : currentActiveZone;
        emptyCardId = addMushroom({ id: Date.now(), name: '', min: '', sec: '', targetTime: 'Infinity', zone: defaultZone }); 
    }
    if (shouldFocus && emptyCardId) { 
        setTimeout(() => { 
            const nameInput = document.getElementById(`name-${emptyCardId}`); 
            if (nameInput) { nameInput.focus(); nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            filterUiByCurrentZone(); 
        }, 100); 
    }
}

function startTracking(id) {
    const min = parseInt(document.getElementById(`m-${id}`).value) || 0; const sec = parseInt(document.getElementById(`s-${id}`).value) || 0;
    if (min === 0 && sec === 0) { return; }
    
    const card = document.getElementById(`card-${id}`);
    if (card) card.classList.remove('is-editing');
    const btnEdit = document.getElementById(`edit-${id}`);
    if (btnEdit) btnEdit.setAttribute('onclick', `editMushroom('${id}')`);

    const offsetEl = document.getElementById('app-launch-offset');
    const offset = offsetEl ? parseInt(offsetEl.value) || 0 : 3;

    const now = Date.now(); 
    const targetTime = now + (((min * 60) + sec + 300) * 1000);
    
    delete notifiedItems[id]; resumeTracking(id, targetTime); sortMushrooms(); saveState(); ensureEmptyRow(true);
}


function resumeTracking(id, targetTime) {
    const card = document.getElementById('card-' + id); if (!card) return;
    card.dataset.respawnTime = targetTime; card.classList.remove('is-respawned');
    if (targetTime !== Infinity && !card.classList.contains('ocr-confirming')) { card.classList.add('active'); }
    
    const nameInput = document.getElementById(`name-${id}`);
    const minInput = document.getElementById(`m-${id}`);
    const secInput = document.getElementById(`s-${id}`);
    const zoneSel = document.getElementById(`zone-${id}`);
    
    if (nameInput) nameInput.disabled = true;
    if (minInput) minInput.disabled = true;
    if (secInput) secInput.disabled = true;
    if (zoneSel) zoneSel.disabled = false;
    
    const btnCalc = document.getElementById(`btn-${id}`);
    if (btnCalc) btnCalc.style.display = 'none';

    // 👇 新增這段 👇
    const btnEdit = document.getElementById(`edit-${id}`);
    if (btnEdit && targetTime !== Infinity && !card.classList.contains('ocr-confirming')) {
        btnEdit.style.display = 'inline-block';
    }

    if (timers[id]) clearInterval(timers[id]);
    const respawnDate = new Date(targetTime); 
    const timeString = respawnDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (typeof updateCountdown === 'function') {
        updateCountdown(id, targetTime, timeString); 
        timers[id] = setInterval(() => { updateCountdown(id, targetTime, timeString); }, 1000);
    }
}

function removeMushroom(id) {
    if (id.startsWith('OCR_')) { if (typeof removeOCRConfirmingCard === 'function') removeOCRConfirmingCard(id); return; }
    if (timers[id]) clearInterval(timers[id]);
    delete notifiedItems[id]; const card = document.getElementById(`card-${id}`); if (card) card.remove();
    saveState(); renderRespawnBadges(); filterUiByCurrentZone(); 
}

function removeCard(id) { removeMushroom(id); }

function sortMushrooms() {
    const container = document.getElementById('tracker-container'); if (!container) return;
    const cards = Array.from(container.getElementsByClassName('card'));
    cards.sort((a, b) => {
        if (a.classList.contains('ocr-confirming') && !b.classList.contains('ocr-confirming')) return -1;
        if (!a.classList.contains('ocr-confirming') && b.classList.contains('ocr-confirming')) return 1;
        return parseFloat(a.dataset.respawnTime) - parseFloat(b.dataset.respawnTime);
    });
    cards.forEach(card => container.appendChild(card));
}

function renderRespawnBadges() {
    const wrapper = document.getElementById('respawn-area-wrapper'); if (!wrapper) return;
    const cards = Array.from(document.querySelectorAll('.card:not(.ocr-confirming)')); const respawnedItems = [];
    cards.forEach(card => {
        const id = card.id.replace('card-', ''); const targetTime = parseFloat(card.dataset.respawnTime); const nameVal = document.getElementById(`name-${id}`).value.trim();
        const zoneEl = document.getElementById(`zone-${id}`);
        const itemZone = zoneEl ? zoneEl.value : (card.dataset.zone || 'all');
        if (card.classList.contains('is-respawned') && targetTime !== Infinity && nameVal !== "") { respawnedItems.push({ id, name: nameVal, targetTime, zone: itemZone }); }
    });
    respawnedItems.sort((a, b) => b.targetTime - a.targetTime);
    if (respawnedItems.length === 0) { wrapper.innerHTML = ""; return; }
    const toggleText = isRespawnSectionCollapsed ? `展開 (${respawnedItems.length}) ▾` : "隱藏收合 ▴";
    wrapper.innerHTML = `<div class="respawn-header-row"><span>🍄 已重生歷史菇點：</span><button class="btn-toggle-respawn" onclick="toggleRespawnContainer()">${toggleText}</button></div><div id="respawn-badge-container" class="${isRespawnSectionCollapsed ? 'collapsed' : ''}"></div>`;
    const badgeContainer = document.getElementById('respawn-badge-container');
    respawnedItems.forEach(item => {
        const badge = document.createElement('div'); badge.className = 'badge-item'; 
        badge.dataset.zone = item.zone; 
        badge.innerHTML = `${item.name}`; 
        badge.onclick = () => activateRespawnedCard(item.id); badgeContainer.appendChild(badge);
    });
    filterUiByCurrentZone(); 
}

function toggleRespawnContainer() { isRespawnSectionCollapsed = !isRespawnSectionCollapsed; renderRespawnBadges(); }

function activateRespawnedCard(id) {
    const card = document.getElementById(`card-${id}`); if (!card) return;
    card.classList.remove('is-respawned');
    
    const nameInput = document.getElementById(`name-${id}`);
    const minInput = document.getElementById(`m-${id}`);
    const secInput = document.getElementById(`s-${id}`);
    const zoneSel = document.getElementById(`zone-${id}`);
    const btnCalc = document.getElementById(`btn-${id}`);
    const btnEdit = document.getElementById(`edit-${id}`);
    
    if (nameInput) nameInput.disabled = false;
    if (minInput) minInput.disabled = false;
    if (secInput) secInput.disabled = false;
    if (zoneSel) zoneSel.disabled = false;
    if (btnCalc) btnCalc.style.display = 'inline-block';
    // 👇 新增這段 👇
    if (btnEdit) btnEdit.style.display = 'none';

    // ✅ 關鍵修正：必須在點擊的同步瞬間立刻 focus()，才能騙過手機瀏覽器喚醒鍵盤
    if (minInput) minInput.focus();
    
    renderRespawnBadges();
    setTimeout(() => { 
        card.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
        // 延遲選取文字依然可以保留，確保畫面穩定後反白
        if (minInput) { setTimeout(() => { minInput.select(); }, 20); } 
    }, 80);
}


function calculateAppStartSuggestion(totalRemainingSec) {
    const offsetEl = document.getElementById('app-launch-offset');
    const baseOffset = offsetEl ? parseInt(offsetEl.value) || 0 : 3;
    if (totalRemainingSec < baseOffset) return null;
    const maxN = Math.floor((totalRemainingSec - baseOffset) / 8);
    if (maxN < 0) return null;
    return baseOffset + (8 * maxN);
}

// ✏️ 啟動編輯模式 (含安全備份機制)
function editMushroom(id) {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;

    // 1. 標註此卡片進入編輯狀態，並啟動時空備份
    card.classList.add('is-editing');
    card.dataset.backedTime = card.dataset.respawnTime; // 備份絕對重生時間點
    card.dataset.backedMin = document.getElementById(`m-${id}`) ? document.getElementById(`m-${id}`).value : "";
    card.dataset.backedSec = document.getElementById(`s-${id}`) ? document.getElementById(`s-${id}`).value : "";

    // 2. 暫停目前的計時器，避免背景繼續跑導致畫面衝突
    if (timers[id]) clearInterval(timers[id]);
    delete notifiedItems[id];
    card.classList.remove('active'); // 暫時移除綠色運作邊框

    // 3. 抓取 UI 元件
    const nameInput = document.getElementById(`name-${id}`);
    const minInput = document.getElementById(`m-${id}`);
    const secInput = document.getElementById(`s-${id}`);
    const zoneSel = document.getElementById(`zone-${id}`);
    const btnCalc = document.getElementById(`btn-${id}`);
    const btnEdit = document.getElementById(`edit-${id}`);
    const resDiv = document.getElementById(`res-${id}`);

    // 4. 解鎖輸入框，並清空輸入格方便玩家直接盲打新時間
    if (nameInput) nameInput.disabled = false;
    if (minInput) { minInput.disabled = false; minInput.value = ''; }
    if (secInput) { secInput.disabled = false; secInput.value = ''; }
    if (zoneSel) zoneSel.disabled = false;
    
    // 5. 切換按鈕型態：把編輯按鈕偷偷改造成「取消按鈕」
    if (btnCalc) btnCalc.style.display = 'inline-block';
    if (btnEdit) {
        btnEdit.style.display = 'inline-block';
        btnEdit.setAttribute('onclick', `cancelEdit('${id}')`); // ✅ 改為觸發取消
    }
    if (resDiv) resDiv.innerHTML = `<span style="color: #bbb; font-size:0.85rem;">修改時間中...</span>`;
    
    // 6. 自動聚焦，並重新整理按鈕文字
    if (minInput) minInput.focus();
    updateButtonText(id);
}

// ↩️ 取消編輯模式 (時空還原)
function cancelEdit(id) {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;

    // 1. 拔除編輯標籤，並將按鈕功能改回原本的「編輯」
    card.classList.remove('is-editing');
    const btnEdit = document.getElementById(`edit-${id}`);
    if (btnEdit) btnEdit.setAttribute('onclick', `editMushroom('${id}')`);

    // 2. 抓取原先備份的時空資料
    const backedTime = card.dataset.backedTime;
    const nameInput = document.getElementById(`name-${id}`);
    const minInput = document.getElementById(`m-${id}`);
    const secInput = document.getElementById(`s-${id}`);
    const zoneSel = document.getElementById(`zone-${id}`);
    const btnCalc = document.getElementById(`btn-${id}`);

    // 3. 判斷原本是否有在倒數。如果原本就在倒數，且時間還沒到，就執行還原
    if (backedTime && backedTime !== 'Infinity' && parseFloat(backedTime) > Date.now()) {
        if (minInput) minInput.value = card.dataset.backedMin;
        if (secInput) secInput.value = card.dataset.backedSec;
        
        // 重新啟動原本的倒數追蹤
        resumeTracking(id, parseInt(backedTime));
    } else {
        // 如果原本就是空的未設定格子，或是時間在編輯期間早就到了，就退回未設定狀態
        if (nameInput) nameInput.disabled = false;
        if (minInput) { minInput.disabled = false; minInput.value = card.dataset.backedMin; }
        if (secInput) { secInput.disabled = false; secInput.value = card.dataset.backedSec; }
        if (zoneSel) zoneSel.disabled = false;
        if (btnCalc) btnCalc.style.display = 'inline-block';
        if (btnEdit) btnEdit.style.display = 'none';
        
        const resDiv = document.getElementById(`res-${id}`);
        if (resDiv) resDiv.innerHTML = `<span style="color: #bbb; font-size:0.85rem;">未設定</span>`;
        card.dataset.respawnTime = 'Infinity';
        card.classList.remove('active');
    }

    // 4. 更新按鈕外觀並同步地端/雲端
    updateButtonText(id);
    saveState();
}


window.addEventListener('resize', () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const id = card.id.replace('card-', '');
        updateButtonText(id);
    });
});

// 🕰️ 全域常駐每秒更新
setInterval(() => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (!card.classList.contains('is-respawned') && card.dataset.respawnTime !== "Infinity") {
            const id = card.id.replace('card-', '');
            if (timers[id]) {
                const targetTime = parseFloat(card.dataset.respawnTime);
                const respawnDate = new Date(targetTime);
                const timeString = respawnDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                updateCountdown(id, targetTime, timeString);
            }
        }
    });
}, 1000);
