// Listening Studio - Gemini TTS Engine & Distraction-Free Audio Player with Cloudflare KV

(function () {
  'use strict';

  // --- STATE ---
  const state = {
    audioUrl: 'sample.wav',
    audioBlob: null,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    playbackRate: 1.0,
    isLooping: false,
    currentTrackTitle: 'Cambridge Grade 2: Coffee & Story Dialogue',
    currentTrackSubtitle: 'Leo (Puck) & Maya (Aoede) • Warm & Clear English',
    currentTranscript: [
      { speaker: 'Leo', style: 'warm, friendly barista', text: 'Good morning! Welcome in. Looks like you just beat the downpour out there.' },
      { speaker: 'Maya', style: 'cheerful', text: 'Barely! My umbrella flipped inside out right at the corner. I definitely need something warm to recover.' },
      { speaker: 'Leo', style: 'sympathetic and welcoming', text: 'You came to the right place. What can I get started for you today?' },
      { speaker: 'Maya', style: 'thoughtful', text: 'I usually get an iced latte, but today calls for a change. What do you recommend?' },
      { speaker: 'Leo', style: 'enthusiastic and helpful', text: 'If you like something a little sweet, our cinnamon oat milk cortado is great. Otherwise, a classic cappuccino.' },
      { speaker: 'Maya', style: 'delighted', text: 'The cinnamon cortado sounds amazing. Let\'s do a medium, please—and maybe an almond croissant.' },
      { speaker: 'Leo', style: 'friendly and attentive', text: 'Great choice. Would you like the croissant warmed up?' },
      { speaker: 'Maya', style: 'curious', text: 'Yes, please. By the way, are you new here? Today is my first time seeing you.' },
      { speaker: 'Leo', style: 'pleased and open', text: 'Good eye! Today is actually my third day. I\'m Leo.' },
      { speaker: 'Maya', style: 'warm and friendly', text: 'Nice to meet you, Leo. I\'m Maya. Settling in well?' },
      { speaker: 'Leo', style: 'chuckling, humble', text: 'Pretty well, thanks! Still getting the hang of it.' },
      { speaker: 'Maya', style: 'smiling', text: 'Take your time!' }
    ],
    savedTracks: [],
    apiKey: localStorage.getItem('listening_gemini_api_key') || '',
    activeTab: 'scriptTab',
    hasKvBackend: false
  };

  // --- PRESETS ---
  const PRESETS = {
    lunchbox: {
      title: 'Cambridge Grade 2: Unit 9 — In My Lunch Box!',
      subtitle: 'Mia (Aoede), Leo (Puck) & Emma (Kore) • Primary ESL Listening',
      style: 'Clear, gentle enunciation for 7-year-old Cambridge ESL learners, natural pauses',
      script: `Mia: In my lunch box, I've got a cheese and tomato sandwich. I haven't got a banana, but I've got an apple. I've got a drink today!
Leo: In my lunch box, I've got a cheese sandwich, a banana, and an orange. I haven't got a biscuit. I haven't got a drink today.
Emma: I've got a pear and a biscuit. I've got two sandwiches. They are egg! My drink is water. I haven't got an apple.`
    },
    cafe: {
      title: 'Everyday Dialogue: At the Café',
      subtitle: 'Leo (Puck) & Maya (Aoede) • Natural Conversational English',
      style: 'Friendly, warm, conversational English with natural vocal inflection',
      script: `Leo: Good morning! Welcome in. What can I get started for you today?
Maya: Good morning Leo! I'd like a cinnamon cortado and a warm croissant, please.
Leo: Excellent choice. Tap or insert your card right here whenever you're ready.
Maya: Perfect. Thank you so much!`
    },
    story: {
      title: 'Story Narration: The Lost Kite',
      subtitle: 'Solo Storyteller (Charon) • Clear ESL Story Narration',
      style: 'Warm, expressive children\'s story narrator, slow and rhythmic',
      script: `Narrator: It was a windy Saturday morning in the park. Toby held the yellow kite tightly by the string. Suddenly, a big gust of wind blew across the trees! Toby looked up. His kite danced into the blue sky like a giant bird.`
    }
  };

  // --- DOM ELEMENTS ---
  const audio = document.getElementById('coreAudioPlayer');
  const mainPlayBtn = document.getElementById('mainPlayBtn');
  const playIconSvg = document.getElementById('playIconSvg');
  const pauseIconSvg = document.getElementById('pauseIconSvg');
  const jumpBackBtn = document.getElementById('jumpBackBtn');
  const jumpForwardBtn = document.getElementById('jumpForwardBtn');
  const loopToggleBtn = document.getElementById('loopToggleBtn');
  const downloadAudioBtn = document.getElementById('downloadAudioBtn');
  const toggleTranscriptBtn = document.getElementById('toggleTranscriptBtn');
  const closeTranscriptBtn = document.getElementById('closeTranscriptBtn');
  const transcriptBox = document.getElementById('transcriptBox');
  const transcriptContent = document.getElementById('transcriptContent');
  
  const timelineBar = document.getElementById('timelineBar');
  const timelineProgress = document.getElementById('timelineProgress');
  const timelineHandle = document.getElementById('timelineHandle');
  const currentTimeLabel = document.getElementById('currentTimeLabel');
  const durationLabel = document.getElementById('durationLabel');
  
  const trackStatusPill = document.getElementById('trackStatusPill');
  const trackStatusText = document.getElementById('trackStatusText');
  const pulseIndicator = trackStatusPill.querySelector('.pulse-indicator');
  const trackTitleDisplay = document.getElementById('trackTitleDisplay');
  const trackSubtitleDisplay = document.getElementById('trackSubtitleDisplay');
  const speedPills = document.querySelectorAll('.speed-pill');
  const storageBadge = document.getElementById('storageBadge');
  
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIconSun = document.getElementById('themeIconSun');
  const themeIconMoon = document.getElementById('themeIconMoon');
  
  // Library Modal Elements
  const savedTracksBtn = document.getElementById('savedTracksBtn');
  const libraryModal = document.getElementById('libraryModal');
  const closeLibraryBtn = document.getElementById('closeLibraryBtn');
  const refreshLibraryBtn = document.getElementById('refreshLibraryBtn');
  const libraryList = document.getElementById('libraryList');
  const libraryStatus = document.getElementById('libraryStatus');

  // Modal / Creation elements
  const openDrawerBtn = document.getElementById('openDrawerBtn');
  const creatorModal = document.getElementById('creatorModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const scriptTextInput = document.getElementById('scriptTextInput');
  const aiPromptInput = document.getElementById('aiPromptInput');
  const generateScriptDraftBtn = document.getElementById('generateScriptDraftBtn');
  
  const bookImageInput = document.getElementById('bookImageInput');
  const uploadDropzone = document.getElementById('uploadDropzone');
  const imagePreviewArea = document.getElementById('imagePreviewArea');
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const extractImageTextBtn = document.getElementById('extractImageTextBtn');
  
  const voice1Select = document.getElementById('voice1Select');
  const voice2Select = document.getElementById('voice2Select');
  const voice3Select = document.getElementById('voice3Select');
  const deliveryStyleInput = document.getElementById('deliveryStyleInput');
  const saveToCloudflareCheckbox = document.getElementById('saveToCloudflareCheckbox');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const ttsModelSelect = document.getElementById('ttsModelSelect');
  
  const generateAudioActionBtn = document.getElementById('generateAudioActionBtn');
  const generateBtnText = document.getElementById('generateBtnText');
  const actionSpinner = document.getElementById('actionSpinner');
  const actionPlayIcon = document.getElementById('actionPlayIcon');
  const generationStatusMsg = document.getElementById('generationStatusMsg');

  // Waveform Canvas & Audio Context
  const canvas = document.getElementById('waveformCanvas');
  const canvasCtx = canvas.getContext('2d');
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let dataArray = null;
  let animFrameId = null;

  // --- INITIALIZATION ---
  function init() {
    setupTheme();
    loadSavedSettings();
    bindEvents();
    renderTranscript();
    loadAudioTrack(state.audioUrl, false);
    initWaveformCanvas();
    checkKvBackend();
  }

  // --- THEME ---
  function setupTheme() {
    const saved = localStorage.getItem('listening_theme') || 'dark';
    setTheme(saved);
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('listening_theme', theme);
    const meta = document.getElementById('theme-meta');
    if (meta) meta.content = theme === 'dark' ? '#0b0f19' : '#f8fafc';
    if (theme === 'dark') {
      themeIconSun.classList.remove('hidden');
      themeIconMoon.classList.add('hidden');
    } else {
      themeIconSun.classList.add('hidden');
      themeIconMoon.classList.remove('hidden');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  // --- CLOUDFLARE KV SYNC & STORAGE ---
  async function checkKvBackend() {
    try {
      const res = await fetch('/api/tracks');
      if (res.ok) {
        state.hasKvBackend = true;
        const data = await res.json();
        state.savedTracks = data.tracks || [];
        storageBadge.textContent = 'Cloudflare KV Online';
        storageBadge.style.color = '#10b981';
        storageBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        storageBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
      }
    } catch {
      state.hasKvBackend = false;
      storageBadge.textContent = 'Local Mode';
      storageBadge.style.color = 'var(--text-dim)';
      storageBadge.style.borderColor = 'var(--surface-border)';
      storageBadge.style.backgroundColor = 'transparent';
    }
  }

  async function loadLibraryTracks() {
    libraryList.innerHTML = '<div class="loading-state">Fetching saved tracks from Cloudflare...</div>';
    try {
      const res = await fetch('/api/tracks');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.savedTracks = data.tracks || [];
      renderLibraryList();
    } catch (err) {
      libraryList.innerHTML = `<div class="empty-state">Could not connect to Cloudflare KV: ${escapeHtml(err.message)}</div>`;
    }
  }

  function renderLibraryList() {
    libraryList.innerHTML = '';
    if (!state.savedTracks || state.savedTracks.length === 0) {
      libraryList.innerHTML = '<div class="empty-state">No saved tracks yet. Generate one to save it to Cloudflare KV!</div>';
      return;
    }

    state.savedTracks.forEach(track => {
      const item = document.createElement('div');
      item.className = 'track-item';

      const dateStr = track.createdAt ? new Date(track.createdAt).toLocaleDateString() : '';

      item.innerHTML = `
        <div class="track-info">
          <div class="track-item-title">${escapeHtml(track.title || 'Untitled Track')}</div>
          <div class="track-item-meta">${escapeHtml(track.subtitle || '')} • ${dateStr}</div>
        </div>
        <div class="track-actions">
          <button class="track-play-btn" data-id="${track.id}" title="Play Track">
            <svg class="icon-inline" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"/></svg>
          </button>
          <button class="track-del-btn" data-id="${track.id}" title="Delete Track">
            <svg class="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;
      libraryList.appendChild(item);
    });

    // Bind item buttons
    libraryList.querySelectorAll('.track-play-btn').forEach(btn => {
      btn.addEventListener('click', () => loadTrackById(btn.dataset.id));
    });

    libraryList.querySelectorAll('.track-del-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteTrackById(btn.dataset.id));
    });
  }

  async function loadTrackById(id) {
    try {
      const res = await fetch(`/api/tracks/${id}`);
      if (!res.ok) throw new Error('Track not found');
      const track = await res.json();
      
      state.currentTrackTitle = track.title;
      state.currentTrackSubtitle = track.subtitle || '';
      state.currentTranscript = track.transcript || [];

      trackTitleDisplay.textContent = state.currentTrackTitle;
      trackSubtitleDisplay.textContent = state.currentTrackSubtitle;
      renderTranscript();

      libraryModal.classList.add('hidden');
      loadAudioTrack(`/api/audio/${id}`, true);
    } catch (err) {
      alert(`Failed to load track: ${err.message}`);
    }
  }

  async function deleteTrackById(id) {
    if (!confirm('Are you sure you want to delete this track from Cloudflare KV?')) return;
    try {
      const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      state.savedTracks = state.savedTracks.filter(t => t.id !== id);
      renderLibraryList();
    } catch (err) {
      alert(`Error deleting track: ${err.message}`);
    }
  }

  async function saveTrackToCloudflare(trackData) {
    if (!state.hasKvBackend) return;
    try {
      setGenerationStatus('Saving audio to Cloudflare KV...');
      const res = await fetch('/api/tracks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackData)
      });
      if (res.ok) {
        setGenerationStatus('Saved to Cloudflare KV successfully!');
        checkKvBackend();
      }
    } catch (err) {
      console.warn('Could not save to Cloudflare KV:', err);
    }
  }

  // --- AUDIO PLAYBACK CORE ---
  function loadAudioTrack(url, autoPlay = true) {
    audio.src = url;
    audio.load();
    updateStatus('Loading audio...');
    
    audio.onloadedmetadata = () => {
      state.duration = audio.duration || 0;
      durationLabel.textContent = formatTime(state.duration);
      currentTimeLabel.textContent = '0:00';
      updateProgress(0);
      updateStatus('Ready to Play');
      if (autoPlay) {
        playAudio();
      }
    };

    audio.onerror = () => {
      updateStatus('Audio source ready');
    };
  }

  function playAudio() {
    ensureAudioContext();
    audio.playbackRate = state.playbackRate;
    audio.play().then(() => {
      state.isPlaying = true;
      playIconSvg.classList.add('hidden');
      pauseIconSvg.classList.remove('hidden');
      pulseIndicator.classList.add('active');
      updateStatus('Playing');
      startWaveformAnimation();
    }).catch(err => {
      console.warn('Playback prevented or awaiting gesture:', err);
      state.isPlaying = false;
      playIconSvg.classList.remove('hidden');
      pauseIconSvg.classList.add('hidden');
    });
  }

  function pauseAudio() {
    audio.pause();
    state.isPlaying = false;
    playIconSvg.classList.remove('hidden');
    pauseIconSvg.classList.add('hidden');
    pulseIndicator.classList.remove('active');
    updateStatus('Paused');
  }

  function togglePlay() {
    if (state.isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }

  function seekRelative(seconds) {
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration || 0));
  }

  function setSpeed(rate) {
    state.playbackRate = rate;
    audio.playbackRate = rate;
    speedPills.forEach(pill => {
      pill.classList.toggle('active', parseFloat(pill.dataset.speed) === rate);
    });
  }

  function toggleLoop() {
    state.isLooping = !state.isLooping;
    audio.loop = state.isLooping;
    loopToggleBtn.classList.toggle('active', state.isLooping);
  }

  function downloadAudio() {
    const a = document.createElement('a');
    a.href = audio.src;
    const cleanTitle = state.currentTrackTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    a.download = `${cleanTitle || 'listening-audio'}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateProgress(ratio) {
    const pct = Math.max(0, Math.min(ratio * 100, 100));
    timelineProgress.style.width = `${pct}%`;
    timelineHandle.style.left = `${pct}%`;
  }

  function updateStatus(text) {
    trackStatusText.textContent = text;
  }

  // --- AUDIO CONTEXT & WAVEFORM VISUALIZER ---
  function ensureAudioContext() {
    if (!audioCtx) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        sourceNode = audioCtx.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
      } catch (e) {
        console.warn('Web Audio context setup skipped:', e);
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function initWaveformCanvas() {
    drawIdleWaveform();
  }

  function drawIdleWaveform() {
    const width = canvas.width;
    const height = canvas.height;
    canvasCtx.clearRect(0, 0, width, height);

    const barCount = 36;
    const barWidth = 6;
    const gap = (width - (barCount * barWidth)) / (barCount - 1);
    
    const isDark = document.documentElement.dataset.theme !== 'light';
    const baseColor = isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(2, 132, 199, 0.25)';

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + gap);
      const waveNorm = Math.sin((i / barCount) * Math.PI);
      const barHeight = Math.max(6, waveNorm * 38);
      const y = (height - barHeight) / 2;

      canvasCtx.fillStyle = baseColor;
      canvasCtx.beginPath();
      canvasCtx.roundRect(x, y, barWidth, barHeight, 3);
      canvasCtx.fill();
    }
  }

  function startWaveformAnimation() {
    cancelAnimationFrame(animFrameId);

    function render() {
      if (!state.isPlaying) {
        drawIdleWaveform();
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      canvasCtx.clearRect(0, 0, width, height);

      const barCount = 36;
      const barWidth = 6;
      const gap = (width - (barCount * barWidth)) / (barCount - 1);

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
      }

      const isDark = document.documentElement.dataset.theme !== 'light';
      const gradient = canvasCtx.createLinearGradient(0, 0, width, 0);
      if (isDark) {
        gradient.addColorStop(0, '#38bdf8');
        gradient.addColorStop(0.5, '#60a5fa');
        gradient.addColorStop(1, '#a855f7');
      } else {
        gradient.addColorStop(0, '#0284c7');
        gradient.addColorStop(0.5, '#2563eb');
        gradient.addColorStop(1, '#9333ea');
      }

      for (let i = 0; i < barCount; i++) {
        const x = i * (barWidth + gap);
        let barHeight = 8;

        if (dataArray && dataArray.length > 0) {
          const freqIndex = Math.floor((i / barCount) * (dataArray.length * 0.75));
          const val = dataArray[freqIndex] || 0;
          barHeight = Math.max(6, (val / 255) * (height * 0.88));
        } else {
          const time = Date.now() * 0.006;
          const bounce = Math.abs(Math.sin(time + i * 0.35)) * 40 + 6;
          barHeight = bounce;
        }

        const y = (height - barHeight) / 2;
        canvasCtx.fillStyle = gradient;
        canvasCtx.beginPath();
        canvasCtx.roundRect(x, y, barWidth, barHeight, 3);
        canvasCtx.fill();
      }

      animFrameId = requestAnimationFrame(render);
    }

    render();
  }

  // --- TRANSCRIPT RENDERING ---
  function renderTranscript() {
    transcriptContent.innerHTML = '';
    if (!state.currentTranscript || state.currentTranscript.length === 0) {
      transcriptContent.innerHTML = '<p class="text-dim">No transcript available for this track.</p>';
      return;
    }

    state.currentTranscript.forEach((turn) => {
      const p = document.createElement('div');
      p.className = 'transcript-turn';

      let speakerClass = 's1';
      const name = (turn.speaker || '').toLowerCase();
      if (name.includes('maya') || name.includes('partner') || name.includes('speaker 2')) speakerClass = 's2';
      if (name.includes('emma') || name.includes('speaker 3')) speakerClass = 's3';

      p.innerHTML = `<span class="speaker-badge ${speakerClass}">${escapeHtml(turn.speaker || 'Voice')}:</span> ${escapeHtml(turn.text)}`;
      transcriptContent.appendChild(p);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- PRESETS LOADING ---
  function loadPreset(key) {
    const p = PRESETS[key];
    if (!p) return;

    scriptTextInput.value = p.script;
    deliveryStyleInput.value = p.style;
    switchTab('scriptTab');
    setGenerationStatus(`Loaded "${p.title}" preset.`);
  }

  // --- MODAL / DRAWER MANAGEMENT ---
  function openModal() {
    creatorModal.classList.remove('hidden');
    apiKeyInput.value = state.apiKey;
  }

  function closeModal() {
    creatorModal.classList.add('hidden');
  }

  function openLibrary() {
    libraryModal.classList.remove('hidden');
    loadLibraryTracks();
  }

  function closeLibrary() {
    libraryModal.classList.add('hidden');
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabPanes.forEach(pane => {
      pane.classList.toggle('hidden', pane.id !== tabId);
    });
  }

  function loadSavedSettings() {
    if (state.apiKey) {
      apiKeyInput.value = state.apiKey;
    }
  }

  function saveApiKey() {
    const val = apiKeyInput.value.trim();
    state.apiKey = val;
    localStorage.setItem('listening_gemini_api_key', val);
    setGenerationStatus('API key saved locally.');
  }

  function setGenerationStatus(msg, isError = false) {
    generationStatusMsg.textContent = msg;
    generationStatusMsg.style.color = isError ? '#ef4444' : 'var(--text-dim)';
  }

  function setGenerating(isGenerating) {
    if (isGenerating) {
      actionSpinner.classList.remove('hidden');
      actionPlayIcon.classList.add('hidden');
      generateBtnText.textContent = 'Synthesizing with Gemini TTS...';
      generateAudioActionBtn.disabled = true;
    } else {
      actionSpinner.classList.add('hidden');
      actionPlayIcon.classList.remove('hidden');
      generateBtnText.textContent = 'Generate Listening Audio';
      generateAudioActionBtn.disabled = false;
    }
  }

  // --- SCRIPT PARSER ---
  function parseScriptToTurns(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const turns = [];

    lines.forEach(line => {
      const match = line.match(/^([A-Za-z0-9_\s]{1,24}):\s*(.+)$/);
      if (match) {
        turns.push({
          speaker: match[1].trim(),
          text: match[2].trim()
        });
      } else {
        const prevSpeaker = turns.length > 0 ? turns[turns.length - 1].speaker : 'Narrator';
        turns.push({
          speaker: prevSpeaker,
          text: line
        });
      }
    });

    return turns;
  }

  // --- GEMINI PROMPT TO SCRIPT DRAFTER ---
  async function draftScriptWithAI() {
    const prompt = aiPromptInput.value.trim();
    if (!prompt) {
      alert('Please describe what you want the characters to say.');
      return;
    }

    if (!state.apiKey) {
      alert('Please enter your Gemini API Key in the settings accordion below.');
      return;
    }

    setGenerationStatus('Gemini is writing the dialogue script...');
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert Cambridge Primary English (ESL) curriculum developer. Write a dialogue script based on this request:
"${prompt}"

Rules:
1. Format each line strictly as "Speaker: Line". No markdown, no asterisks, no stage directions in parentheses.
2. Keep vocabulary natural, age-appropriate, and clearly enunciated for listening practice.
3. Maximum 6 to 10 dialogue turns total.`
            }]
          }]
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const generatedScript = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      scriptTextInput.value = generatedScript.trim();
      switchTab('scriptTab');
      setGenerationStatus('Draft script created! Review below and click Generate.');
    } catch (err) {
      console.error(err);
      setGenerationStatus(`Failed to draft script: ${err.message}`, true);
    }
  }

  // --- BOOK PHOTO / OCR VIA GEMINI VISION ---
  async function extractTextFromBookImage(file) {
    if (!state.apiKey) {
      alert('Please enter your Gemini API Key in the settings accordion below.');
      return;
    }

    setGenerationStatus('Gemini Vision is reading the textbook page...');
    
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || 'image/jpeg';

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data.split(',')[1]
                }
              },
              {
                text: `Extract all dialogue or speech bubbles from this textbook photo.
Format strictly as:
Speaker: Sentence
If speaker names are not shown, use Speaker 1, Speaker 2, etc.
Output ONLY the clean dialogue lines without markdown or explanations.`
              }
            ]
          }]
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      scriptTextInput.value = extractedText.trim();
      switchTab('scriptTab');
      setGenerationStatus('Dialogue successfully extracted from textbook! Click Generate.');
    } catch (err) {
      console.error(err);
      setGenerationStatus(`OCR Extraction failed: ${err.message}`, true);
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // --- CORE GEMINI TTS GENERATION ---
  async function generateListeningAudio() {
    const scriptText = scriptTextInput.value.trim();
    if (!scriptText) {
      alert('Please enter or draft dialogue text before generating.');
      return;
    }

    if (!state.apiKey) {
      const useSample = confirm('No Gemini API Key found. Would you like to load the bundled sample listening track (Leo & Maya dialogue) now, or enter your API key?');
      if (useSample) {
        closeModal();
        loadAudioTrack('sample.wav', true);
        return;
      }
      switchTab('scriptTab');
      document.querySelector('.settings-accordion').open = true;
      apiKeyInput.focus();
      return;
    }

    const turns = parseScriptToTurns(scriptText);
    if (turns.length === 0) {
      alert('Could not parse any dialogue turns.');
      return;
    }

    setGenerating(true);
    setGenerationStatus('Connecting to Gemini 3.8 TTS API...');

    const uniqueSpeakers = Array.from(new Set(turns.map(t => t.speaker)));
    const voice1 = voice1Select.value;
    const voice2 = voice2Select.value;
    const voice3 = voice3Select.value;
    const voiceChoices = [voice1, voice2, voice3, 'Zephyr', 'Fenrir', 'Charon'];

    const speakerConfigs = uniqueSpeakers.map((spk, i) => {
      return {
        speaker: spk,
        voice: voiceChoices[i % voiceChoices.length]
      };
    });

    const styleDirection = deliveryStyleInput.value.trim() || 'Clear enunciation for ESL learners';
    const model = ttsModelSelect.value || 'gemini-3.8-flash-tts';

    const contentItems = turns.map(t => {
      return {
        type: 'text',
        text: t.text,
        annotations: [
          {
            type: 'speech_metadata',
            speaker: t.speaker,
            style: styleDirection
          }
        ]
      };
    });

    const payload = {
      model: model,
      input: [
        {
          type: 'user_input',
          content: contentItems
        }
      ],
      response_format: { type: 'audio' },
      generation_config: {
        speech_config: {
          speakers: speakerConfigs
        }
      }
    };

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(state.apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `HTTP ${res.status}: ${res.statusText}`);
      }

      const responseData = await res.json();
      let base64Audio = null;

      if (responseData.output_audio && responseData.output_audio.data) {
        base64Audio = responseData.output_audio.data;
      } else if (Array.isArray(responseData.steps)) {
        for (const step of responseData.steps) {
          if (step.type === 'model_output' && Array.isArray(step.content)) {
            for (const item of step.content) {
              if (item.type === 'audio' && item.data) {
                base64Audio = item.data;
                break;
              }
            }
          }
          if (base64Audio) break;
        }
      }

      if (!base64Audio) {
        throw new Error('Gemini API succeeded but returned no audio bytes. Check model quota or parameters.');
      }

      // Convert Base64 to Blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/wav' });
      const objectUrl = URL.createObjectURL(blob);

      // Unique ID for Cloudflare KV storage
      const trackId = 'track_' + Date.now();

      // Title & Subtitle
      let trackTitle = '';
      let trackSubtitle = '';
      if (uniqueSpeakers.length > 1) {
        trackTitle = `${uniqueSpeakers.join(' & ')}: Listening Dialogue`;
        trackSubtitle = `${uniqueSpeakers.map((s, i) => `${s} (${speakerConfigs[i].voice})`).join(' • ')}`;
      } else {
        trackTitle = `${uniqueSpeakers[0] || 'Narration'}: Listening Audio`;
        trackSubtitle = `Voice: ${speakerConfigs[0].voice} • ${styleDirection}`;
      }

      // Update state & UI
      state.audioBlob = blob;
      state.audioUrl = objectUrl;
      state.currentTranscript = turns;
      state.currentTrackTitle = trackTitle;
      state.currentTrackSubtitle = trackSubtitle;

      trackTitleDisplay.textContent = state.currentTrackTitle;
      trackSubtitleDisplay.textContent = state.currentTrackSubtitle;

      renderTranscript();
      closeModal();
      loadAudioTrack(objectUrl, true);

      // Save to Cloudflare KV if checked
      if (saveToCloudflareCheckbox.checked) {
        saveTrackToCloudflare({
          id: trackId,
          title: trackTitle,
          subtitle: trackSubtitle,
          style: styleDirection,
          transcript: turns,
          audioBase64: base64Audio
        });
      }

    } catch (err) {
      console.error('Gemini TTS error:', err);
      setGenerationStatus(`Error: ${err.message}`, true);
    } finally {
      setGenerating(false);
    }
  }

  // --- EVENT BINDING ---
  function bindEvents() {
    // Navigation
    themeToggleBtn.addEventListener('click', toggleTheme);
    savedTracksBtn.addEventListener('click', openLibrary);
    closeLibraryBtn.addEventListener('click', closeLibrary);
    refreshLibraryBtn.addEventListener('click', loadLibraryTracks);
    openDrawerBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);
    
    // Playback
    mainPlayBtn.addEventListener('click', togglePlay);
    jumpBackBtn.addEventListener('click', () => seekRelative(-5));
    jumpForwardBtn.addEventListener('click', () => seekRelative(5));
    loopToggleBtn.addEventListener('click', toggleLoop);
    downloadAudioBtn.addEventListener('click', downloadAudio);

    // Speed Selector
    speedPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const rate = parseFloat(pill.dataset.speed);
        setSpeed(rate);
      });
    });

    // Scrubber click & drag
    let isDragging = false;
    function seekFromEvent(e) {
      const rect = timelineBar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
      updateProgress(ratio);
      audio.currentTime = ratio * (audio.duration || 0);
    }

    timelineBar.addEventListener('mousedown', (e) => {
      isDragging = true;
      seekFromEvent(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isDragging) seekFromEvent(e);
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch support for scrubber
    timelineBar.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        seekFromEvent(e.touches[0]);
      }
    }, { passive: true });

    timelineBar.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        seekFromEvent(e.touches[0]);
      }
    }, { passive: true });

    // Audio element events
    audio.addEventListener('timeupdate', () => {
      if (!isDragging && audio.duration) {
        state.currentTime = audio.currentTime;
        currentTimeLabel.textContent = formatTime(state.currentTime);
        updateProgress(state.currentTime / audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      state.isPlaying = false;
      playIconSvg.classList.remove('hidden');
      pauseIconSvg.classList.add('hidden');
      pulseIndicator.classList.remove('active');
      updateStatus('Finished');
      drawIdleWaveform();
    });

    // Transcript Toggle
    toggleTranscriptBtn.addEventListener('click', () => {
      transcriptBox.classList.toggle('hidden');
      toggleTranscriptBtn.classList.toggle('active', !transcriptBox.classList.contains('hidden'));
    });

    closeTranscriptBtn.addEventListener('click', () => {
      transcriptBox.classList.add('hidden');
      toggleTranscriptBtn.classList.remove('active');
    });

    // Modal Tabs
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Presets
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => loadPreset(chip.dataset.preset));
    });

    // API Key Save
    saveKeyBtn.addEventListener('click', saveApiKey);
    apiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveApiKey();
    });

    // Draft script with AI
    generateScriptDraftBtn.addEventListener('click', draftScriptWithAI);

    // Book Photo Upload / OCR
    uploadDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadDropzone.style.borderColor = 'var(--accent)';
    });

    uploadDropzone.addEventListener('dragleave', () => {
      uploadDropzone.style.borderColor = 'var(--surface-border)';
    });

    uploadDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadDropzone.style.borderColor = 'var(--surface-border)';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImageFile(e.dataTransfer.files[0]);
      }
    });

    bookImageInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });

    let currentSelectedImage = null;
    function handleImageFile(file) {
      currentSelectedImage = file;
      const url = URL.createObjectURL(file);
      imagePreviewImg.src = url;
      imagePreviewArea.classList.remove('hidden');
    }

    extractImageTextBtn.addEventListener('click', () => {
      if (currentSelectedImage) {
        extractTextFromBookImage(currentSelectedImage);
      }
    });

    // Action Generate
    generateAudioActionBtn.addEventListener('click', generateListeningAudio);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          generateListeningAudio();
        }
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.key === '1') {
        setSpeed(0.8);
      } else if (e.key === '2') {
        setSpeed(1.0);
      } else if (e.key === '3') {
        setSpeed(1.2);
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openModal();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        openLibrary();
      } else if (e.key === 'Escape') {
        closeModal();
        closeLibrary();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
