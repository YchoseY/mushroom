function openOcrModal() { document.getElementById('ocr-backdrop').style.display = 'block'; document.getElementById('ocrModal').style.display = 'block'; }
function closeOcrModal() { document.getElementById('ocr-backdrop').style.display = 'none'; document.getElementById('ocrModal').style.display = 'none'; }
function openImportModal() { document.getElementById('import-backdrop').style.display = 'block'; document.getElementById('importModal').style.display = 'block'; }
function closeImportModal() {
    if (html5QrcodeScanner) { html5QrcodeScanner.stop().catch(e => {}); html5QrcodeScanner = null; }
    document.getElementById('reader').style.display = 'none'; document.getElementById('import-backdrop').style.display = 'none'; document.getElementById('importModal').style.display = 'none';
}

function importManualCode() {
    let val = document.getElementById('manualCodeInput').value.trim();
    if(!val) return alert('請先貼上代碼！');
    if (val.startsWith("PIKMIN-") || val.startsWith("PKM-")) val = val.replace("PIKMIN-", "").replace("PKM-", "");
    try { mergeArrays(JSON.parse(decodeURIComponent(atob(val)))); document.getElementById('manualCodeInput').value = ''; closeImportModal(); alert("✅ 成功合併資料！"); } catch(e) { alert("❌ 代碼解析失敗。"); }
}

function startCameraScan() {
    document.getElementById('reader').style.display = 'block'; html5QrcodeScanner = new Html5Qrcode("reader");
    html5QrcodeScanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => { 
            let rawData = decodedText.trim();
            
            // 智慧解析大腦：如果掃到的是被 TinyURL 濃縮過的大格子 QR 碼
            if (rawData.includes("tinyurl.com/")) {
                if (html5QrcodeScanner) { html5QrcodeScanner.stop().catch(e => {}); html5QrcodeScanner = null; }
                document.getElementById('reader').innerHTML = "<div style='color:#2ecc71; font-weight:bold; padding:20px;'>🧬 成功辨識！正在向雲端解析原廠菇點資料...</div>";
                
                // 向雲端索取被藏在短網址背後的完整原廠長字串
                fetch(rawData)
                .then(res => {
                    const finalUrl = res.url;
                    if (finalUrl.includes("?share=")) {
                        const packedPart = finalUrl.split("?share=")[1];
                        mergeArrays(JSON.parse(decodeURIComponent(atob(packedPart))));
                        closeImportModal();
                        alert("✅ 短網址 QR 碼高速同步合併成功！");
                    } else {
                        alert("解析失敗，短網址內未包含有效的戰情資料。");
                        closeImportModal();
                    }
                })
                .catch(err => {
                    alert("網路連線逾時，無法解析短網址數據。");
                    closeImportModal();
                });
                return;
            }
            
            // 以下為原本就健康的長網址與文字碼備援相容機制
            if (rawData.includes("?share=")) {
                rawData = rawData.split("?share=")[1];
            }
            if (rawData.startsWith("PIKMIN-") || rawData.startsWith("PKM-")) {
                rawData = rawData.replace("PIKMIN-", "").replace("PKM-", "");
            }
            
            try { 
                mergeArrays(JSON.parse(decodeURIComponent(atob(rawData)))); 
                closeImportModal(); 
                alert("✅ 條碼掃描成功！"); 
            } catch(e) { 
                alert("條碼格式解析失敗。"); 
            } 
        }, () => {}
    ).catch(err => { alert("無法開啟相機。"); document.getElementById('reader').style.display = 'none'; });
}

function initOCR() {
    const fileInput = document.getElementById('file-input');
    if(!fileInput) return;
    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const loadingStatus = document.getElementById('ocr-loading-status');
        const triggerBtn = document.querySelector('.btn-ocr-trigger-upload');
        
        triggerBtn.style.display = 'none';
        loadingStatus.style.display = 'block';

        for (let i = 0; i < files.length; i++) {
            loadingStatus.innerText = `🕵️‍♂️ 正在影像前處理與辨識第 ${i + 1} / ${files.length} 張...`;
            await processSingleFile(files[i]);
        }

        loadingStatus.style.display = 'none';
        triggerBtn.style.display = 'block';
        fileInput.value = ''; 
        closeOcrModal(); 
    });
}

// 處理單一圖片並送交雲端 AI
function processSingleFile(file) {
    return new Promise((resolve) => {
        // 🚀 殺手鐧：直接抓取系統檔案的原始建立時間 (精準到毫秒)，如果極端情況抓不到才用當下時間
        let photoExactTimestamp = file.lastModified || Date.now();

        const reader = new FileReader();
        reader.onload = function() {
            // 將圖片壓縮後再送給 AI，加速傳輸
            compressImageForAI(reader.result, (compressedBase64) => {
                
                // 從 Base64 字串中拔除 data:image/jpeg;base64, 的標頭
                const pureBase64 = compressedBase64.split(',')[1];

                // 呼叫你的 GAS 雲端大腦
                fetch(MY_GAS_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain" },
                    body: JSON.stringify({
                        action: "ocr",
                        image: pureBase64
                    })
                })
                .then(res => res.json())
                .then(resData => {
                    if (resData.status === "success" && !resData.data.error) {
                        const aiData = resData.data;
                        
                        let hours = parseInt(aiData.hours) || 0;
                        let mins = parseInt(aiData.mins) || 0;
                        let secs = parseInt(aiData.secs) || 0;

                        let displayMin = (hours * 60) + mins;
                        let displaySec = secs;
                        let calculatedTargetTime = Infinity;

                        // 這裡完美使用截圖當下精準到毫秒的時間來加上 AI 算出的秒數
                        if (displayMin > 0 || displaySec > 0) {
                            calculatedTargetTime = photoExactTimestamp + (((hours * 3600) + (mins * 60) + secs + 300) * 1000);
                        }

                        createNewOCRCard(aiData.name || "截圖辨識點位", calculatedTargetTime, displayMin, displaySec, photoExactTimestamp);
                    } else {
                        alert("🚨 抓到蟲了！詳細錯誤：" + JSON.stringify(resData));
                    }
                    resolve(); 
                })
                .catch(err => {
                    console.error("雲端連線失敗:", err);
                    resolve(); 
                });
            });
        };
        reader.readAsDataURL(file);
    });
}

// 🖼️ 專為 AI 設計的影像壓縮函式 (AI 眼睛很好，不需要轉黑白，只要縮小尺寸就能光速傳輸)
function compressImageForAI(base64Src, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 限制圖片最大寬度為 800px，既能保留文字清晰度，又能讓上傳速度翻倍
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // 輸出品質設定為 0.8
        callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = base64Src;
}

// 1️⃣ 進化版：建立預覽卡片 (補上分類選單與截圖時間備份)
function createNewOCRCard(location, targetTime, displayMin, displaySec, exactTimestamp) {
    const id = 'OCR_' + Date.now() + '_' + Math.floor(Math.random() * 1000); 
    const card = document.createElement('div');
    card.className = 'card ocr-confirming'; 
    card.id = `card-${id}`;
    card.dataset.respawnTime = targetTime; 
    
    // ㊙️ 殺手鐧：把截圖當下的精準時間偷偷藏在卡片上，方便稍後手動修改時重算！
    card.dataset.screenshotTime = exactTimestamp || Date.now();

    // 🔍 智慧查水表：比對舊資料，決定預設分類
    let preSelectedZone = currentActiveZone === 'all' ? 'all' : currentActiveZone;
    let currentDb = [];
    try { currentDb = JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch(e){}
    const oldItem = currentDb.find(x => x.name.trim() === location.trim());
    if (oldItem && oldItem.zone) {
        preSelectedZone = oldItem.zone; // 如果是舊菇點，直接繼承舊分類
    }

    // 補上完整的分類選單 (與正式卡片相同)
    const zoneSelectHtml = `
        <select id="zone-${id}" onchange="document.getElementById('card-${id}').dataset.zone = this.value; if(typeof saveState === 'function') saveState(); if(typeof filterUiByCurrentZone === 'function') filterUiByCurrentZone();" style="padding: 6px 2px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.85rem; background: #fff; outline: none; cursor: pointer; width: 44px; text-align: center; font-family: sans-serif; flex-shrink: 0; margin-right: 2px;">
            <option value="all" ${preSelectedZone==='all'?'selected':''}>🌐</option>
            <option value="home" ${preSelectedZone==='home'?'selected':''}>🏠</option>
            <option value="office" ${preSelectedZone==='office'?'selected':''}>🏢</option>
            <option value="travel" ${preSelectedZone==='travel'?'selected':''}>🏖️</option>
        </select>
    `;

    card.innerHTML = `
        <div class="input-item-wrap">
            <input type="text" id="name-${id}" placeholder="地點" value="${location}">
            ${zoneSelectHtml}
            <input type="number" inputmode="numeric" pattern="[0-9]*" id="m-${id}" placeholder="分" min="0" value="${displayMin}">:
            <input type="number" inputmode="numeric" pattern="[0-9]*" id="s-${id}" placeholder="秒" min="0" value="${displaySec}">
            <button class="btn-calc" id="btn-${id}" onclick="confirmOCRCard('${id}')">✓</button>
        </div>
        <div class="mobile-row-two">
            <div class="result-box" id="res-${id}">
                <span style="color: #2575fc; font-weight: bold; font-size:0.85rem;">🧪 測試中請核對 (可改分類)</span>
            </div>
            <button class="btn-delete" onclick="removeOCRConfirmingCard('${id}')">✕</button>
        </div>
    `;
    
    const container = document.getElementById('tracker-container');
    if(container) container.prepend(card); 
    attachOCREvents(id);
    if (targetTime !== Infinity && typeof resumeTracking === 'function') { 
        resumeTracking(id, targetTime); 
        // 👇 就是加上這行！強制把被系統藏起來的確認按鈕叫回來
        document.getElementById(`btn-${id}`).style.display = 'inline-block';
    }
}


// 2️⃣ 進化版：確認轉正與智慧合併 (解決重新計算時間的盲點)
function confirmOCRCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;

    // 1. 抓取畫面上最新的資料
    const nameVal = document.getElementById(`name-${id}`).value.trim();
    const zoneVal = document.getElementById(`zone-${id}`).value;
    const mVal = parseInt(document.getElementById(`m-${id}`).value) || 0;
    const sVal = parseInt(document.getElementById(`s-${id}`).value) || 0;
    
    // 2. 完美時間重算：利用備份的截圖時間 + 手動修改的新時間 + 5分鐘冷卻
    const screenshotTime = parseFloat(card.dataset.screenshotTime);
    let finalTargetTime = Infinity;
    if (mVal > 0 || sVal > 0) {
        finalTargetTime = screenshotTime + (((mVal * 60) + sVal + 300) * 1000);
    }

    // 3. 讀取本機資料庫進行「重複判斷合併」
    let currentDb = [];
    try { currentDb = JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch(e){}
    
    const existingIndex = currentDb.findIndex(x => x.name.trim() === nameVal);

    if (existingIndex !== -1) {
        // 🚨 狀況 A：舊菇點合併
        // 刪除這張預覽卡片
        removeOCRConfirmingCard(id);
        
        // 喚醒舊卡片並覆寫新時間與新分類
        const oldId = currentDb[existingIndex].id;
        document.getElementById(`m-${oldId}`).value = mVal;
        document.getElementById(`s-${oldId}`).value = sVal;
        
        // 觸發舊卡片的重新計算與存檔
        if (typeof resumeTracking === 'function') resumeTracking(oldId, finalTargetTime);
        
        // 偷改下拉選單並觸發過濾
        const oldZoneSelect = document.getElementById(`zone-${oldId}`);
        if (oldZoneSelect) {
            oldZoneSelect.value = zoneVal;
            document.getElementById(`card-${oldId}`).dataset.zone = zoneVal;
            if (typeof filterUiByCurrentZone === 'function') filterUiByCurrentZone();
        }
        
        // 儲存並同步雲端
        saveState();
        
    } else {
        // 🌟 狀況 B：新菇點轉正
        // 拔除藍色光暈，切換成正式綠色卡片
        card.classList.remove('ocr-confirming');
        card.classList.add('active');
        
        // 將重新算好的精準時間蓋回去
        card.dataset.respawnTime = finalTargetTime;
        card.dataset.zone = zoneVal; // 正式賦予分類血統
        
        // 修改按鈕行為 (轉為一般卡片的運作模式)
        document.getElementById(`btn-${id}`).setAttribute('onclick', `startTracking('${id}')`);
        
        // 重新排版與存檔
        if (typeof resumeTracking === 'function') resumeTracking(id, finalTargetTime);
        if (typeof sortMushrooms === 'function') sortMushrooms();
        saveState(); 
        if (typeof ensureEmptyRow === 'function') ensureEmptyRow(false); 
        if (typeof filterUiByCurrentZone === 'function') filterUiByCurrentZone();
    }
}

function attachOCREvents(id) {
    const nameInput = document.getElementById(`name-${id}`);
    const minInput = document.getElementById(`m-${id}`);
    const secInput = document.getElementById(`s-${id}`);
    if(!nameInput) return;

    nameInput.addEventListener('focus', () => { setTimeout(() => { nameInput.select(); }, 15); });
    minInput.addEventListener('focus', () => { setTimeout(() => { minInput.select(); }, 15); });
    secInput.addEventListener('focus', () => { setTimeout(() => { secInput.select(); }, 15); });

    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); minInput.focus(); }});
    minInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); secInput.focus(); }});
    secInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmOCRCard(id); }});
}

function removeOCRConfirmingCard(id) {
    if (timers[id]) clearInterval(timers[id]);
    const card = document.getElementById(`card-${id}`);
    if (card) card.remove();
}

// ==========================================
// 📋 剪貼簿讀取與自動觸發辨識機制
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const pasteBtn = document.getElementById('paste-ocr-btn');
    const fileInput = document.getElementById('file-input'); 

    if (!pasteBtn || !fileInput) return;

    pasteBtn.addEventListener('click', async () => {
        try {
            // 1. 檢查瀏覽器是否支援剪貼簿 API
            if (!navigator.clipboard || !navigator.clipboard.read) {
                alert("⚠️ 你的瀏覽器可能不支援直接讀取剪貼簿，請嘗試更新系統！");
                return;
            }

            // 2. 請求讀取剪貼簿的內容 (iOS 第一次按會跳出「允許貼上」的詢問)
            const clipboardItems = await navigator.clipboard.read();
            let imageBlob = null;

            // 3. 在剪貼簿的多個項目中，找出是「圖片」的檔案
            for (const item of clipboardItems) {
                const imageTypes = item.types.filter(type => type.startsWith('image/'));
                if (imageTypes.length > 0) {
                    imageBlob = await item.getType(imageTypes[0]);
                    break; // 找到圖片就停止尋找
                }
            }

            // 4. 如果有找到圖片，就把它塞進原本的 input 裡
            if (imageBlob) {
                // 將圖片轉換成 File 物件
                const file = new File([imageBlob], "pasted-image.png", { type: imageBlob.type });
                
                // 🎩 核心魔術：利用 DataTransfer 模擬使用者手動選擇了檔案
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                
                // 觸發原本 input 的 'change' 事件，讓你的 OCR 程式以為你剛選好照片！
                fileInput.dispatchEvent(new Event('change'));
                
            } else {
                alert("⚠️ 剪貼簿裡沒有圖片唷！請先在遊戲截圖後選擇「拷貝並刪除」。");
            }
        } catch (error) {
            console.error("讀取剪貼簿失敗：", error);
            alert("⚠️ 無法讀取剪貼簿！可能是權限被拒絕，或是畫面沒有切換回 PWA。");
        }
    });
});
