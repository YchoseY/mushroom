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

// 🌐 生活圈分頁核心 1：切換分頁控制函式（由 index.html 的按鈕觸發）
function switchZoneTab(zoneKey) {
    currentActiveZone = zoneKey; // 更新 state.js 裡的全域變數
    
    // 🎨 UI 視覺反饋：切換按鈕的點亮狀態
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

    // 🚀 即時連動過濾畫面上的所有物件
    filterUiByCurrentZone();
}

// 🔍 生活圈分頁核心 2：控制卡片與歷史標籤的隱形/現身
function filterUiByCurrentZone() {
    // A. 過濾進行中的「計時卡片」
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const id = card.id.replace('card-', '');
        const zoneEl = document.getElementById(`zone-${id}`);
        const cardZone = zoneEl ? zoneEl.value : (card.dataset.zone || 'all');

        if (currentActiveZone === 'all' || cardZone === currentActiveZone) {
            card.style.setProperty('display', 'flex', 'important');
        } else {
            card.style.setProperty('display', 'none', 'important');
        }
    });

    // B. 過濾已重生的「紅色歷史標籤」
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
        if (timers[id]) clearInterval(timers[id]); 
        resDiv.innerHTML = `<span class="countdown" style="color:#2ecc71;">已重生！</span>`;
        if (!card.classList.contains('is-respawned') && card.dataset.respawnTime !== "Infinity" && !card.classList.contains('ocr-confirming')) { 
            card.classList.add('is-respawned'); 
            renderRespawnBadges();
            filterUiByCurrentZone(); // 🚀 重生後立刻過濾
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
    card.dataset.zone = data && data.zone ? data.zone : 'all'; // 🏡 記憶生活圈血統

    // 🏡 建立極精美微型的生活圈下拉選擇鈕（放在地名輸入框右側）
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
    container.appendChild(card); attachEvents(id); updateButtonText(id); 
    if (data && data.targetTime && data.targetTime !== "Infinity") { resumeTracking(id, parseInt(data.targetTime)); } 
    else if (!data) { saveState(); }
    return id; 
}

function updateButtonText(id) {
    const btnCalc = document.getElementById(`btn-${id}`); const btnDel = document.getElementById(`del-${id}`);
    if (!btnCalc || !btnDel) return;
    if (window.innerWidth > 768) { btnCalc.innerText = "確認"; btnDel.innerText = "刪除"; } else { btnCalc.innerText = "✓"; btnDel.innerText = "✕"; }
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
        // 🚀 新增卡片時，自動讓它繼承目前使用者停留在哪一個生活圈分頁！
        const defaultZone = currentActiveZone === 'all' ? 'all' : currentActiveZone;
        emptyCardId = addMushroom({ id: Date.now(), name: '', min: '', sec: '', targetTime: 'Infinity', zone: defaultZone }); 
    }
    if (shouldFocus && emptyCardId) { 
        setTimeout(() => { 
            const nameInput = document.getElementById(`name-${emptyCardId}`); 
            if (nameInput) { nameInput.focus(); nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); } 
            filterUiByCurrentZone(); // 確保視覺隱形正確
        }, 100); 
    }
}

function startTracking(id) {
    const min = parseInt(document.getElementById(`m-${id}`).value) || 0; const sec = parseInt(document.getElementById(`s-${id}`).value) || 0;
    if (min === 0 && sec === 0) { return; }
    
    // 抓取我們剛剛隱藏或顯示的地圖延遲數值
    const offsetEl = document.getElementById('app-launch-offset');
    const offset = offsetEl ? parseInt(offsetEl.value) || 0 : 3;

    const now = Date.now(); 
    // 🎯 完美對齊原廠 300 秒及 offset 補償公式
    const targetTime = now + (((min * 60) + sec + (300 - offset)) * 1000);
    
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
    if (zoneSel) zoneSel.disabled = true;
    
    const btnCalc = document.getElementById(`btn-${id}`);
    if (btnCalc) btnCalc.style.display = 'none';

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

function removeCard(id) { removeMushroom(id); } // 加強原廠舊腳本調用相容

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

// 🔴 歷史紅色標籤渲染：升級為完美整合原廠收合與生活圈標記血統
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
        badge.dataset.zone = item.zone; // 貼上分頁標記
        badge.innerHTML = `${item.name}`; 
        badge.onclick = () => activateRespawnedCard(item.id); badgeContainer.appendChild(badge);
    });
    filterUiByCurrentZone(); // 每次重畫後立即套用分頁過濾
}

function toggleRespawnContainer() { isRespawnSectionCollapsed = !isRespawnSectionCollapsed; renderRespawnBadges(); }

function activateRespawnedCard(id) {
    const card = document.getElementById(`card-${id}`); if (!card) return;
    card.classList.remove('is-respawned'); 
    
    // 恢復輸入框狀態
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
    setTimeout(() => { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (minInput) { minInput.focus(); setTimeout(() => { minInput.select(); }, 20); } }, 80);
}

function calculateAppStartSuggestion(totalRemainingSec) {
    const offsetEl = document.getElementById('app-launch-offset');
    const baseOffset = offsetEl ? parseInt(offsetEl.value) || 0 : 3;
    if (totalRemainingSec < baseOffset) return null;
    const maxN = Math.floor((totalRemainingSec - baseOffset) / 8);
    if (maxN < 0) return null;
    return baseOffset + (8 * maxN);
}

// 視窗大小改變時，按鈕文字自適應（保留原廠 RWD 計畫）
window.addEventListener('resize', () => {
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const id = card.id.replace('card-', '');
        updateButtonText(id);
    });
});
