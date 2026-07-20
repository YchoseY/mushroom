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
                preprocessImage(reader.result, (processedImgBase64) => {
                    Tesseract.recognize(processedImgBase64, 'chi_tra+eng')
                    .then(({ data: { text } }) => {
                        parseOCRResult(text, photoExactTimestamp);
                        resolve(); 
                    })
                    .catch(err => {
                        console.error("OCR失敗:", err);
                        resolve(); 
                    });
                });
            };
            reader.readAsDataURL(file);
        });
    });
}

function preprocessImage(base64Src, callback) {
    const img = new Image();
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i], g = data[i+1], b = data[i+2];
            // 轉換為灰階 (Grayscale)
            let v = (0.2126*r + 0.7152*g + 0.0722*b);
            
            data[i] = v; 
            data[i+1] = v; 
            data[i+2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
        callback(canvas.toDataURL());
    };
    img.src = base64Src;
}

function parseOCRResult(text, photoExactTimestamp) {
    let locationName = "截圖辨識點位";
    const lines = text.split('\n');
    
    for(let line of lines) {
        let rawLine = line.trim();
        // 稍微清理，但絕對保留 > 這個關鍵特徵
        let cleanLine = rawLine.replace(/[\s\|\[\]\(\):;\-]/g, ''); 
        
        if (cleanLine.length < 2) continue; // 太短的雜訊不要
        
        // 🛑 黑名單：排除遊戲中絕對不是地點的「已知 UI 介面文字」
        if (
            cleanLine.includes("巨大") || cleanLine.includes("蘑菇") || 
            cleanLine.includes("參加") || cleanLine.includes("前往") || 
            cleanLine.includes("工作力") || cleanLine.includes("特殊活動") ||
            cleanLine.includes("剩下") || cleanLine.includes("飾品") ||
            cleanLine.match(/^[0-9A-Za-z]+$/) // 排除純數字或純英文(如電量、時間)
        ) {
            continue;
        }

        // 🎯 必殺特徵：如果這行文字帶有 >，那 99% 就是地點按鈕！(例如：日新臨時攤販市場 >)
        if (rawLine.includes(">") || rawLine.includes("＞") || rawLine.includes("》")) {
            locationName = cleanLine.replace(/[><＞》]/g, ''); // 確定是地點後，再把 > 拔掉
            break;
        }
        
        // 🎯 備案：如果沒有 >，但這行字撐過了上面的黑名單考驗，我們就大膽採用它！
        locationName = cleanLine.replace(/[><＞》]/g, '');
        break;
    }

    const numberGroups = text.match(/\d+/g);
    let hours = 0, mins = 0, secs = 0;
    let hasFoundValidTime = false;

    if (numberGroups && numberGroups.length >= 2) {
        let extractedNums = numberGroups.map(n => parseInt(n)).filter(n => !isNaN(n));
        for (let i = extractedNums.length - 1; i >= 1; i--) {
            let potentialSec = extractedNums[i];
            let potentialMin = extractedNums[i-1];
            let potentialHour = (i >= 2) ? extractedNums[i-2] : 0;

            if (potentialSec <= 60 && potentialMin <= 60) {
                secs = potentialSec;
                mins = potentialMin;
                hours = (potentialHour < 24 && i >= 2) ? potentialHour : 0;
                hasFoundValidTime = true;
                break;
            }
        }
    }

    let calculatedTargetTime = Infinity;
    let displayMin = ""; let displaySec = "";

    if (hasFoundValidTime) {
        displayMin = (hours * 60) + mins;
        displaySec = secs;
        calculatedTargetTime = photoExactTimestamp + (((hours * 3600) + (mins * 60) + secs + 300) * 1000);
    }

    createNewOCRCard(locationName, calculatedTargetTime, displayMin, displaySec);
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
