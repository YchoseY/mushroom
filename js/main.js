// ★ 精準通知授權盾：讓使用者點擊最上方的「🍄 皮克敏蘑菇戰情板」標題時，100% 強制逼出 iPhone 通知詢問視窗
document.addEventListener("DOMContentLoaded", () => { const h2 = document.querySelector("h2"); if (h2) { h2.style.cursor = "pointer"; h2.onclick = () => { if ("Notification" in window) { Notification.requestPermission().then(permission => { alert(`通知權限狀態：${permission} (若為 granted 代表成功開通！)`); }); } }; } });

function requestNotificationPermission() { if ("Notification" in window) { Notification.requestPermission(); } }

// ★ 核心修復：精準重寫通知發送語法，完美對齊 iPhone (iOS) PWA 的 Service Worker 推送規範
function sendWebNotification(title, bodyText) {
    try { document.getElementById('alert-sound').play(); } catch(e){}
    
    if ("Notification" in window && Notification.permission === "granted") {
        // 🎯 專為 iPhone (iOS) 主畫面環境設計的相容通知發送公式
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, {
                    body: bodyText,
                    icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food%20Drink/Mushroom.png"
                });
            });
        } else {
            // 傳統電腦、瀏覽器相容模式
            new Notification(title, { 
                body: bodyText, 
                icon: "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food%20Drink/Mushroom.png" 
            });
        }
    }
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
    
    card.innerHTML = `
        <div class="input-item-wrap">
            <input type="text" id="name-${id}" placeholder="地點" value="${data ? data.name : ''}">
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
    if (!hasTrueEmptyRow) { emptyCardId = addMushroom(); }
    if (shouldFocus && emptyCardId) { setTimeout(() => { const nameInput = document.getElementById(`name-${emptyCardId}`); if (nameInput) { nameInput.focus(); nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, 100); }
}

function startTracking(id) {
    const min = parseInt(document.getElementById(`m-${id}`).value) || 0; const sec = parseInt(document.getElementById(`s-${id}`).value) || 0;
    if (min === 0 && sec === 0) { return; }
    const now = Date.now(); const targetTime = now + (((min * 60) + sec + 300) * 1000);
    delete notifiedItems[id]; resumeTracking(id, targetTime); sortMushrooms(); saveState(); ensureEmptyRow(true);
}

function resumeTracking(id, targetTime) {
    const card = document.getElementById('card-' + id); if (!card) return;
    card.dataset.respawnTime = targetTime; card.classList.remove('is-respawned');
    if (targetTime !== Infinity && !card.classList.contains('ocr-confirming')) { card.classList.add('active'); }
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
    saveState(); renderRespawnBadges(); 
}

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
        if (card.classList.contains('is-respawned') && targetTime !== Infinity && nameVal !== "") { respawnedItems.push({ id, name: nameVal, targetTime }); }
    });
    respawnedItems.sort((a, b) => b.targetTime - a.targetTime);
    if (respawnedItems.length === 0) { wrapper.innerHTML = ""; return; }
    const toggleText = isRespawnSectionCollapsed ? `展開 (${respawnedItems.length}) ▾` : "隱藏收合 ▴";
    wrapper.innerHTML = `<div class="respawn-header-row"><span>🍄 已重生歷史菇點：</span><button class="btn-toggle-respawn" onclick="toggleRespawnContainer()">${toggleText}</button></div><div id="respawn-badge-container" class="${isRespawnSectionCollapsed ? 'collapsed' : ''}"></div>`;
    const badgeContainer = document.getElementById('respawn-badge-container');
    respawnedItems.forEach(item => {
        const badge = document.createElement('div'); badge.className = 'badge-item'; 
        badge.innerHTML = `${item.name}`; 
        badge.onclick = () => activateRespawnedCard(item.id); badgeContainer.appendChild(badge);
    });
}

function toggleRespawnContainer() { isRespawnSectionCollapsed = !isRespawnSectionCollapsed; renderRespawnBadges(); }
function activateRespawnedCard(id) {
    const card = document.getElementById(`card-${id}`); if (!card) return;
    card.classList.remove('is-respawned'); renderRespawnBadges();
    setTimeout(() => { card.scrollIntoView({ behavior: 'smooth', block: 'center' }); const minInput = document.getElementById(`m-${id}`); if (minInput) { minInput.focus(); setTimeout(() => { minInput.select(); }, 20); } }, 80);
}

function calculateAppStartSuggestion(totalRemainingSec) {
    const baseOffset = parseInt(document.getElementById('app-launch-offset').value) || 0;
    if (totalRemainingSec < baseOffset) return null;
    const maxN = Math.floor((totalRemainingSec - baseOffset) / 8);
    if (maxN < 0) return null;
    return baseOffset + (8 * maxN);
}
