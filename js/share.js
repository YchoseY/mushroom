function getPackedData() {
    saveState();
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
        try { const decodedString = decodeURIComponent(atob(shareData)); mergeArrays(JSON.parse(decodedString)); window.history.replaceState({}, document.title, window.location.pathname); alert("✅ 已成功合併紀錄！"); } catch(e) { alert("❌ 網址解析失敗。"); }
    } else { loadState(); }
}

function showShareQR() {
    const packed = getPackedData();
    if (!packed) return alert('目分享前沒有資料喔！');
    document.getElementById('qr-backdrop').style.display = 'block';
    document.getElementById('qrModal').style.display = 'block';
    const qrContainer = document.getElementById("qrcode");
    qrContainer.innerHTML = "";
    new QRCode(qrContainer, { text: packed, width: 200, height: 200 });
}
function closeQRModal() { document.getElementById('qr-backdrop').style.display = 'none'; document.getElementById('qrModal').style.display = 'none'; }

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
    document.getElementById('tracker-container').innerHTML = '';
    loadState();
}
