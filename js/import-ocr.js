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
        let photoExactTimestamp = Date.now();

        EXIF.getData(file, function() {
            const dateTimeStr = EXIF.getTag(this, "DateTimeOriginal") || EXIF.getTag(this, "DateTime");
            if (dateTimeStr) {
                const parts = dateTimeStr.split(' ');
                const dateParts = parts[0].replace(/:/g, '-');
                const timeParts = parts[1];
                const parsedDate = new Date(`${dateParts}T${timeParts}`);
                if (!isNaN(parsedDate.getTime())) { photoExactTimestamp = parsedDate.getTime(); }
            }

            const reader = new FileReader();
            reader.onload = function() {
                // 將圖片壓縮後再送給 AI，加速傳輸
                compressImageForAI(reader.result, (compressedBase64) => {
                    
                    // 從 Base64 字串中拔除 data:image/jpeg;base64, 的標頭
                    const pureBase64 = compressedBase64.split(',')[1];

                    // 呼叫你的 GAS 雲端大腦 (這裡直接使用 sync-ui.js 裡定義好的 MY_GAS_API_URL)
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
                            
                            // 將 AI 回傳的時分秒組裝起來
                            let hours = parseInt(aiData.hours) || 0;
                            let mins = parseInt(aiData.mins) || 0;
                            let secs = parseInt(aiData.secs) || 0;

                            let displayMin = (hours * 60) + mins;
                            let displaySec = secs;
                            let calculatedTargetTime = Infinity;

                            if (displayMin > 0 || displaySec > 0) {
                                calculatedTargetTime = photoExactTimestamp + (((hours * 3600) + (mins * 60) + secs + 300) * 1000);
                            }

                            // 直接把 AI 抓到的完美地點名稱塞進格子裡
                            createNewOCRCard(aiData.name || "截圖辨識點位", calculatedTargetTime, displayMin, displaySec);
                        } else {
                            //console.error("AI 辨識錯誤回傳:", resData);
                            //alert("❌ AI 辨識失敗，請確認網路連線或稍後再試。");
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

function createNewOCRCard(location, targetTime, displayMin, displaySec) {
    const id = 'OCR_' + Date.now() + '_' + Math.floor(Math.random() * 1000); 
    const card = document.createElement('div');
    card.className = 'card ocr-confirming'; 
    card.id = `card-${id}`;
    card.dataset.respawnTime = targetTime; 
    
    card.innerHTML = `
        <div class="input-item-wrap">
            <input type="text" id="name-${id}" placeholder="地點" value="${location}">
            <input type="number" inputmode="numeric" pattern="[0-9]*" id="m-${id}" placeholder="分" min="0" value="${displayMin}">:
            <input type="number" inputmode="numeric" pattern="[0-9]*" id="s-${id}" placeholder="秒" min="0" value="${displaySec}">
            <button class="btn-calc" id="btn-${id}" onclick="confirmOCRCard('${id}')">✓</button>
        </div>
        <div class="mobile-row-two">
            <div class="result-box" id="res-${id}">
                <span style="color: #2575fc; font-weight: bold; font-size:0.85rem;">🧪 測試中請核對</span>
            </div>
            <button class="btn-delete" onclick="removeOCRConfirmingCard('${id}')">✕</button>
        </div>
    `;
    
    const container = document.getElementById('tracker-container');
    if(container) container.prepend(card); 
    attachOCREvents(id);
    if (targetTime !== Infinity && typeof resumeTracking === 'function') { resumeTracking(id, targetTime); }
}

function confirmOCRCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;
    card.classList.remove('ocr-confirming');
    card.classList.add('active');
    if (typeof sortMushrooms === 'function') sortMushrooms();
    saveState(); 
    if (typeof ensureEmptyRow === 'function') ensureEmptyRow(false); 
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
