// Listening Studio - Gemini 3.8 TTS & Multimodal Exercise Dialogue Generator with Cloudflare KV

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
    currentTrackTitle: 'Cambridge Grade 2: Unit 9 — In My Lunch Box!',
    currentTrackSubtitle: 'Mia (Aoede), Leo (Puck) & Emma (Kore) • Primary ESL Listening',
    currentExerciseSummary: 'Exercise 4: Listen to what Mia, Leo, and Emma say. Match with lunch boxes A, B, or C.',
    currentTranscript: [
      { speaker: 'Mia', text: "In my lunch box, I've got a cheese and tomato sandwich. I haven't got a banana, but I've got an apple. I've got a drink today!" },
      { speaker: 'Leo', text: "In my lunch box, I've got a cheese sandwich, a banana, and an orange. I haven't got a biscuit. I haven't got a drink today." },
      { speaker: 'Emma', text: "I've got a pear and a biscuit. I've got two sandwiches. They are egg! My drink is water. I haven't got an apple." }
    ],
    currentAnswerKey: [
      { item: '1', question: "Mia's Lunch Box", answer: 'Box A', clue: "Mia: 'I've got a cheese and tomato sandwich... and an apple. I've got a drink today!'" },
      { item: '2', question: "Leo's Lunch Box", answer: 'Box B', clue: "Leo: 'I've got a cheese sandwich, a banana, and an orange. I haven't got a drink.'" },
      { item: '3', question: "Emma's Lunch Box", answer: 'Box C', clue: "Emma: 'I've got a pear and a biscuit. I've got two sandwiches. They are egg!'" }
    ],
    currentTeacherNotes: 'Play once at 0.8x for young learners to identify food words. Play a second time at 1.0x for matching.',
    currentImageUrl: null,
    currentImageBase64: null,
    savedTracks: [],
    apiKey: localStorage.getItem('listening_gemini_api_key') || '',
    hasServerKey: false,
    activeTab: 'photoTab',
    hasKvBackend: false
  };

  // --- PRESETS ---
  const PRESETS = {
    lunchbox: {
      title: 'Cambridge Grade 2: Unit 9 — In My Lunch Box!',
      subtitle: 'Mia (Aoede), Leo (Puck) & Emma (Kore) • Primary ESL Listening',
      exerciseSummary: 'Exercise 4: Listen and match the food items with Lunch Boxes A, B, or C.',
      style: 'Clear, gentle enunciation for 7-year-old Cambridge ESL learners, natural pauses',
      script: `Mia: In my lunch box, I've got a cheese and tomato sandwich. I haven't got a banana, but I've got an apple. I've got a drink today!
Leo: In my lunch box, I've got a cheese sandwich, a banana, and an orange. I haven't got a biscuit. I haven't got a drink today.
Emma: I've got a pear and a biscuit. I've got two sandwiches. They are egg! My drink is water. I haven't got an apple.`,
      answerKey: [
        { item: '1', question: "Mia's Box", answer: 'Box A (Cheese/tomato, apple, drink)', clue: "Mia: 'I've got a cheese and tomato sandwich and an apple.'" },
        { item: '2', question: "Leo's Box", answer: 'Box B (Cheese sandwich, banana, orange)', clue: "Leo: 'I've got a cheese sandwich, a banana, and an orange.'" },
        { item: '3', question: "Emma's Box", answer: 'Box C (Two egg sandwiches, pear, biscuit, water)', clue: "Emma: 'I've got a pear and a biscuit. Two sandwiches. They are egg!'" }
      ],
      teacherNotes: 'Pre-teach: have got / haven\'t got. Encourage students to tick items in their worksheets.'
    },
    cafe: {
      title: 'Everyday Dialogue: At the Café',
      subtitle: 'Leo (Puck) & Maya (Aoede) • Natural Conversational English',
      exerciseSummary: 'Listening Comprehension: What does Maya order?',
      style: 'Friendly, warm, conversational English with natural vocal inflection',
      script: `Leo: Good morning! Welcome in. What can I get started for you today?
Maya: Good morning Leo! I'd like a cinnamon oat milk cortado and a warm croissant, please.
Leo: Excellent choice. Tap or insert your card right here whenever you're ready. That'll be $8.50.
Maya: Perfect, there we go. Thank you so much!`,
      answerKey: [
        { item: '1', question: 'What drink does Maya order?', answer: 'Cinnamon oat milk cortado', clue: "Maya: 'I'd like a cinnamon oat milk cortado...'" },
        { item: '2', question: 'What pastry does she choose?', answer: 'A warm croissant', clue: "Maya: '...and a warm croissant, please.'" },
        { item: '3', question: 'How much is the total?', answer: '$8.50', clue: "Leo: 'That'll be $8.50.'" }
      ],
      teacherNotes: 'Focus on polite customer service phrases: "What can I get started for you?", "Whenever you\'re ready".'
    },
    story: {
      title: 'Story Narration: The Lost Kite',
      subtitle: 'Solo Storyteller (Charon) • Clear ESL Story Narration',
      exerciseSummary: 'Story Listening: Toby and the yellow kite.',
      style: 'Warm, expressive children\'s story narrator, slow and rhythmic',
      script: `Narrator: It was a windy Saturday morning in the park. Toby held the yellow kite tightly by the string. Suddenly, a big gust of wind blew across the trees! Toby looked up. His kite danced into the blue sky like a giant bird.`,
      answerKey: [
        { item: '1', question: 'What day was it?', answer: 'Saturday morning', clue: "Narrator: 'It was a windy Saturday morning...'" },
        { item: '2', question: 'What color was Toby\'s kite?', answer: 'Yellow', clue: "Narrator: 'Toby held the yellow kite tightly...'" },
        { item: '3', question: 'Where did the kite fly?', answer: 'Into the blue sky', clue: "Narrator: 'His kite danced into the blue sky...'" }
      ],
      teacherNotes: 'Great for past tense introduction (was, held, blew, looked, danced).'
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
  
  // Teacher Answer Key & Image Lightbox Elements
  const toggleAnswerKeyBtn = document.getElementById('toggleAnswerKeyBtn');
  const closeAnswerKeyBtn = document.getElementById('closeAnswerKeyBtn');
  const copyAnswerKeyBtn = document.getElementById('copyAnswerKeyBtn');
  const answerKeyBox = document.getElementById('answerKeyBox');
  const answerKeyBadge = document.getElementById('answerKeyBadge');
  const answerKeyList = document.getElementById('answerKeyList');
  const exerciseSummaryText = document.getElementById('exerciseSummaryText');
  const teacherNotesBanner = document.getElementById('teacherNotesBanner');
  
  const viewPageBtn = document.getElementById('viewPageBtn');
  const lightboxModal = document.getElementById('lightboxModal');
  const closeLightboxBtn = document.getElementById('closeLightboxBtn');
  const lightboxImg = document.getElementById('lightboxImg');

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
  
  // Photo Tab Elements
  const bookImageInput = document.getElementById('bookImageInput');
  const uploadDropzone = document.getElementById('uploadDropzone');
  const dropzoneEmptyView = document.getElementById('dropzoneEmptyView');
  const imagePreviewArea = document.getElementById('imagePreviewArea');
  const imagePreviewImg = document.getElementById('imagePreviewImg');
  const removeImageBtn = document.getElementById('removeImageBtn');
  const gradeLevelSelect = document.getElementById('gradeLevelSelect');
  const exerciseFocusInput = document.getElementById('exerciseFocusInput');

  // Text & Prompt Tab Elements
  const scriptTextInput = document.getElementById('scriptTextInput');
  const aiPromptInput = document.getElementById('aiPromptInput');
  const generateScriptDraftBtn = document.getElementById('generateScriptDraftBtn');
  
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

  // Attached image file reference
  let currentUploadedImageFile = null;

  // --- INITIALIZATION ---
  function init() {
    setupTheme();
    loadSavedSettings();
    bindEvents();
    renderTranscript();
    renderAnswerKey();
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
      const configRes = await fetch('/api/config').catch(() => null);
      if (configRes && configRes.ok) {
        const configData = await configRes.json();
        state.hasServerKey = !!configData.hasServerKey;
        if (state.hasServerKey && !state.apiKey) {
          const keyHint = document.querySelector('.key-hint');
          if (keyHint) {
            keyHint.textContent = '✓ Cloudflare Worker Gemini API Key is configured and active.';
            keyHint.style.color = '#10b981';
          }
        }
      }

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
      libraryList.innerHTML = '<div class="empty-state">No saved tracks yet. Generate an audio from a book photo or prompt to save it to Cloudflare KV!</div>';
      return;
    }

    state.savedTracks.forEach(track => {
      const item = document.createElement('div');
      item.className = 'track-item';

      const dateStr = track.createdAt ? new Date(track.createdAt).toLocaleDateString() : '';
      const keyBadge = track.hasAnswerKey ? '<span class="badge-mini-key">🔑 Answers</span>' : '';
      const pageBadge = track.hasImage ? '<span class="badge-mini-key" style="color:var(--accent);background:var(--accent-dim);border-color:var(--accent)">🖼️ Page</span>' : '';

      item.innerHTML = `
        <div class="track-info">
          <div class="track-item-title">${escapeHtml(track.title || 'Untitled Track')}</div>
          <div class="track-item-meta">${escapeHtml(track.subtitle || '')} • ${dateStr} ${keyBadge} ${pageBadge}</div>
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
      state.currentAnswerKey = track.answerKey || [];
      state.currentTeacherNotes = track.teacherNotes || '';
      state.currentExerciseSummary = track.exerciseSummary || '';
      state.currentImageUrl = track.hasImage ? `/api/image/${id}` : null;

      trackTitleDisplay.textContent = state.currentTrackTitle;
      trackSubtitleDisplay.textContent = state.currentTrackSubtitle;
      
      renderTranscript();
      renderAnswerKey();
      updateViewPageButton();

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
      setGenerationStatus('Saving audio, image & answer key to Cloudflare KV...');
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

  // --- TEACHER ANSWER KEY RENDERING ---
  function renderAnswerKey() {
    const hasKeys = Array.isArray(state.currentAnswerKey) && state.currentAnswerKey.length > 0;
    
    if (hasKeys) {
      toggleAnswerKeyBtn.classList.remove('hidden');
      answerKeyBadge.textContent = `Answers (${state.currentAnswerKey.length})`;
    } else {
      toggleAnswerKeyBtn.classList.add('hidden');
      answerKeyBox.classList.add('hidden');
      return;
    }

    if (state.currentExerciseSummary) {
      exerciseSummaryText.textContent = state.currentExerciseSummary;
      exerciseSummaryText.classList.remove('hidden');
    } else {
      exerciseSummaryText.classList.add('hidden');
    }

    answerKeyList.innerHTML = '';
    state.currentAnswerKey.forEach(item => {
      const card = document.createElement('div');
      card.className = 'answer-item';
      card.innerHTML = `
        <div class="answer-item-header">
          <span class="answer-item-q">${escapeHtml(item.item ? `${item.item}. ` : '')}${escapeHtml(item.question || '')}</span>
          <span class="answer-item-ans">${escapeHtml(item.answer || '')}</span>
        </div>
        ${item.clue ? `<div class="answer-item-clue">💡 Clue: "${escapeHtml(item.clue)}"</div>` : ''}
      `;
      answerKeyList.appendChild(card);
    });

    if (state.currentTeacherNotes) {
      teacherNotesBanner.innerHTML = `<strong>Teacher Note:</strong> ${escapeHtml(state.currentTeacherNotes)}`;
      teacherNotesBanner.classList.remove('hidden');
    } else {
      teacherNotesBanner.classList.add('hidden');
    }
  }

  function copyAnswerKeyToClipboard() {
    if (!state.currentAnswerKey || state.currentAnswerKey.length === 0) return;
    
    let text = `${state.currentTrackTitle}\n${state.currentExerciseSummary || ''}\n\n=== ANSWER KEY ===\n`;
    state.currentAnswerKey.forEach(item => {
      text += `${item.item ? `${item.item}. ` : ''}${item.question} -> ${item.answer}\n`;
      if (item.clue) text += `   (Clue: ${item.clue})\n`;
    });
    if (state.currentTeacherNotes) {
      text += `\nTeacher Note: ${state.currentTeacherNotes}\n`;
    }

    navigator.clipboard.writeText(text).then(() => {
      copyAnswerKeyBtn.textContent = 'Copied!';
      setTimeout(() => copyAnswerKeyBtn.textContent = 'Copy', 2000);
    }).catch(err => {
      alert('Could not copy to clipboard: ' + err.message);
    });
  }

  function updateViewPageButton() {
    if (state.currentImageUrl) {
      viewPageBtn.classList.remove('hidden');
      lightboxImg.src = state.currentImageUrl;
    } else {
      viewPageBtn.classList.add('hidden');
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- PRESETS LOADING ---
  function loadPreset(key) {
    const p = PRESETS[key];
    if (!p) return;

    scriptTextInput.value = p.script;
    deliveryStyleInput.value = p.style;
    state.currentAnswerKey = p.answerKey || [];
    state.currentTeacherNotes = p.teacherNotes || '';
    state.currentExerciseSummary = p.exerciseSummary || '';
    renderAnswerKey();
    switchTab('scriptTab');
    setGenerationStatus(`Loaded "${p.title}" preset with answer key.`);
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

  function setGenerating(isGenerating, statusText = '') {
    if (isGenerating) {
      actionSpinner.classList.remove('hidden');
      actionPlayIcon.classList.add('hidden');
      generateBtnText.textContent = statusText || 'Processing with Gemini...';
      generateAudioActionBtn.disabled = true;
    } else {
      actionSpinner.classList.add('hidden');
      actionPlayIcon.classList.remove('hidden');
      generateBtnText.textContent = 'Generate Listening Audio';
      generateAudioActionBtn.disabled = false;
    }
  }

  // --- IMAGE OPTIMIZATION VIA CANVAS ---
  function optimizeImage(file, maxDimension = 1280) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;
          if (w > maxDimension || h > maxDimension) {
            if (w > h) {
              h = Math.round((h * maxDimension) / w);
              w = maxDimension;
            } else {
              w = Math.round((w * maxDimension) / h);
              h = maxDimension;
            }
          }
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = c.toDataURL('image/jpeg', 0.82);
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // --- WAV STITCHER (Supports Any Number of Speakers) ---
  function concatenateWavUint8Arrays(wavArrays, silenceSeconds = 1.2) {
    if (!wavArrays || wavArrays.length === 0) return null;
    if (wavArrays.length === 1) return wavArrays[0];

    const first = wavArrays[0];
    const view = new DataView(first.buffer, first.byteOffset, first.byteLength);

    const numChannels = view.getUint16(22, true);
    const sampleRate = view.getUint32(24, true);
    const bitsPerSample = view.getUint16(34, true);
    const bytesPerSample = (bitsPerSample / 8) * numChannels;

    function getPcmData(arr) {
      const v = new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
      let offset = 12;
      while (offset < arr.length - 8) {
        const chunkId = String.fromCharCode(arr[offset], arr[offset+1], arr[offset+2], arr[offset+3]);
        const chunkSize = v.getUint32(offset + 4, true);
        if (chunkId === 'data') {
          return arr.subarray(offset + 8, offset + 8 + chunkSize);
        }
        offset += 8 + chunkSize;
      }
      return arr.subarray(44);
    }

    const silenceSamples = Math.round(sampleRate * silenceSeconds);
    const silenceBytes = new Uint8Array(silenceSamples * bytesPerSample);

    const pcmList = [];
    let totalPcmLen = 0;

    for (let i = 0; i < wavArrays.length; i++) {
      const pcm = getPcmData(wavArrays[i]);
      pcmList.push(pcm);
      totalPcmLen += pcm.length;
      if (i < wavArrays.length - 1 && silenceSeconds > 0) {
        pcmList.push(silenceBytes);
        totalPcmLen += silenceBytes.length;
      }
    }

    const headerBuf = new ArrayBuffer(44);
    const hv = new DataView(headerBuf);
    const hBytes = new Uint8Array(headerBuf);

    function writeAscii(str, offset) {
      for (let j = 0; j < str.length; j++) {
        hBytes[offset + j] = str.charCodeAt(j);
      }
    }

    writeAscii('RIFF', 0);
    hv.setUint32(4, 36 + totalPcmLen, true);
    writeAscii('WAVE', 8);
    writeAscii('fmt ', 12);
    hv.setUint32(16, 16, true);
    hv.setUint16(20, 1, true);
    hv.setUint16(22, numChannels, true);
    hv.setUint32(24, sampleRate, true);
    hv.setUint32(28, sampleRate * bytesPerSample, true);
    hv.setUint16(32, bytesPerSample, true);
    hv.setUint16(34, bitsPerSample, true);
    writeAscii('data', 36);
    hv.setUint32(40, totalPcmLen, true);

    const out = new Uint8Array(44 + totalPcmLen);
    out.set(hBytes, 0);
    let cur = 44;
    for (const part of pcmList) {
      out.set(part, cur);
      cur += part.length;
    }
    return out;
  }

  function uint8ArrayToBase64(uint8) {
    let binary = '';
    const len = uint8.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      const sub = uint8.subarray(i, Math.min(i + chunkSize, len));
      binary += String.fromCharCode.apply(null, sub);
    }
    return btoa(binary);
  }

  function base64ToUint8Array(base64) {
    const raw = atob(base64);
    const len = raw.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = raw.charCodeAt(i);
    }
    return bytes;
  }

  // --- ADVANCED SCRIPT & ANSWER KEY PARSER ---
  function parseInputScript(rawInput) {
    let dialogueText = rawInput;
    let answerKey = [];

    // 1. Separate Answer Key block if present
    const akRegex = /(?:^|\n)\s*(?:[*#\-_]{0,3})\s*Answer\s*Key\s*:?[\s*#\-_]*/i;
    const akMatch = rawInput.match(akRegex);
    if (akMatch) {
      const splitIndex = akMatch.index;
      dialogueText = rawInput.slice(0, splitIndex).trim();
      const answerKeyBlock = rawInput.slice(splitIndex + akMatch[0].length).trim();
      
      const lines = answerKeyBlock.split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach(line => {
        const clean = line.replace(/^[\*\-\d\.\s]+/, '');
        const colonIdx = clean.indexOf(':');
        if (colonIdx !== -1) {
          const item = clean.slice(0, colonIdx).replace(/[*_]/g, '').trim();
          const ans = clean.slice(colonIdx + 1).replace(/[*]/g, '').trim();
          answerKey.push({
            item: item,
            question: item,
            answer: ans,
            clue: ''
          });
        } else if (clean.length > 0) {
          answerKey.push({
            item: '',
            question: '',
            answer: clean.replace(/[*]/g, '').trim(),
            clue: ''
          });
        }
      });
    }

    // 2. Parse Dialogue sections (supports **Speaker 1**, Speaker 1:, or multi-line paragraphs)
    const turns = [];
    const lines = dialogueText.split('\n').map(l => l.trim());
    let currentSpeaker = 'Speaker 1';
    let currentParagraphs = [];

    function commitTurn() {
      if (currentParagraphs.length > 0) {
        const cleanText = currentParagraphs.join(' ').replace(/[*_#]/g, '').trim();
        if (cleanText) {
          turns.push({
            speaker: currentSpeaker,
            text: cleanText
          });
        }
        currentParagraphs = [];
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line === '---' || line === '***' || line === '___') {
        continue;
      }

      // Check if line is a speaker header: **Speaker 1**, # Speaker 1, Speaker 1:, [Speaker 1]
      const headerMatch = line.match(/^(?:[*#\-_\[\s]{0,3})\s*(Speaker\s*\d+|Narrator|[A-Z][a-zA-Z0-9_\s]{1,24})\s*(?:[*#\-_\]\s]{0,3}):?\s*(.*)$/i);
      
      if (headerMatch && (!headerMatch[2] || headerMatch[2].length < 60)) {
        commitTurn();
        currentSpeaker = headerMatch[1].replace(/[*_]/g, '').trim();
        if (headerMatch[2]) {
          currentParagraphs.push(headerMatch[2]);
        }
      } else {
        currentParagraphs.push(line);
      }
    }
    commitTurn();

    return { turns, answerKey };
  }

  // --- GEMINI 3.8 TTS SYNTHESIS ENGINE (1, 2, or Any Number of Speakers) ---
  async function callGeminiTts(turns, styleDirection) {
    const uniqueSpeakers = Array.from(new Set(turns.map(t => t.speaker)));
    const voice1 = voice1Select.value;
    const voice2 = voice2Select.value;
    const voice3 = voice3Select.value;
    const voiceChoices = [voice1, voice2, voice3, 'Fenrir', 'Zephyr', 'Kore', 'Puck', 'Aoede', 'Charon'];
    const model = ttsModelSelect.value || 'gemini-3.1-flash-tts-preview';

    // Helper: Single speaker API request with auto-retry and model fallback
    async function requestSingleSpeakerAudio(textToSpeak, voiceName, speakerLabel, activeModel = model) {
      const annotations = [];
      const cleanStyle = (styleDirection || '').trim();
      if (cleanStyle) {
        annotations.push({
          type: 'speech_metadata',
          style: cleanStyle
        });
      }

      const contentItem = {
        type: 'text',
        text: textToSpeak
      };
      if (annotations.length > 0) {
        contentItem.annotations = annotations;
      }

      const payload = {
        model: activeModel,
        input: [
          {
            type: 'user_input',
            content: [contentItem]
          }
        ],
        response_format: { type: 'audio' },
        generation_config: {
          speech_config: [
            { voice: voiceName }
          ]
        }
      };

      for (let attempt = 1; attempt <= 3; attempt++) {
        const fetchUrl = state.apiKey
          ? `https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(state.apiKey)}`
          : `/api/tts`;
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (state.apiKey) fetchHeaders['x-gemini-key'] = state.apiKey;

        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const responseData = await res.json();
          return extractAudioBase64(responseData);
        }

        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `TTS HTTP ${res.status}: ${res.statusText}`;

        // 1. If daily quota exhausted on 3.8, seamlessly switch to 3.1
        if (res.status === 429 && (errMsg.includes('per day') || errMsg.includes('daily')) && activeModel !== 'gemini-3.1-flash-tts-preview') {
          console.warn(`${activeModel} daily quota limit reached, automatically switching to gemini-3.1-flash-tts-preview...`);
          setGenerationStatus('Auto-switching to gemini-3.1-flash-tts-preview (daily quota limit on 3.8)...');
          return requestSingleSpeakerAudio(textToSpeak, voiceName, speakerLabel, 'gemini-3.1-flash-tts-preview');
        }

        // 2. If per-minute rate limit hit (e.g. 3 req/min on Free Tier), pause and retry
        if (res.status === 429 && attempt < 3) {
          console.warn('Per-minute rate limit encountered, waiting for window reset...');
          for (let sec = 20; sec > 0; sec--) {
            setGenerationStatus(`Free-tier rate limit reached. Pausing ${sec}s before next speaker...`);
            await new Promise(r => setTimeout(r, 1000));
          }
          continue;
        }

        throw new Error(errMsg);
      }
    }

    function extractAudioBase64(responseData) {
      if (responseData.output_audio && responseData.output_audio.data) {
        return responseData.output_audio.data;
      }
      if (Array.isArray(responseData.steps)) {
        for (const step of responseData.steps) {
          if (step.type === 'model_output' && Array.isArray(step.content)) {
            for (const item of step.content) {
              if (item.type === 'audio' && item.data) {
                return item.data;
              }
            }
          }
        }
      }
      if (Array.isArray(responseData.candidates) && responseData.candidates[0]?.content?.parts) {
        for (const part of responseData.candidates[0].content.parts) {
          if (part.inline_data && part.inline_data.data) {
            return part.inline_data.data;
          }
          if (part.inlineData && part.inlineData.data) {
            return part.inlineData.data;
          }
        }
      }
      throw new Error('Gemini TTS returned no audio data.');
    }

    // CASE 1: Single Speaker
    if (uniqueSpeakers.length === 1) {
      const fullText = turns.map(t => t.text).join('\n\n');
      const voice = voiceChoices[0];
      setGenerationStatus(`Synthesizing monologue with voice: ${voice}...`);
      const b64 = await requestSingleSpeakerAudio(fullText, voice, uniqueSpeakers[0]);
      const bytes = base64ToUint8Array(b64);
      const blob = new Blob([bytes], { type: 'audio/wav' });
      return { blob, objectUrl: URL.createObjectURL(blob), base64: b64 };
    }

    // CASE 2: Exactly 2 Speakers (Native Gemini 2-speaker multi-speaker request with fallback)
    if (uniqueSpeakers.length === 2) {
      try {
        setGenerationStatus(`Synthesizing 2-speaker dialogue with ${voiceChoices[0]} and ${voiceChoices[1]}...`);
        const speakerConfigs = [
          { speaker: uniqueSpeakers[0], voice: voiceChoices[0] },
          { speaker: uniqueSpeakers[1], voice: voiceChoices[1] }
        ];

        const contentItems = turns.map(t => ({
          type: 'text',
          text: t.text,
          annotations: [
            {
              type: 'speech_metadata',
              speaker: t.speaker,
              style: styleDirection || 'Clear enunciation for ESL learners'
            }
          ]
        }));

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

        const fetchUrl = state.apiKey
          ? `https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(state.apiKey)}`
          : `/api/tts`;
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (state.apiKey) fetchHeaders['x-gemini-key'] = state.apiKey;

        const res = await fetch(fetchUrl, {
          method: 'POST',
          headers: fetchHeaders,
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || `TTS HTTP ${res.status}: ${res.statusText}`);
        }

        const responseData = await res.json();
        const b64 = extractAudioBase64(responseData);
        const bytes = base64ToUint8Array(b64);
        const blob = new Blob([bytes], { type: 'audio/wav' });
        return { blob, objectUrl: URL.createObjectURL(blob), base64: b64 };
      } catch (err2Spk) {
        console.warn('Native 2-speaker dialogue call failed, falling back to multi-track stitching:', err2Spk);
        setGenerationStatus('Switching to multi-track audio stitching...');
        // Fall through to CASE 3!
      }
    }

    // CASE 3: 3 or More Speakers (e.g. 4 Exam Speakers!)
    // Synthesize each speaker individually and stitch WAV buffers with a 1.2s exam pause
    setGenerationStatus(`Synthesizing ${uniqueSpeakers.length} distinct speakers...`);
    const wavBuffers = [];

    // Group consecutive turns by speaker or synthesize each turn
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const spkIdx = uniqueSpeakers.indexOf(turn.speaker);
      const voice = voiceChoices[spkIdx >= 0 ? spkIdx % voiceChoices.length : 0];

      setGenerating(true, `Synthesizing ${turn.speaker} (${i + 1}/${turns.length}) with voice: ${voice}...`);
      const b64 = await requestSingleSpeakerAudio(turn.text, voice, turn.speaker);
      wavBuffers.push(base64ToUint8Array(b64));
    }

    setGenerating(true, 'Stitching audio tracks with exam pauses...');
    const combinedUint8 = concatenateWavUint8Arrays(wavBuffers, 1.2);
    const finalBase64 = uint8ArrayToBase64(combinedUint8);
    const blob = new Blob([combinedUint8], { type: 'audio/wav' });

    return {
      blob,
      objectUrl: URL.createObjectURL(blob),
      base64: finalBase64
    };
  }

  // --- MULTIMODAL: PHOTO TO DIALOGUE + ANSWER KEY ---
  async function generateFromPhotoWithAI(imageFile) {
    if (!state.apiKey && !state.hasServerKey) {
      alert('Please enter your Gemini API Key in the settings accordion below.');
      document.querySelector('.settings-accordion').open = true;
      apiKeyInput.focus();
      return;
    }

    setGenerating(true, 'Step 1/3: Inspecting textbook exercise with Gemini Vision...');
    setGenerationStatus('Gemini Vision is analyzing questions, gaps, and context...');

    try {
      const resizedDataUrl = await optimizeImage(imageFile, 1280);
      const base64Data = resizedDataUrl.split(',')[1];
      state.currentImageBase64 = resizedDataUrl;

      const gradeLevel = gradeLevelSelect.value;
      const userFocus = exerciseFocusInput.value.trim();

      const visionPrompt = `You are a master Cambridge Primary English (ESL) curriculum developer and teacher.
Analyze this textbook exercise page photo carefully.
The teacher cannot find the audio file for this exercise and needs you to compose the missing listening audio track and compute the exact answer key.

Level: ${gradeLevel}
${userFocus ? `Specific Exercise Focus: ${userFocus}` : ''}

Instructions:
1. Examine the page for the listening activity, exercise prompt (e.g., "Listen and tick", "Listen and match", "Listen and fill in the blanks / write a or an / food words").
2. Write a natural, highly engaging listening dialogue between 2 to 4 characters (or 1 narrator) designed for this exercise.
   - The dialogue MUST speak naturally and give the exact clues needed to answer the questions or fill in the blanks on this page!
   - Format dialogue strictly as turns: "Speaker: Line". No stage directions in parentheses.
3. Solve the exercise and generate the Answer Key for every question/gap/item on the page.
   - "item": "1", "2", "3", etc.
   - "question": the item text or prompt
   - "answer": the clear correct answer
   - "clue": quote from your generated listening dialogue proving the answer
4. Provide teacher notes for pacing or vocabulary.

Return strictly a valid JSON object matching this schema:
{
  "title": "Exercise / Unit Title",
  "subtitle": "Character voices & level description",
  "exerciseSummary": "Brief instruction summary for students",
  "dialogueTurns": [
    { "speaker": "SpeakerName", "text": "Verbatim line" }
  ],
  "answerKey": [
    { "item": "1", "question": "Question or gap text", "answer": "Answer", "clue": "Quote from audio" }
  ],
  "teacherNotes": "Tip for classroom implementation"
}`;

      const visionPayload = {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Data
              }
            },
            { text: visionPrompt }
          ]
        }],
        generation_config: {
          response_mime_type: 'application/json'
        }
      };

      const visionFetchUrl = state.apiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`
        : `/api/generate`;

      const visionRes = await fetch(visionFetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.apiKey ? visionPayload : { model: 'gemini-3.8-flash', payload: visionPayload })
      });

      if (!visionRes.ok) {
        const errJson = await visionRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Gemini Vision HTTP ${visionRes.status}`);
      }

      const visionData = await visionRes.json();
      const rawJsonText = visionData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const analysis = JSON.parse(rawJsonText);

      if (!analysis.dialogueTurns || analysis.dialogueTurns.length === 0) {
        throw new Error('Gemini could not identify or generate dialogue turns from this image.');
      }

      setGenerating(true, 'Step 2/3: Synthesizing voices with Gemini 3.8 TTS...');
      setGenerationStatus('Generating audio with natural pauses and pronunciation...');

      const turns = analysis.dialogueTurns;
      const audioResult = await callGeminiTts(turns, deliveryStyleInput.value.trim());

      state.currentTrackTitle = analysis.title || 'Textbook Exercise Listening';
      state.currentTrackSubtitle = analysis.subtitle || `${gradeLevel}`;
      state.currentExerciseSummary = analysis.exerciseSummary || '';
      state.currentTranscript = turns;
      state.currentAnswerKey = analysis.answerKey || [];
      state.currentTeacherNotes = analysis.teacherNotes || '';
      state.currentImageUrl = resizedDataUrl;
      state.audioBlob = audioResult.blob;
      state.audioUrl = audioResult.objectUrl;

      trackTitleDisplay.textContent = state.currentTrackTitle;
      trackSubtitleDisplay.textContent = state.currentTrackSubtitle;
      renderTranscript();
      renderAnswerKey();
      updateViewPageButton();
      closeModal();
      loadAudioTrack(audioResult.objectUrl, true);

      if (saveToCloudflareCheckbox.checked) {
        const trackId = 'track_' + Date.now();
        saveTrackToCloudflare({
          id: trackId,
          title: state.currentTrackTitle,
          subtitle: state.currentTrackSubtitle,
          exerciseSummary: state.currentExerciseSummary,
          style: deliveryStyleInput.value.trim(),
          transcript: turns,
          answerKey: state.currentAnswerKey,
          teacherNotes: state.currentTeacherNotes,
          audioBase64: audioResult.base64,
          imageBase64: base64Data
        });
      }

    } catch (err) {
      console.error(err);
      setGenerationStatus(`Photo Generation Error: ${err.message}`, true);
      alert('Error generating from photo: ' + err.message);
    } finally {
      setGenerating(false);
    }
  }

  // --- GEMINI PROMPT TO SCRIPT DRAFTER ---
  async function draftScriptWithAI() {
    const prompt = aiPromptInput.value.trim();
    if (!prompt) {
      alert('Please describe what you want the characters to say.');
      return;
    }

    if (!state.apiKey && !state.hasServerKey) {
      alert('Please enter your Gemini API Key in the settings accordion below.');
      return;
    }

    setGenerationStatus('Gemini is writing the dialogue and answer key...');
    try {
      const draftPayload = {
        contents: [{
          parts: [{
            text: `You are an expert Cambridge Primary English (ESL) curriculum developer. Write a dialogue script and answer key based on this request:
"${prompt}"

Return strictly valid JSON:
{
  "title": "Topic Title",
  "subtitle": "Character voices & level",
  "exerciseSummary": "Student instructions",
  "dialogueTurns": [
    { "speaker": "SpeakerName", "text": "Line to speak" }
  ],
  "answerKey": [
    { "item": "1", "question": "Question", "answer": "Answer", "clue": "Audio clue" }
  ],
  "teacherNotes": "Tip"
}`
          }]
        }],
        generation_config: { response_mime_type: 'application/json' }
      };

      const draftFetchUrl = state.apiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${encodeURIComponent(state.apiKey)}`
        : `/api/generate`;

      const res = await fetch(draftFetchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.apiKey ? draftPayload : { model: 'gemini-3.8-flash', payload: draftPayload })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(rawText);
      
      scriptTextInput.value = (parsed.dialogueTurns || []).map(t => `${t.speaker}: ${t.text}`).join('\n');
      state.currentAnswerKey = parsed.answerKey || [];
      state.currentTeacherNotes = parsed.teacherNotes || '';
      state.currentExerciseSummary = parsed.exerciseSummary || '';
      renderAnswerKey();

      switchTab('scriptTab');
      setGenerationStatus('Draft script & answers created! Review below and click Generate.');
    } catch (err) {
      console.error(err);
      setGenerationStatus(`Failed to draft script: ${err.message}`, true);
    }
  }

  // --- GENERAL GENERATE ACTION DISPATCHER ---
  async function handleGenerateAudioAction() {
    // 1. If in photo tab and image is attached, run multimodal pipeline
    if (state.activeTab === 'photoTab' && currentUploadedImageFile) {
      await generateFromPhotoWithAI(currentUploadedImageFile);
      return;
    }

    // 2. Otherwise parse script text (with automatic Answer Key extraction!)
    const rawInput = scriptTextInput.value.trim();
    if (!rawInput) {
      if (state.activeTab === 'photoTab') {
        alert('Please attach an exercise photo or switch to the Script tab to paste text.');
      } else {
        alert('Please enter or paste dialogue text before generating.');
      }
      return;
    }

    if (!state.apiKey && !state.hasServerKey) {
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

    // Use advanced parser
    const { turns, answerKey } = parseInputScript(rawInput);

    if (turns.length === 0) {
      alert('Could not parse any dialogue turns.');
      return;
    }

    // If answer key was found in text, save it into state!
    if (answerKey.length > 0) {
      state.currentAnswerKey = answerKey;
      renderAnswerKey();
    }

    setGenerating(true, 'Synthesizing audio with Gemini 3.8 TTS...');
    setGenerationStatus('Connecting to Gemini 3.8 TTS API...');

    try {
      const styleDirection = deliveryStyleInput.value.trim() || 'Clear enunciation for ESL learners';
      const audioResult = await callGeminiTts(turns, styleDirection);

      const uniqueSpeakers = Array.from(new Set(turns.map(t => t.speaker)));
      let trackTitle = '';
      let trackSubtitle = '';
      if (uniqueSpeakers.length > 1) {
        trackTitle = `${uniqueSpeakers.join(' & ')}: Listening Task`;
        trackSubtitle = `${uniqueSpeakers.length} Speakers • Cambridge ESL`;
      } else {
        trackTitle = `${uniqueSpeakers[0] || 'Narration'}: Listening Audio`;
        trackSubtitle = `Voice Narration • ${styleDirection}`;
      }

      state.audioBlob = audioResult.blob;
      state.audioUrl = audioResult.objectUrl;
      state.currentTranscript = turns;
      state.currentTrackTitle = trackTitle;
      state.currentTrackSubtitle = trackSubtitle;

      trackTitleDisplay.textContent = state.currentTrackTitle;
      trackSubtitleDisplay.textContent = state.currentTrackSubtitle;

      renderTranscript();
      renderAnswerKey();
      closeModal();
      loadAudioTrack(audioResult.objectUrl, true);

      if (saveToCloudflareCheckbox.checked) {
        const trackId = 'track_' + Date.now();
        saveTrackToCloudflare({
          id: trackId,
          title: trackTitle,
          subtitle: trackSubtitle,
          exerciseSummary: state.currentExerciseSummary || `${uniqueSpeakers.length} Speaker Listening Activity`,
          style: styleDirection,
          transcript: turns,
          answerKey: state.currentAnswerKey,
          teacherNotes: state.currentTeacherNotes,
          audioBase64: audioResult.base64
        });
      }

    } catch (err) {
      console.error(err);
      setGenerationStatus(`Error: ${err.message}`, true);
      alert('Error generating audio: ' + err.message);
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

    // Answer Key & Lightbox
    toggleAnswerKeyBtn.addEventListener('click', () => {
      answerKeyBox.classList.toggle('hidden');
      toggleAnswerKeyBtn.classList.toggle('active', !answerKeyBox.classList.contains('hidden'));
    });
    closeAnswerKeyBtn.addEventListener('click', () => {
      answerKeyBox.classList.add('hidden');
      toggleAnswerKeyBtn.classList.remove('active');
    });
    copyAnswerKeyBtn.addEventListener('click', copyAnswerKeyToClipboard);

    viewPageBtn.addEventListener('click', () => {
      lightboxModal.classList.remove('hidden');
    });
    closeLightboxBtn.addEventListener('click', () => {
      lightboxModal.classList.add('hidden');
    });

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
        handleSelectedImage(e.dataTransfer.files[0]);
      }
    });

    bookImageInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleSelectedImage(e.target.files[0]);
      }
    });

    removeImageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentUploadedImageFile = null;
      bookImageInput.value = '';
      imagePreviewArea.classList.add('hidden');
      dropzoneEmptyView.classList.remove('hidden');
      generateBtnText.textContent = 'Generate Listening Audio';
    });

    function handleSelectedImage(file) {
      currentUploadedImageFile = file;
      const url = URL.createObjectURL(file);
      imagePreviewImg.src = url;
      dropzoneEmptyView.classList.add('hidden');
      imagePreviewArea.classList.remove('hidden');
      generateBtnText.textContent = 'Generate Audio & Answer Key from Picture';
      setGenerationStatus('Photo loaded. Click below to analyze and generate!');
    }

    // Action Generate Dispatcher
    generateAudioActionBtn.addEventListener('click', handleGenerateAudioAction);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          handleGenerateAudioAction();
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
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        answerKeyBox.classList.toggle('hidden');
        toggleAnswerKeyBtn.classList.toggle('active', !answerKeyBox.classList.contains('hidden'));
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        transcriptBox.classList.toggle('hidden');
        toggleTranscriptBtn.classList.toggle('active', !transcriptBox.classList.contains('hidden'));
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openModal();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        openLibrary();
      } else if (e.key === 'Escape') {
        closeModal();
        closeLibrary();
        lightboxModal.classList.add('hidden');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
