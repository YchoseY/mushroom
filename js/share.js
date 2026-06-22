function getPackedData() {
    if (typeof saveState === 'function') saveState();
    const data = localStorage.getItem(DB_KEY);
    if (!data || data === "[]") return null;
    return btoa(encodeURIComponent(data));
}

function shareViaURL() {
    const packed = getPackedData();
    if (!packed) return alert('目前沒有資料可以分享喔！');
    const shareUrl = window.location.origin + window.location.pathname + '?share=' + packed;
    navigator.clipboard.writeText(shareUrl).then(() => { alert('🔗 LINE 分享網址已複製！'); }).catch(() => { prompt("請複製以下網址：", shareUrl); });
}

function checkSharedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareData = urlParams.get('share');
    if (shareData) {
        try { 
            const decodedString = decodeURIComponent(atob(shareData)); 
            mergeArrays(JSON.parse(decodedString)); 
            window.history.replaceState({}, document.title, window.location.pathname); 
            alert("✅ 已成功合併紀錄！"); 
        } catch(e) { 
            alert("❌ 網址解析失敗。"); 
            if (typeof loadState === 'function') loadState();
        }
    } else { 
        if (typeof loadState === 'function') loadState(); 
    }
}

// ★ 超稀疏 QR 碼進化盾：加入雲端自動濃縮機制，將像素密度降到最低！
function showShareQR() {
    const packed = getPackedData();
    if (!packed) return alert('目前沒有資料喔！');
    
    document.getElementById('qr-backdrop').style.display = 'block';
    document.getElementById('qrModal').style.display = 'block';
    
    const qrContainer = document.getElementById("qrcode");
    if (!qrContainer) return;
    qrContainer.innerHTML = "<div style='color:#666; font-size:0.9rem; padding:20px;'>⏳ 正在全自動濃縮格子，產出高好掃條碼...</div>";
    
    // 建立完整的分享網址
    const shareUrl = window.location.origin + window.location.pathname + '?share=' + packed;
    
    // 使用公開免費的 TinyURL 服務，把密密麻麻的長字串縮短成十幾個字元
    fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(shareUrl)}`)
    .then(response => response.text())
    .then(shortUrl => {
        qrContainer.innerHTML = "";
        const qrImg = document.createElement('img');
        // 🎯 核心改變：用極短的 shortUrl 來畫圖，格子會變得超級稀疏、超級大！
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`;
        qrImg.style.width = "200px";
        qrImg.style.height = "200px";
        qrImg.style.display = "block";
        qrImg.style.margin = "0 auto";
        qrImg.alt = "戰情分享QR碼";
        qrContainer.appendChild(qrImg);
    })
    .catch(err => {
        console.error("濃縮失敗，啟用安全備援方案", err);
        qrContainer.innerHTML = "";
        const qrImg = document.createElement('img');
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(packed)}`;
        qrImg.style.width = "200px";
        qrImg.style.height = "200px";
        qrImg.style.display = "block";
        qrImg.style.margin = "0 auto";
        qrContainer.appendChild(qrImg);
    });
}

function closeQRModal() { 
    document.getElementById('qr-backdrop').style.display = 'none'; 
    document.getElementById('qrModal').style.display = 'none'; 
}

function copyShareCode() {
    const packed = getPackedData();
    if (!packed) return alert('目前沒有資料喔！');
    const prefixCode = "PIKMIN-" + packed;
    navigator.clipboard.writeText(prefixCode).then(() => { alert('📋 皮克敏文字碼已複製！'); }).catch(() => { prompt("請手動複製此代碼：", prefixCode); });
}

function mergeArrays(sharedArray) {
    const localString = localStorage.getItem(DB_KEY);
    const localArray = localString ? JSON.parse(localString) : [];
    const mergedMap = new Map();
    let uniqueTimeCounter = Date.now();
    localArray.forEach(item => { const nameKey = item.name.trim(); if (nameKey !== "") { mergedMap.set(nameKey, item); } });
    sharedArray.forEach(item => {
        const nameKey = item.name.trim();
        if (nameKey !== "") {
            if (mergedMap.has(nameKey)) { const oldItem = mergedMap.get(nameKey); item.id = oldItem.id; mergedMap.set(nameKey, item); } 
            else { uniqueTimeCounter++; item.id = uniqueTimeCounter; mergedMap.set(nameKey, item); }
        }
    });
    localStorage.setItem(DB_KEY, JSON.stringify(Array.from(mergedMap.values())));
    
    const container = document.getElementById('tracker-container');
    if (container) container.innerHTML = '';
    
    if (typeof loadState === 'function') loadState();
}
