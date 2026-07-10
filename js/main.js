// ★ 核心打菇戰情大腦 - 隱形歸檔與解除凍結修正版

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

// 🔍 核心過濾邏輯：修正已重生卡片強制隱形、未開始/進行中卡片進行分類
function filterUiByCurrentZone() {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        // ✨ 修正點 1：不論停在哪个分頁，只要是「已重生」的卡片，一律強制隱形不留存於下方！
        if (card.classList.contains('is-respawned')) {
            card.style.setProperty('display', 'none', 'important');
            return;
        }

        const id = card.id.replace('card-', '');
        const zoneEl = document.getElementById(`zone-${id}`);
        const cardZone = zoneEl ? zoneEl.value : (card.dataset.zone || 'all');

        // ✨ 修正點 2：只有未開始、正在進行中且符合當前分頁的卡片才允許現身
        if (currentActiveZone === 'all' || cardZone === currentActiveZone) {
            card.style.setProperty('display', 'flex', 'important');
        } else {
            card.style.setProperty('display', 'none', 'important');
        }
    });

    // 過濾已重生的「紅色歷史標籤」
    const badges = document.querySelectorAll('.badge-item');
    badges.forEach(badge => {
        const badgeZone = badge.dataset.zone || 'all';
        if (currentActiveZone === 'all' || badgeZone === currentActiveZone) {
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
        if (timers[id]) clearInterval(timers[id]);[cite: 2]
        resDiv.innerHTML = `<span class="countdown" style="color:#2ecc71;">已重生！</span>`;[cite: 2]
        if (!card.classList.contains('is-respawned') && card.dataset.respawnTime !== "Infinity" && !card.classList.contains('ocr-confirming')) { 
            card.classList.add('is-respawned');[cite: 2]
            renderRespawnBadges(); 
            filterUiByCurrentZone(); // 🚀 即時觸發過濾，把卡片抽走隱形
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
    const id = data ? data.id : Date.now();[cite: 2]
    const card = document.createElement('div');
    card.className = 'card'; card.id = `card-${id}`;
    card.dataset.respawnTime = data && data.targetTime ? data.targetTime : Infinity;[cite: 2]
    card.dataset.zone = data && data.zone ? data.zone : 'all'; 

    // 如果該卡片已經是歷史重生狀態，先手動給它加上 is-respawned 類別
    const targetTimeNum = data && data.targetTime ? parseFloat(data.targetTime) : Infinity;
    if (targetTimeNum !== Infinity && targetTimeNum <= Date.now()) {
        card.classList.add('is-respawned');
    }

    const zoneSelectHtml = `
        <select id="zone-${id}" onchange="saveState(); filterUiByCurrentZone();" style="padding: 6px 2px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.85rem; background: #fff; outline: none; cursor: pointer; width: 44px; text-align: center; font-family: sans-serif; flex-shrink: 0; margin-right: 2px;">
            <option value="all" ${(data && data.zone==='all')||!data?'selected':''}>🌐</option>
            <option value="home" ${data && data.zone==='home'?'selected':''}>🏠</option>
            <option value="office" ${data && data.zone==='office'?'selected':''}>🏢</option>
            <option value="travel" ${data && data.zone==='travel'?'selected':''}>🗺️</option>
        </select>
    `;
    
    card.innerHTML = `
        <div class="input-item-wrap">
            <input type="text" id="name-${id}" placeholder="地點" value="${data ? data.name : ''}">
            ${zoneSelectHtml}
            <input type="number" id="m-${id}" placeholder="分" min="0" value="${data ? data.min : ''}">:
            <input type="number" id="s-${id}" placeholder="秒" min="0" value="${data ? data.sec : ''}">
            <button class="btn-calc" id="btn-${id}" onclick="startTracking('${id}')">✓</button>
        </div>
        <div class="mobile-row-two">
            <div class="result-box" id="res-${id}"> <span style="color: #bbb; font-size:0.85rem;">未設定</span> </div>
            <button class="btn-delete" id="del-${id}" onclick="removeMushroom('${id}')">✕</button>
        </div>
    `;
    container.appendChild(card); attachEvents(id); updateButtonText(id);[cite: 2]
    
    // ✨ 修正點 3：只有「未重生、仍在未來倒數中」的卡片才予以凍結；已重生的卡片保持開放修改狀態
    if (data && data.targetTime && data.targetTime !== "Infinity" && targetTimeNum > Date.now()) { 
        resumeTracking(id, parseInt(data.targetTime)); 
    } else {
        // 已重生的卡片，UI 顯示「已重生！」字樣，但不准凍結輸入框
        const resDiv = document.getElementById(`res-${id}`);
        if (resDiv) resDiv.innerHTML = `<span class="countdown" style="color:#2ecc71;">已重生！</span>`;
        if (!data) { saveState(); }
    }
    return id; 
}

function updateButtonText(id) {
    const btnCalc = document.getElementById(`btn-${id}`); const btnDel = document.getElementById(`del-${id}`);
    if (!btnCalc || !btnDel) return;
    if (window.innerWidth > 768) { btnCalc.innerText = "確認"; btnDel.innerText = "刪除"; } else { btnCalc.innerText = "✓"; btnDel.innerText = "✕"; }[cite: 2]
}

function attachEvents(id) {
    const nameInput = document.getElementById(`name-${id}`); const minInput = document.getElementById(`m-${id}`); const secInput = document.getElementById(`s-${id}`); const btnCalc = document.getElementById(`btn-${id}`);
    if(!nameInput) return;
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); minInput.focus(); }});[cite: 2]
    minInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); secInput.focus(); }});[cite: 2]
    secInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); btnCalc.click(); }});[cite: 2]
    minInput.addEventListener('focus', () => { setTimeout(() => { minInput.select(); }, 10); });[cite: 2]
    secInput.addEventListener('focus', () => { setTimeout(() => { secInput.select(); }, 10); });[cite: 2]
    nameInput.addEventListener('change', saveState);[cite: 2]
    minInput.addEventListener('change', saveState);
    secInput.addEventListener('change', saveState);
}

function ensureEmptyRow(shouldFocus = false) {
    const cards = document.querySelectorAll('.card:not(.ocr-confirming)'); 
    let hasTrueEmptyRow = false; let emptyCardId = null;
    for (let card of cards) {
        const id = card.id.replace('card-', '');
        const nameVal = document.getElementById(`name-${id}`).value.trim(); const minVal = document.getElementById(`m-${id}`).value.trim(); const secVal = document.getElementById(`s-${id}`).value.trim();[cite: 2]
        if (card.dataset.respawnTime === "Infinity" && nameVal === "" && minVal === "" && secVal === "") { hasTrueEmptyRow = true; emptyCardId = id; break; }[cite: 2]
    }
    if (!hasTrueEmptyRow) { 
        const defaultZone = currentActiveZone === 'all' ? 'all' : currentActiveZone;
        emptyCardId = addMushroom({ id: Date.now(), name: '', min: '', sec: '', targetTime: 'Infinity', zone: defaultZone }); 
    }
    if (shouldFocus && emptyCardId) { 
        setTimeout(() => { 
            const nameInput = document.getElementById(`name-${emptyCardId}`); 
            if (nameInput) { nameInput.focus(); nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); }[cite: 2]
            filterUiByCurrentZone(); 
        }, 100); 
    }
}

function startTracking(id) {
    const min = parseInt(document.getElementById(`m-${id}`).value) || 0; const sec = parseInt(document.getElementById(`s-${id}`).value) || 0;[cite: 2]
    if (min === 0 && sec === 0) { return; }[cite: 2]
    
    const offsetEl = document.getElementById('app-launch-offset');
    const offset = offsetEl ? parseInt(offsetEl.value) || 0 : 3;

    const now = Date.now(); 
    const targetTime = now + (((min * 60) + sec + (300 - offset)) * 1000);
    
    delete notifiedItems[id]; resumeTracking(id, targetTime); sortMushrooms(); saveState(); ensureEmptyRow(true);[cite: 2]
}

function resumeTracking(id, targetTime) {
    const card = document.getElementById('card-' + id); if (!card) return;[cite: 2]
    card.dataset.respawnTime = targetTime; card.classList.remove('is-respawned');[cite: 2]
    if (targetTime !== Infinity && !card.classList.contains('ocr-confirming')) { card.classList.add('active'); }[cite: 2]
    
    // 進入倒數時才凍結
    const nameInput = document.getElementById(`name-${id}`);
    const minInput = document.getElementById(`m-${id}`);
    const secInput = document.getElementById(`s-${id}`);
    const zoneSel = document.getElementById(`zone-${id}`);
    
    if (nameInput) nameInput.disabled = true;
    if (minInput) minInput.disabled = true;
    if (secInput) secInput.disabled = true;
    if (zoneSel) zoneSel.disabled = true;
    
    const btnCalc = document.getElementById(`btn-${id}`);
    if (btnCalc) btnCalc.style.display = 'none';

    if (timers[id]) clearInterval(timers[id]);[cite: 2]
    const respawnDate = new Date(targetTime);[cite: 2]
    const timeString = respawnDate.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' });[cite: 2]
    if (typeof updateCountdown === 'function') {
        updateCountdown(id, targetTime, timeString); 
        timers[id] = setInterval(() => { updateCountdown(id, targetTime, timeString); }, 1000);[cite: 2]
    }
}

function removeMushroom(id) {
    if (id.startsWith('OCR_')) { if (typeof removeOCRConfirmingCard === 'function') removeOCRConfirmingCard(id); return; }[cite: 2]
    if (timers[id]) clearInterval(timers[id]);[cite: 2]
    delete notifiedItems[id]; const card = document.getElementById(`card-${id}`); if (card) card.remove();[cite: 2]
    saveState(); renderRespawnBadges(); filterUiByCurrentZone(); 
}

function removeCard(id) { removeMushroom(id); }

function sortMushrooms() {
    const container = document.getElementById('tracker-container'); if (!container) return;[cite: 2]
    const cards = Array.from(container.getElementsByClassName('card'));[cite: 2]
    cards.sort((a, b) => {
        if (a.classList.contains('ocr-confirming') && !b.classList.contains('ocr-confirming')) return -1;[cite: 2]
        if (!a.classList.contains('ocr-confirming') && b.classList.contains('ocr-confirming')) return 1;[cite: 2]
        return parseFloat(a.dataset.respawnTime) - parseFloat(b.dataset.respawnTime);[cite: 2]
    });
    cards.forEach(card => container.appendChild(card));[cite: 2]
}

function renderRespawnBadges() {
    const wrapper = document.getElementById('respawn-area-wrapper'); if (!wrapper) return;[cite: 2]
    const cards = Array.from(document.querySelectorAll('.card:not(.ocr-confirming)')); const respawnedItems = [];[cite: 2]
    cards.forEach(card => {
        const id = card.id.replace('card-', ''); const targetTime = parseFloat(card.dataset.respawnTime); const nameVal = document.getElementById(`name-${id}`).value.trim();[cite: 2]
        const zoneEl = document.getElementById(`zone-${id}`);
        const itemZone = zoneEl ? zoneEl.value : (card.dataset.zone || 'all');
        if (card.classList.contains('is-respawned') && targetTime !== Infinity && nameVal !== "") { respawnedItems.push({ id, name: nameVal, targetTime, zone: itemZone }); }[cite: 2]
    });
    respawnedItems.sort((a, b) => b.targetTime - a.targetTime);[cite: 2]
    if (respawnedItems.length === 0) { wrapper.innerHTML = ""; return; }[cite: 2]
    const toggleText = isRespawnSectionCollapsed ? `展開 (${respawnedItems.length}) ▾` : "隱藏收合 ▴";[cite: 2]
    wrapper.innerHTML = `<div class="respawn-header-row"><span>🍄 已重生歷史菇點：</span><button class="btn-toggle-respawn" onclick="toggleRespawnContainer()">${toggleText}</button></div><div id="respawn-badge-container" class="${isRespawnSectionCollapsed ? 'collapsed' : ''}"></div>`;[cite: 2]
    const badgeContainer = document.getElementById('respawn-badge-container');[cite: 2]
    respawnedItems.forEach(item => {
        const badge = document.createElement('div'); badge.className = 'badge-item'; 
        badge.dataset.zone = item.zone; 
        badge.innerHTML = `${item.name}`; 
        badge.onclick = () => activateRespawnedCard(item.id); badgeContainer.appendChild(badge);[cite: 2]
    });
    filterUiByCurrentZone(); 
}

function toggleRespawnContainer() { isRespawnSectionCollapsed = !isRespawnSectionCollapsed; renderRespawnBadges(); }[cite: 2]

function activateRespawnedCard(id) {
    const card = document.getElementById(`card-${id}`); if (!card) return;[cite: 2]
    card.classList.remove('is-respawned');[cite: 2]
    
    const nameInput = document.getElementById(`name-${id}`);
    const minInput = document.getElementById(`m-${id}`);
    const secInput = document.getElementById(`s-${id}`);
    const zoneSel = document.getElementById(`zone-${id}`);
    const btnCalc = document.getElementById(`btn-${id}`);
    
    if (nameInput) nameInput.disabled = false;
    if (minInput) minInput.disabled = false;
    if (secInput) secInput.disabled = false;
    if (zoneSel) zoneSel.disabled = false;
    if (btnCalc) btnCalc.style.display = 'inline-block';
    
    renderRespawnBadges();
    setTimeout(() => { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (minInput) { minInput.focus(); setTimeout(() => { minInput.select(); }, 20); } }, 80);[cite: 2]
}

function calculateAppStartSuggestion(totalRemainingSec) {
    const offsetEl = document.getElementById('app-launch-offset');
    const baseOffset = offsetEl ? parseInt(offsetEl.value) || 0 : 3;
    if (totalRemainingSec < baseOffset) return null;[cite: 2]
    const maxN = Math.floor((totalRemainingSec - baseOffset) / 8);[cite: 2]
    if (maxN < 0) return null;[cite: 2]
    return baseOffset + (8 * maxN);[cite: 2]
}

window.addEventListener('resize', () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const id = card.id.replace('card-', '');
        updateButtonText(id);
    });
});

// 🕰️ 常駐計時器：每秒重新整理倒數
setInterval(updateCountdown, 1000);
