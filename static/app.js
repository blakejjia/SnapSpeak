// ═══════════════════════════════════════════════
// LocalStorage keys (migrated from snapspeak_*)
// ═══════════════════════════════════════════════
const PROMPT_KEY = 'linguasnap_prompt';
const READ_ALONG_KEY = 'linguasnap_read_along';
const VOICE_SPEED_KEY = 'linguasnap_voice_speed';

// Migrate old keys
(() => {
  const migrations = [
    ['snapspeak_prompt', PROMPT_KEY],
    ['snapspeak_read_along', READ_ALONG_KEY],
    ['snapspeak_voice_speed', VOICE_SPEED_KEY],
  ];
  migrations.forEach(([oldKey, newKey]) => {
    if (localStorage.getItem(oldKey) !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, localStorage.getItem(oldKey));
    }
  });
})();

// ═══════════════════════════════════════════════
// Speech synthesis helper (reused for word cards)
// ═══════════════════════════════════════════════
const speakText = (text, lang) => {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    const langCodeMap = {
      'en': 'en-US', 'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR',
      'fr': 'fr-FR', 'es': 'es-ES', 'de': 'de-DE', 'ru': 'ru-RU', 'it': 'it-IT'
    };
    const targetLang = langCodeMap[lang.toLowerCase()] || lang;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    const speedSlider = document.getElementById('dashboard-voice-speed-slider');
    if (speedSlider) utterance.rate = parseFloat(speedSlider.value) || 1.0;
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(voice =>
      voice.lang.toLowerCase().includes(targetLang.toLowerCase()) ||
      voice.lang.toLowerCase().startsWith(lang.toLowerCase())
    );
    if (matchingVoice) utterance.voice = matchingVoice;
    window.speechSynthesis.speak(utterance);
  }
};
if (window.speechSynthesis) window.speechSynthesis.getVoices();

const escapeHtml = (text) => {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
};

// ═══════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════
const state = {
  // Image & camera
  imageBase64: null,
  cameraStream: null,
  cameraActive: false,
  isProcessing: false,

  // Extraction result (THE global variable)
  extractionResult: null,
  // { items: [{text, language}, ...], audio_url, image_base64 }

  // View
  currentView: 'welcome',

  // Navigation
  activePanel: 'voice',

  // FRDic
  frdicHasToken: false,
  frdicBooks: [],
  frdicSelectedLanguage: null,
  frdicSelectedBookId: null,
  frdicSelectedWords: new Set(),
  frdicIsUploading: false,
};

// ═══════════════════════════════════════════════
// DOM ELEMENTS — Welcome View
// ═══════════════════════════════════════════════
const welcomeView = document.getElementById('welcome-view');
const dashboardView = document.getElementById('dashboard-view');
const headerActions = document.getElementById('header-actions');
const captureBox = document.getElementById('capture-box');
const cameraContainer = document.getElementById('camera-container');
const imageContainer = document.getElementById('image-container');
const defaultView = document.getElementById('default-view');
const scannerOverlay = document.getElementById('scanner-overlay');
const webcamVideo = document.getElementById('webcam-video');
const previewImg = document.getElementById('preview-img');
const closeCameraBtn = document.getElementById('close-camera-btn');
const removeImageBtn = document.getElementById('remove-image-btn');
const cameraBtn = document.getElementById('camera-btn');
const cameraBtnText = document.getElementById('camera-btn-text');
const fileBtn = document.getElementById('file-btn');
const fileInput = document.getElementById('file-input');
const promptTextarea = document.getElementById('prompt-textarea');
const processBtn = document.getElementById('process-btn');
const processBtnText = document.getElementById('process-btn-text');
const errorBanner = document.getElementById('error-banner');
const captureCanvas = document.getElementById('capture-canvas');

// ═══════════════════════════════════════════════
// DOM ELEMENTS — Dashboard
// ═══════════════════════════════════════════════
const newPhotoBtn = document.getElementById('new-photo-btn');
const reAnalysisBtn = document.getElementById('re-analysis-btn');
const dashboardLayout = document.getElementById('dashboard-layout');
const dashboardLoading = document.getElementById('dashboard-loading');

// Audio
const audioDeck = document.getElementById('audio-deck');
const audioElement = document.getElementById('audio-element');
const audioPlayBtn = document.getElementById('audio-play-btn');
const playIcon = document.getElementById('play-icon');
const pauseIcon = document.getElementById('pause-icon');
const audioDownloadBtn = document.getElementById('audio-download-btn');
const audioProgressBar = document.getElementById('audio-progress-bar');
const audioProgressBarFill = document.getElementById('audio-progress-bar-fill');
const audioTimeCurrent = document.getElementById('audio-time-current');
const audioTimeTotal = document.getElementById('audio-time-total');
const audioPulse = document.getElementById('audio-pulse');
const audioBadge = document.getElementById('audio-badge');
const generateVoiceBtn = document.getElementById('generate-voice-btn');
const generateVoiceBtnText = document.getElementById('generate-voice-btn-text');
const voiceEmptyState = document.getElementById('voice-empty-state');

// Dashboard settings
const dashReadAlongCheckbox = document.getElementById('dashboard-read-along-checkbox');
const dashVoiceSpeedSlider = document.getElementById('dashboard-voice-speed-slider');
const dashVoiceSpeedVal = document.getElementById('dashboard-voice-speed-val');

// Word panel
const wordList = document.getElementById('word-list');
const wordPanelCount = document.getElementById('word-panel-count');

// FRDic elements
const frdicAuthBox = document.getElementById('frdic-auth-box');
const frdicMainUi = document.getElementById('frdic-main-ui');
const frdicEmptyState = document.getElementById('frdic-empty-state');
const frdicApiKeyInput = document.getElementById('frdic-api-key-input');
const frdicSaveTokenBtn = document.getElementById('frdic-save-token-btn');
const frdicAuthStatus = document.getElementById('frdic-auth-status');
const frdicLanguageSelect = document.getElementById('frdic-language-select');
const frdicBookList = document.getElementById('frdic-book-list');
const frdicNewBookName = document.getElementById('frdic-new-book-name');
const frdicCreateBtn = document.getElementById('frdic-create-btn');
const frdicCreateStatus = document.getElementById('frdic-create-status');
const frdicQuickSelect = document.getElementById('frdic-quick-select');
const frdicWordCheckboxes = document.getElementById('frdic-word-checkboxes');
const frdicNoWordsMsg = document.getElementById('frdic-no-words-msg');
const frdicUploadBtn = document.getElementById('frdic-upload-btn');
const frdicUploadBtnText = document.getElementById('frdic-upload-btn-text');
const frdicStatus = document.getElementById('frdic-status');
const frdicUnsupportedNote = document.getElementById('frdic-unsupported-note');

// ═══════════════════════════════════════════════
// INITIALIZATION — Settings from localStorage
// ═══════════════════════════════════════════════
const initSettings = () => {
  const savedPrompt = localStorage.getItem(PROMPT_KEY);
  promptTextarea.value = savedPrompt !== null ? savedPrompt : 'Extract all vocabulary words and sentences from this image.';

  const savedReadAlong = localStorage.getItem(READ_ALONG_KEY);
  const raVal = savedReadAlong === 'true';
  dashReadAlongCheckbox.checked = raVal;

  const savedVoiceSpeed = localStorage.getItem(VOICE_SPEED_KEY);
  const vsVal = savedVoiceSpeed !== null ? savedVoiceSpeed : '1.0';
  dashVoiceSpeedSlider.value = vsVal;
  dashVoiceSpeedVal.textContent = `${parseFloat(vsVal).toFixed(1)}x`;
};
initSettings();

// Persist settings
promptTextarea.addEventListener('input', () => localStorage.setItem(PROMPT_KEY, promptTextarea.value));

const syncReadAlong = (checked) => {
  dashReadAlongCheckbox.checked = checked;
  localStorage.setItem(READ_ALONG_KEY, checked);
};
dashReadAlongCheckbox.addEventListener('change', () => syncReadAlong(dashReadAlongCheckbox.checked));

const syncVoiceSpeed = (val) => {
  const display = `${parseFloat(val).toFixed(1)}x`;
  dashVoiceSpeedSlider.value = val;
  dashVoiceSpeedVal.textContent = display;
  localStorage.setItem(VOICE_SPEED_KEY, val);
};
dashVoiceSpeedSlider.addEventListener('input', () => syncVoiceSpeed(dashVoiceSpeedSlider.value));

// ═══════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════
const updateProcessBtnState = () => {
  processBtn.disabled = state.isProcessing || !state.imageBase64;
};

const showError = (msg) => {
  if (msg) {
    errorBanner.textContent = msg;
    errorBanner.style.display = 'block';
  } else {
    errorBanner.style.display = 'none';
  }
};

const formatTime = (secs) => {
  if (isNaN(secs) || !isFinite(secs)) return "00:00";
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// ═══════════════════════════════════════════════
// VIEW SWITCHING
// ═══════════════════════════════════════════════
const showWelcomeView = () => {
  state.currentView = 'welcome';
  welcomeView.classList.add('active');
  welcomeView.style.display = 'block';
  dashboardView.classList.remove('active');
  dashboardView.style.display = 'none';
  headerActions.style.display = 'none';
};

const showDashboardView = () => {
  state.currentView = 'dashboard';
  welcomeView.classList.remove('active');
  welcomeView.style.display = 'none';
  dashboardView.classList.add('active');
  dashboardView.style.display = 'block';
  headerActions.style.display = 'flex';
  renderWordPanel();
  updateVoicePanelUI();
  switchPanel('voice');
};

// ═══════════════════════════════════════════════
// NAVIGATION RAIL — Panel Switching
// ═══════════════════════════════════════════════
const switchPanel = (panelName) => {
  state.activePanel = panelName;

  // Update nav rail buttons
  document.querySelectorAll('.nav-rail-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.panel === panelName);
  });

  // Update panel content visibility
  document.querySelectorAll('.panel-content').forEach(pc => {
    pc.classList.toggle('active', pc.id === `panel-${panelName}`);
  });

  // Lazy-load FRDic data when switching to that panel
  if (panelName === 'frdic') {
    initFRDicPanel();
  }
};

// Nav rail button listeners
document.querySelectorAll('.nav-rail-item').forEach(btn => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.panel));
});

// ═══════════════════════════════════════════════
// CAMERA HANDLERS
// ═══════════════════════════════════════════════
const startCamera = async () => {
  showError(null);
  clearImage();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    state.cameraStream = stream;
    webcamVideo.srcObject = stream;
    cameraContainer.style.display = 'block';
    defaultView.style.display = 'none';
    imageContainer.style.display = 'none';
    state.cameraActive = true;
    cameraBtnText.textContent = 'Capture Snap';
    cameraBtn.classList.remove('btn-secondary');
    cameraBtn.classList.add('btn-primary');
  } catch (err) {
    console.error("Camera access failed:", err);
    showError("Unable to access camera. Please check permissions or upload a picture instead.");
  }
};

const stopCamera = () => {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach(track => track.stop());
    state.cameraStream = null;
  }
  webcamVideo.srcObject = null;
  cameraContainer.style.display = 'none';
  state.cameraActive = false;
  cameraBtnText.textContent = 'Use Camera';
  cameraBtn.classList.remove('btn-primary');
  cameraBtn.classList.add('btn-secondary');
};

const capturePhoto = () => {
  if (webcamVideo && captureCanvas) {
    const ctx = captureCanvas.getContext('2d');
    captureCanvas.width = webcamVideo.videoWidth;
    captureCanvas.height = webcamVideo.videoHeight;
    ctx.translate(captureCanvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(webcamVideo, 0, 0, captureCanvas.width, captureCanvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    state.imageBase64 = captureCanvas.toDataURL('image/jpeg');
    previewImg.src = state.imageBase64;
    imageContainer.style.display = 'block';
    defaultView.style.display = 'none';
    stopCamera();
    updateProcessBtnState();
  }
};

const clearImage = () => {
  state.imageBase64 = null;
  previewImg.src = '';
  imageContainer.style.display = 'none';
  defaultView.style.display = 'flex';
  stopCamera();
  fileInput.value = '';
  updateProcessBtnState();
};

cameraBtn.addEventListener('click', () => {
  if (state.isProcessing) return;
  if (!state.cameraActive) startCamera();
  else capturePhoto();
});

closeCameraBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  stopCamera();
  defaultView.style.display = 'flex';
});

removeImageBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.isProcessing) return;
  clearImage();
});

// ═══════════════════════════════════════════════
// FILE UPLOAD HANDLERS
// ═══════════════════════════════════════════════
fileBtn.addEventListener('click', () => {
  if (state.isProcessing) return;
  fileInput.click();
});

captureBox.addEventListener('click', () => {
  if (!state.cameraActive && !state.imageBase64 && !state.isProcessing) {
    fileInput.click();
  }
});

// Convert any browser-decoded image to JPEG via canvas.
// This handles HEIC/HEIF (Apple Live Photos), WebP, PNG, GIF, BMP, etc.
const convertToJpeg = (dataUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => {
      // If browser can't decode it, fall back to original data URL
      console.warn('Canvas JPEG conversion failed, using original format');
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
};

fileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    showError(null);
    stopCamera();
    const reader = new FileReader();
    reader.onload = async () => {
      state.imageBase64 = await convertToJpeg(reader.result);
      previewImg.src = state.imageBase64;
      imageContainer.style.display = 'block';
      defaultView.style.display = 'none';
      updateProcessBtnState();
    };
    reader.onerror = () => showError("Error reading file.");
    reader.readAsDataURL(file);
  }
});

// Drag and drop
captureBox.addEventListener('dragover', (e) => {
  e.preventDefault();
  captureBox.style.borderColor = 'var(--primary)';
});
captureBox.addEventListener('dragleave', () => { captureBox.style.borderColor = ''; });
captureBox.addEventListener('drop', (e) => {
  e.preventDefault();
  captureBox.style.borderColor = '';
  if (state.isProcessing) return;
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    showError(null);
    stopCamera();
    const reader = new FileReader();
    reader.onload = async () => {
      state.imageBase64 = await convertToJpeg(reader.result);
      previewImg.src = state.imageBase64;
      imageContainer.style.display = 'block';
      defaultView.style.display = 'none';
      updateProcessBtnState();
    };
    reader.readAsDataURL(file);
  }
});

// ═══════════════════════════════════════════════
// AUDIO PLAYER
// ═══════════════════════════════════════════════
let isAudioPlaying = false;

const updateAudioPlayerUI = () => {
  if (isAudioPlaying) {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    audioPulse.classList.remove('paused');
  } else {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    audioPulse.classList.add('paused');
  }
};

audioPlayBtn.addEventListener('click', () => {
  if (!audioElement.src) return;
  if (isAudioPlaying) {
    audioElement.pause();
    isAudioPlaying = false;
  } else {
    audioElement.play().catch(err => console.error("Audio play error:", err));
    isAudioPlaying = true;
  }
  updateAudioPlayerUI();
});

audioElement.addEventListener('timeupdate', () => {
  const current = audioElement.currentTime;
  const duration = audioElement.duration || 0;
  audioTimeCurrent.textContent = formatTime(current);
  const percentage = duration ? (current / duration) * 100 : 0;
  audioProgressBarFill.style.width = `${percentage}%`;
});

audioElement.addEventListener('loadedmetadata', () => {
  audioTimeTotal.textContent = formatTime(audioElement.duration);
});

audioElement.addEventListener('ended', () => {
  isAudioPlaying = false;
  updateAudioPlayerUI();
  audioTimeCurrent.textContent = "00:00";
  audioProgressBarFill.style.width = "0%";
});

audioProgressBar.addEventListener('click', (e) => {
  if (!audioElement.duration) return;
  const rect = audioProgressBar.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;
  audioElement.currentTime = (clickX / width) * audioElement.duration;
});

// ═══════════════════════════════════════════════
// VOICE PANEL UI — show/hide elements based on state
// ═══════════════════════════════════════════════
const updateVoicePanelUI = () => {
  const hasAudio = state.extractionResult && state.extractionResult.audio_url;
  const hasItems = state.extractionResult && state.extractionResult.items && state.extractionResult.items.length > 0;

  if (hasAudio) {
    audioDeck.style.display = '';
    generateVoiceBtnText.textContent = 'Regenerate Voice';
    voiceEmptyState.style.display = 'none';
    audioElement.src = state.extractionResult.audio_url;
    audioDownloadBtn.href = state.extractionResult.audio_url;
    audioDownloadBtn.download = 'linguasnap_audio.mp3';
    audioBadge.textContent = dashReadAlongCheckbox.checked ? '跟读模式 (+ gap)' : '标准模式';
    audioTimeCurrent.textContent = '00:00';
    audioTimeTotal.textContent = '00:00';
    audioProgressBarFill.style.width = '0%';
    isAudioPlaying = false;
    updateAudioPlayerUI();
  } else {
    audioDeck.style.display = 'none';
    generateVoiceBtnText.textContent = 'Generate Voice';
    voiceEmptyState.style.display = hasItems ? 'none' : 'flex';
  }

  generateVoiceBtn.style.display = hasItems ? '' : 'none';
};

// ═══════════════════════════════════════════════
// GENERATE VOICE — on-demand voice synthesis
// ═══════════════════════════════════════════════
let isGeneratingVoice = false;

generateVoiceBtn.addEventListener('click', async () => {
  if (isGeneratingVoice) return;
  if (!state.extractionResult || !state.extractionResult.items || state.extractionResult.items.length === 0) return;

  isGeneratingVoice = true;
  generateVoiceBtn.disabled = true;
  generateVoiceBtnText.textContent = 'Generating...';

  const readAlong = dashReadAlongCheckbox.checked;
  const voiceSpeed = parseFloat(dashVoiceSpeedSlider.value) || 1.0;

  try {
    const response = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: state.extractionResult.items,
        read_along: readAlong,
        voice_speed: voiceSpeed
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || 'Server responded with an error.');
    }

    // Revoke old blob URL to avoid memory leaks
    if (state.extractionResult.audio_url && state.extractionResult.audio_url.startsWith('blob:')) {
      URL.revokeObjectURL(state.extractionResult.audio_url);
    }

    // Create a blob URL from the audio bytes response
    const blob = await response.blob();
    state.extractionResult.audio_url = URL.createObjectURL(blob);

    // Update the UI
    updateVoicePanelUI();
  } catch (err) {
    console.error('Voice generation failed:', err);
    alert('Failed to generate voice: ' + (err.message || 'Unknown error'));
  } finally {
    isGeneratingVoice = false;
    generateVoiceBtn.disabled = false;
    generateVoiceBtnText.textContent = state.extractionResult.audio_url ? 'Regenerate Voice' : 'Generate Voice';
  }
});

// ═══════════════════════════════════════════════
// WORD PANEL RENDERING
// ═══════════════════════════════════════════════
const renderWordPanel = () => {
  if (!state.extractionResult || !state.extractionResult.items) {
    wordList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 1rem; text-align: center;">No words extracted yet.</p>';
    wordPanelCount.textContent = '0';
    return;
  }

  const items = state.extractionResult.items;
  wordPanelCount.textContent = items.length;

  wordList.innerHTML = items.map((item, idx) => {
    const langClass = `lang-${item.language.toLowerCase()}`;
    const isLong = item.text.length > 20;
    const cardNumber = (idx + 1).toString().padStart(2, '0');

    return `
      <div class="word-list-item ${langClass}">
        <span class="word-item-number">${cardNumber}</span>
        <span class="word-item-text ${isLong ? 'long-word' : ''}">${escapeHtml(item.text)}</span>
        <span class="word-item-badge">${item.language.toUpperCase()}</span>
        <div class="word-item-actions">
          <button class="word-item-action-btn speak-mini-btn" title="Read Aloud" data-text="${escapeHtml(item.text)}" data-lang="${item.language}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>
          <button class="word-item-action-btn copy-mini-btn" title="Copy Text" data-text="${escapeHtml(item.text)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach listeners to mini buttons
  wordList.querySelectorAll('.speak-mini-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakText(btn.dataset.text, btn.dataset.lang);
    });
  });
  wordList.querySelectorAll('.copy-mini-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigator.clipboard.writeText(btn.dataset.text);
    });
  });
};

// ═══════════════════════════════════════════════
// PROCESS IMAGE — Core flow
// ═══════════════════════════════════════════════
processBtn.addEventListener('click', async () => {
  if (!state.imageBase64 || state.isProcessing) return;

  state.isProcessing = true;
  showError(null);
  updateProcessBtnState();

  scannerOverlay.style.display = 'flex';

  const prompt = promptTextarea.value;

  try {
    const response = await fetch('/api/process-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: state.imageBase64,
        prompt: prompt
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || "Server responded with an error.");
    }

    const data = await response.json();

    // Revoke old blob URL before replacing extraction result
    if (state.extractionResult && state.extractionResult.audio_url && state.extractionResult.audio_url.startsWith('blob:')) {
      URL.revokeObjectURL(state.extractionResult.audio_url);
    }

    // Store extraction result globally (no audio yet — generated on demand)
    state.extractionResult = {
      items: data.items,
      audio_url: null,
      image_base64: state.imageBase64
    };

    // Reset audio player state
    audioElement.src = '';
    audioDownloadBtn.href = '#';
    audioTimeCurrent.textContent = "00:00";
    audioTimeTotal.textContent = "00:00";
    audioProgressBarFill.style.width = "0%";
    isAudioPlaying = false;
    updateAudioPlayerUI();

    // Reset FRDic state for new extraction
    state.frdicSelectedBookId = null;
    state.frdicSelectedWords = new Set();
    state.frdicBooks = [];

    // Transition to dashboard
    showDashboardView();
  } catch (err) {
    console.error("Processing failed:", err);
    showError(err.message || "Failed to process the image.");
  } finally {
    state.isProcessing = false;
    scannerOverlay.style.display = 'none';
    updateProcessBtnState();
  }
});

// ═══════════════════════════════════════════════
// NEW PHOTO BUTTON — Return to welcome view
// ═══════════════════════════════════════════════
newPhotoBtn.addEventListener('click', () => {
  // Revoke old blob URL before discarding extraction result
  if (state.extractionResult && state.extractionResult.audio_url && state.extractionResult.audio_url.startsWith('blob:')) {
    URL.revokeObjectURL(state.extractionResult.audio_url);
  }
  clearImage();
  showWelcomeView();
});

// ═══════════════════════════════════════════════
// AI RE-ANALYSIS — Pre-load image, return to welcome
// ═══════════════════════════════════════════════
reAnalysisBtn.addEventListener('click', () => {
  if (state.extractionResult && state.extractionResult.image_base64) {
    state.imageBase64 = state.extractionResult.image_base64;
    previewImg.src = state.imageBase64;
    imageContainer.style.display = 'block';
    defaultView.style.display = 'none';
    updateProcessBtnState();
  }
  showWelcomeView();
});

// ═══════════════════════════════════════════════
// FRDIC PANEL LOGIC
// ═══════════════════════════════════════════════
const FRDIC_SUPPORTED = ['en', 'fr', 'de', 'es'];

const languageName = (code) => {
  const names = { en: 'English', fr: 'French', de: 'German', es: 'Spanish',
                  zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ru: 'Russian', it: 'Italian' };
  return names[code] || code.toUpperCase();
};

const showFRDicStatus = (msg, type) => {
  frdicStatus.textContent = msg;
  frdicStatus.className = `frdic-status-message ${type}`;
  frdicStatus.style.display = 'block';
  setTimeout(() => { frdicStatus.style.display = 'none'; }, 6000);
};

const updateFRDicUploadBtn = () => {
  frdicUploadBtn.disabled = !state.frdicSelectedBookId || state.frdicSelectedWords.size === 0 || state.frdicIsUploading;
};

// Initialize FRDic panel when switched to
const initFRDicPanel = () => {
  if (!state.extractionResult || !state.extractionResult.items) {
    // No extraction yet
    frdicAuthBox.style.display = 'none';
    frdicMainUi.style.display = 'none';
    frdicEmptyState.style.display = 'flex';
    return;
  }

  frdicEmptyState.style.display = 'none';

  // Check token status first
  checkFRDicTokenStatus().then(() => {
    if (state.frdicHasToken) {
      frdicAuthBox.style.display = 'none';
      frdicMainUi.style.display = 'block';
      populateFRDicLanguageSelector();
    } else {
      frdicAuthBox.style.display = 'block';
      frdicMainUi.style.display = 'none';
    }
  });
};

const checkFRDicTokenStatus = async () => {
  try {
    const resp = await fetch('/api/frdic/token-status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (resp.ok) {
      const data = await resp.json();
      state.frdicHasToken = data.has_token;
    }
  } catch (err) {
    state.frdicHasToken = false;
  }
};

// Save token
frdicSaveTokenBtn.addEventListener('click', async () => {
  const token = frdicApiKeyInput.value.trim();
  if (!token) {
    frdicAuthStatus.textContent = 'Please enter a token.';
    frdicAuthStatus.className = 'frdic-status-message error';
    frdicAuthStatus.style.display = 'block';
    return;
  }
  try {
    const resp = await fetch('/api/frdic/set-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    if (resp.ok) {
      state.frdicHasToken = true;
      frdicAuthBox.style.display = 'none';
      frdicMainUi.style.display = 'block';
      populateFRDicLanguageSelector();
    } else {
      const err = await resp.json();
      throw new Error(err.detail || 'Failed to save token');
    }
  } catch (err) {
    frdicAuthStatus.textContent = `Error: ${err.message}`;
    frdicAuthStatus.className = 'frdic-status-message error';
    frdicAuthStatus.style.display = 'block';
  }
});

// Populate language selector from extraction result
const populateFRDicLanguageSelector = () => {
  if (!state.extractionResult || !state.extractionResult.items) return;

  const allLanguages = [...new Set(state.extractionResult.items.map(i => i.language.toLowerCase()))];
  const supportedLangs = allLanguages.filter(l => FRDIC_SUPPORTED.includes(l));
  const unsupportedLangs = allLanguages.filter(l => !FRDIC_SUPPORTED.includes(l));

  frdicLanguageSelect.innerHTML = '<option value="">-- Select a language --</option>' +
    supportedLangs.map(l => `<option value="${l}">${languageName(l)} (${l.toUpperCase()})</option>`).join('');

  frdicUnsupportedNote.style.display = unsupportedLangs.length > 0 ? 'block' : 'none';
  if (unsupportedLangs.length > 0) {
    frdicUnsupportedNote.textContent = `Note: ${unsupportedLangs.map(l => languageName(l)).join(', ')} not supported by FRDic (en, fr, de, es only).`;
  }

  // Auto-select the most common supported language
  if (supportedLangs.length > 0) {
    const langCounts = {};
    state.extractionResult.items.forEach(item => {
      const l = item.language.toLowerCase();
      if (FRDIC_SUPPORTED.includes(l)) langCounts[l] = (langCounts[l] || 0) + 1;
    });
    const bestLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0][0];
    frdicLanguageSelect.value = bestLang;
    state.frdicSelectedLanguage = bestLang;
    loadFRDicBooks();
    renderFRDicWordCheckboxes();
  } else {
    state.frdicSelectedLanguage = null;
    frdicBookList.innerHTML = '<p class="frdic-book-placeholder">No FRDic-supported languages found in extracted words.</p>';
    frdicWordCheckboxes.innerHTML = '';
  }
};

// Language select change
frdicLanguageSelect.addEventListener('change', () => {
  state.frdicSelectedLanguage = frdicLanguageSelect.value || null;
  state.frdicSelectedBookId = null;
  if (state.frdicSelectedLanguage) {
    loadFRDicBooks();
    renderFRDicWordCheckboxes();
  } else {
    frdicBookList.innerHTML = '<p class="frdic-book-placeholder">Select a language to load your books</p>';
    frdicWordCheckboxes.innerHTML = '';
    updateFRDicUploadBtn();
  }
});

// Load books for selected language
const loadFRDicBooks = async () => {
  if (!state.frdicSelectedLanguage) return;

  frdicBookList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem; padding: 0.75rem;">Loading books...</p>';

  try {
    const resp = await fetch('/api/frdic/list-books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: state.frdicSelectedLanguage })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || 'Failed to load books');
    }
    const data = await resp.json();
    state.frdicBooks = Array.isArray(data) ? data : (data.data || data || []);
    renderFRDicBookList();
  } catch (err) {
    frdicBookList.innerHTML = `<p style="color: var(--error); font-size: 0.85rem; padding: 0.75rem;">Error: ${escapeHtml(err.message)}</p>`;
  }
};

const renderFRDicBookList = () => {
  if (!state.frdicBooks || state.frdicBooks.length === 0) {
    frdicBookList.innerHTML = '<p class="frdic-book-placeholder">No books yet. Create one below.</p>';
    state.frdicSelectedBookId = null;
    updateFRDicUploadBtn();
    return;
  }

  frdicBookList.innerHTML = state.frdicBooks.map(book => `
    <div class="frdic-book-item ${state.frdicSelectedBookId === String(book.id) ? 'selected' : ''}"
         data-book-id="${book.id}" data-book-name="${escapeHtml(book.name)}">
      <span class="frdic-book-name">${escapeHtml(book.name)}</span>
      <span class="frdic-book-id">${book.id}</span>
    </div>
  `).join('');

  // Click handler for book selection
  frdicBookList.querySelectorAll('.frdic-book-item').forEach(el => {
    el.addEventListener('click', () => {
      state.frdicSelectedBookId = el.dataset.bookId;
      frdicBookList.querySelectorAll('.frdic-book-item').forEach(b => b.classList.remove('selected'));
      el.classList.add('selected');
      updateFRDicUploadBtn();
    });
  });
};

// Create new book
frdicCreateBtn.addEventListener('click', async () => {
  const name = frdicNewBookName.value.trim();
  if (!name || !state.frdicSelectedLanguage) return;

  frdicCreateBtn.disabled = true;
  frdicCreateStatus.style.display = 'none';

  try {
    const resp = await fetch('/api/frdic/create-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: state.frdicSelectedLanguage, name })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || 'Failed to create book');
    }
    const data = await resp.json();
    const newBook = data.data || data;
    frdicNewBookName.value = '';
    frdicCreateStatus.textContent = `Created "${name}" successfully!`;
    frdicCreateStatus.className = 'frdic-status-message success';
    frdicCreateStatus.style.display = 'block';

    // Reload books and auto-select the new one
    await loadFRDicBooks();
    if (newBook && newBook.id) {
      state.frdicSelectedBookId = String(newBook.id);
      renderFRDicBookList();
      updateFRDicUploadBtn();
    }
  } catch (err) {
    frdicCreateStatus.textContent = `Error: ${err.message}`;
    frdicCreateStatus.className = 'frdic-status-message error';
    frdicCreateStatus.style.display = 'block';
  } finally {
    frdicCreateBtn.disabled = false;
  }
});

// Render word checkboxes filtered by selected language
const renderFRDicWordCheckboxes = () => {
  if (!state.extractionResult || !state.extractionResult.items) {
    frdicWordCheckboxes.innerHTML = '';
    frdicQuickSelect.innerHTML = '';
    return;
  }

  const items = state.extractionResult.items;
  const selLang = state.frdicSelectedLanguage;

  // Filter items by selected language (or show all FRDic-supported if no lang selected)
  const filteredItems = selLang
    ? items.filter(i => i.language.toLowerCase() === selLang)
    : items.filter(i => FRDIC_SUPPORTED.includes(i.language.toLowerCase()));

  if (filteredItems.length === 0) {
    frdicWordCheckboxes.innerHTML = '';
    frdicNoWordsMsg.style.display = 'block';
    frdicQuickSelect.innerHTML = '';
    updateFRDicUploadBtn();
    return;
  }

  frdicNoWordsMsg.style.display = 'none';

  // Build quick-select chips
  const langGroups = {};
  filteredItems.forEach(item => {
    const l = item.language.toLowerCase();
    if (!langGroups[l]) langGroups[l] = [];
    langGroups[l].push(item.text);
  });

  let chipsHtml = '';
  for (const [lang, words] of Object.entries(langGroups)) {
    chipsHtml += `<button class="quick-select-chip lang-${lang}" data-lang="${lang}">Select all ${lang.toUpperCase()} (${words.length})</button>`;
  }
  chipsHtml += `<button class="quick-select-chip" data-action="all">Select All (${filteredItems.length})</button>`;
  chipsHtml += `<button class="quick-select-chip" data-action="none">Deselect All</button>`;
  frdicQuickSelect.innerHTML = chipsHtml;

  // Build checkboxes
  frdicWordCheckboxes.innerHTML = filteredItems.map((item, idx) => {
    const langClass = `lang-${item.language.toLowerCase()}`;
    const wordKey = `${item.text}::${item.language}`;
    const checked = state.frdicSelectedWords.has(wordKey);
    return `
      <label class="frdic-word-checkbox-item ${langClass}">
        <input type="checkbox" data-word-key="${escapeHtml(wordKey)}" data-text="${escapeHtml(item.text)}" ${checked ? 'checked' : ''}>
        <span class="frdic-word-text">${escapeHtml(item.text)}</span>
        <span class="frdic-word-lang-badge">${item.language.toUpperCase()}</span>
      </label>
    `;
  }).join('');

  // Pre-select all by default (only on first render)
  const allUnchecked = filteredItems.every(item => !state.frdicSelectedWords.has(`${item.text}::${item.language}`));
  if (allUnchecked) {
    filteredItems.forEach(item => state.frdicSelectedWords.add(`${item.text}::${item.language}`));
    frdicWordCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = true);
  }

  // Checkbox change handlers
  frdicWordCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        state.frdicSelectedWords.add(cb.dataset.wordKey);
      } else {
        state.frdicSelectedWords.delete(cb.dataset.wordKey);
      }
      updateFRDicUploadBtn();
    });
  });

  // Quick-select chip handlers
  frdicQuickSelect.querySelectorAll('.quick-select-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const lang = chip.dataset.lang;
      const action = chip.dataset.action;

      if (action === 'all') {
        frdicWordCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = true;
          state.frdicSelectedWords.add(cb.dataset.wordKey);
        });
      } else if (action === 'none') {
        frdicWordCheckboxes.querySelectorAll('input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
          state.frdicSelectedWords.delete(cb.dataset.wordKey);
        });
      } else if (lang) {
        // Select/deselect all for a specific language
        const checkboxes = frdicWordCheckboxes.querySelectorAll('input[type="checkbox"]');
        const langWordKeys = [];
        checkboxes.forEach(cb => {
          if (cb.dataset.wordKey.toLowerCase().endsWith(`::${lang}`)) {
            langWordKeys.push(cb.dataset.wordKey);
          }
        });
        // Toggle: if all are already selected, deselect; otherwise select all
        const allSelected = langWordKeys.every(k => state.frdicSelectedWords.has(k));
        checkboxes.forEach(cb => {
          if (cb.dataset.wordKey.toLowerCase().endsWith(`::${lang}`)) {
            cb.checked = !allSelected;
            if (allSelected) state.frdicSelectedWords.delete(cb.dataset.wordKey);
            else state.frdicSelectedWords.add(cb.dataset.wordKey);
          }
        });
      }
      updateFRDicUploadBtn();
    });
  });

  updateFRDicUploadBtn();
};

// Upload words to FRDic
frdicUploadBtn.addEventListener('click', async () => {
  if (state.frdicIsUploading || !state.frdicSelectedBookId || state.frdicSelectedWords.size === 0) return;

  state.frdicIsUploading = true;
  updateFRDicUploadBtn();
  frdicUploadBtnText.textContent = 'Uploading...';

  // Get the actual words (strip the ::lang suffix)
  const words = Array.from(state.frdicSelectedWords).map(k => k.split('::')[0]);

  try {
    const resp = await fetch('/api/frdic/add-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: state.frdicSelectedLanguage,
        category_id: state.frdicSelectedBookId,
        words: words
      })
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.detail || 'Upload failed');
    }
    const data = await resp.json();
    const bookName = state.frdicBooks.find(b => String(b.id) === state.frdicSelectedBookId)?.name || 'book';
    showFRDicStatus(`Successfully uploaded ${words.length} words to "${bookName}"!`, 'success');
  } catch (err) {
    showFRDicStatus(`Error: ${err.message}`, 'error');
  } finally {
    state.frdicIsUploading = false;
    updateFRDicUploadBtn();
    frdicUploadBtnText.textContent = 'Upload to FRDic';
  }
});
