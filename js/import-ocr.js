function openImportModal() { document.getElementById('import-backdrop').style.display = 'block'; document.getElementById('importModal').style.display = 'block'; }

// ★ 完美補回：控制匯入小視窗的關閉（修復點取消沒反應）
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
        (decodedText) => { try { mergeArrays(JSON.parse(decodeURIComponent(atob(decodedText)))); closeImportModal(); alert("✅ 條碼掃描成功！"); } catch(e) { alert("條碼格式錯誤。"); } }, () => {}
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
            let v = (0.2126*r + 0.7152*g + 0.0722*b);
            let threshold = 140;
            let finalVal = v > threshold ? 255 : 0;
            data[i] = finalVal; data[i+1] = finalVal; data[i+2] = finalVal;
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
        let cleanLine = line.trim().replace(/[>><\|\[\]\(\):;\-\s]/g, '');
        if (cleanLine.length >= 2 && (
            cleanLine.includes("展示") || cleanLine.includes("系統") || 
            cleanLine.includes("公園") || cleanLine.includes("廟") || 
            cleanLine.includes("教堂") || cleanLine.includes("郵局") || 
            cleanLine.includes("大樓") || cleanLine.includes("中心") || 
            cleanLine.includes("廣場") || cleanLine.includes("神秘")
        )) {
            locationName = cleanLine;
            break;
        }
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
            <input type="number" id="m-${id}" placeholder="分" min="0" value="${displayMin}">:
            <input type="number" id="s-${id}" placeholder="秒" min="0" value="${displaySec}">
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
    if (targetTime !== Infinity) { resumeTracking(id, targetTime); }
}

function confirmOCRCard(id) {
    const card = document.getElementById(`card-${id}`);
    if (!card) return;
    card.classList.remove('ocr-confirming');
    card.classList.add('active');
    sortMushrooms();
    saveState(); 
    ensureEmptyRow(false); 
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