/**
 * TakuAssistant.jsx - Taku AI: Asisten Aktif (Tombol Taku AI)
 *
 * Tombol interaktif Taku AI di sudut kanan bawah aplikasi.
 * Fitur:
 *  - Logo robot Taku AI tajam & proporsional (mengisi penuh tombol bulat 68px)
 *  - Animasi bernafas (breathing) & hover tilt hidup
 *  - Sonar rings animasi di lapisan belakang tombol
 *  - Sapaan baru 1x per sesi login (via sessionStorage)
 *  - Fast-Path Intent Recognition (< 20ms respons instan untuk siram, laporan, navigasi)
 *  - Fallback ke API Taku AI jika pertanyaan umum/bebas
 *  - Request izin mikrofon yang ramah & lancar
 *  - TTS respons natural via SpeechSynthesis + animasi 5-bar waveform saat berbicara
 *  - Response bubble interaktif di atas tombol
 *  - Menu pintasan manual saat mikrofon tidak tersedia
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { waterPlantApi, toggleAutoWaterApi, takuCommandApi } from '../services/plantService';
import {
  buildGardenReportText,
  buildWateringConfirmText,
  buildWaterAllConfirmText,
  buildAutoWaterConfirmText,
  buildNavigateConfirmText,
  computeGardenReportData,
} from '../services/reportTemplates';
import { speakText as takuSpeakText, stopSpeech } from '../services/takuAiService';
import { useTakuState, getTakuState, setTakuState, runtime } from '../services/takuStore';
import { answerConfirm, stopScenes } from '../services/takuDirector';
import { startGardenReport, startPresentation } from '../services/takuScripts';
import TakuCore from './taku/TakuCore';

// Route map - nama dari AI -> path react-router
const ROUTE_MAP = {
  'dashboard':      '/dashboard',
  'kebun-saya':     '/garden',
  'riwayat':        '/history',
  'kelola-tanaman': '/manage-plants',
  'profil':         '/profile',
  'taku-chat':      '/taku',
};

const ROUTE_LABELS = {
  'dashboard':      'Dashboard',
  'kebun-saya':     'Kebun Saya',
  'riwayat':        'Riwayat',
  'kelola-tanaman': 'Manajemen Tanaman',
  'profil':         'Profil',
  'taku-chat':      'Tanya Taku AI',
};

const TAKU_STYLES = `
  @keyframes taku-bubble-in {
    from { opacity: 0; transform: translateY(8px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes taku-bubble-out {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to   { opacity: 0; transform: translateY(-6px) scale(0.97); }
  }
  @keyframes taku-sonar {
    0%   { transform: scale(1);   opacity: 0.7; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  @keyframes taku-breathe {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.05); }
  }
  @keyframes taku-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes taku-wave {
    0%   { height: 4px; }
    100% { height: 18px; }
  }

  .taku-button {
    width: 78px;
    height: 78px;
    border-radius: 50%;
    overflow: hidden;
    border: 3.5px solid #ffffff;
    cursor: pointer;
    box-shadow: 0 8px 28px rgba(29, 158, 117, 0.45);
    animation: taku-breathe 3.2s ease-in-out infinite;
    position: relative;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #DCF7EC;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  }
  .taku-button:hover {
    box-shadow: 0 12px 34px rgba(29, 158, 117, 0.6);
  }
  .taku-button.is-listening {
    border-color: #3B8BF7;
    box-shadow: 0 0 30px rgba(59, 139, 247, 0.85);
    animation: none;
  }
  .taku-button.is-processing {
    border-color: #F5A623;
    box-shadow: 0 0 30px rgba(245, 166, 35, 0.85);
  }
  .taku-button.is-speaking {
    border-color: #1D9E75;
    box-shadow: 0 0 30px rgba(29, 158, 117, 0.85);
  }
  .taku-logo {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scale(1.68);
    transform-origin: center center;
    transition: transform 0.3s ease;
    display: block;
    user-select: none;
    pointer-events: none;
  }
  .taku-button:hover .taku-logo {
    transform: scale(1.78) rotate(-4deg);
  }

  .taku-label-badge {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #1D9E75;
    background: rgba(255, 255, 255, 0.95);
    padding: 3px 12px;
    border-radius: 14px;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(29, 158, 117, 0.25);
    user-select: none;
    margin-top: 2px;
    transition: all 0.25s ease;
    text-align: center;
  }

  .taku-waveform {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    height: 20px;
    position: absolute;
    bottom: -24px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
    z-index: 10;
  }
  .taku-waveform span {
    width: 3px;
    border-radius: 2px;
    background: #1D9E75;
    animation: taku-wave 0.55s ease-in-out infinite alternate;
  }
`;

export default function TakuAssistant() {
  const { user, plants, showToast, loadPlants, toggleTheme, theme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase]             = useState('idle'); // 'idle' | 'listening' | 'processing' | 'speaking'
  const [bubble, setBubble]           = useState('');
  const [bubbleOut, setBubbleOut]     = useState(false);
  const [showMenu, setShowMenu]       = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [speechOk, setSpeechOk]       = useState(true);

  const recognitionRef = useRef(null);
  const bubbleTimer    = useRef(null);
  const synthRef       = useRef(window.speechSynthesis);

  const tk = useTakuState();

  // Director berjalan di luar React; beri ia referensi terbaru ke fungsi aplikasi.
  useEffect(() => {
    runtime.navigate = navigate;
    runtime.plants = plants;
    runtime.user = user;
    runtime.theme = theme;
    runtime.showToast = showToast;
    runtime.toggleTheme = toggleTheme;
    runtime.loadPlants = loadPlants;
  });

  // Cerminkan fase lokal ke store (kecuali Director yang sedang memegang kendali)
  useEffect(() => {
    if (!getTakuState().presenting) setTakuState({ phase });
  }, [phase]);

  const speakText = useCallback((text, preset = 'normal') => {
    if (!('speechSynthesis' in window)) return;
    takuSpeakText(text, preset, {
      onStart: () => setPhase('speaking'),
      onEnd: () => setPhase('idle'),
      onError: () => setPhase('idle'),
    });
  }, []);

  const showBubble = useCallback((text) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    setBubbleOut(false);
    setBubble(text);
    bubbleTimer.current = setTimeout(() => {
      setBubbleOut(true);
      setTimeout(() => setBubble(''), 350);
    }, 4500);
  }, []);

  const speakAndShow = useCallback((text, preset = 'normal') => {
    showBubble(text);
    speakText(text, preset);
  }, [showBubble, speakText]);

  // Boot sequence + sapaan, baru 1x per sesi login (Opsi A — Jarvis Style)
  useEffect(() => {
    if (!user) return;
    const alreadyGreeted = sessionStorage.getItem('taku_greeted');
    if (alreadyGreeted) return;
    sessionStorage.setItem('taku_greeted', 'true');
    const firstName = (user.name || 'Sahabat').split(' ')[0];
    const greeting = `Selamat datang, ${firstName}. Sistem aktif, semua sensor terhubung. Saya Taku, siap bantu apa pun yang kamu butuhkan di kebun hari ini.`;
    setTakuState({ booting: true });
    // Sengaja tanpa cleanup: Layout di-mount ulang saat pindah halaman,
    // dan boot tidak boleh tertinggal menyala.
    setTimeout(() => setTakuState({ booting: false }), 3000);
    setTimeout(() => speakAndShow(greeting, 'greeting'), 3200);
  }, [user, speakAndShow]);

  // Setup Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSpeechOk(false); return; }

    const rec = new SpeechRecognition();
    rec.continuous      = false;
    rec.lang            = 'id-ID';
    rec.interimResults  = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setPhase('listening'); setShowMenu(false); };
    rec.onend   = () => { setPhase((prev) => (prev === 'listening' ? 'idle' : prev)); };
    rec.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      setPhase('idle');
      if (e.error === 'not-allowed') {
        setSpeechOk(false);
        showToast('Izin mikrofon diperlukan. Klik "Allow" di browser atau gunakan menu manual.', 'warning');
      } else if (e.error !== 'aborted') {
        showToast('Gagal mengenali suara, coba lagi.', 'error');
      }
    };
    rec.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      console.log('[Taku] Mendengar:', transcript);
      showToast(`🎤 "${transcript}"`, 'info');
      await processCommand(transcript);
    };

    recognitionRef.current = rec;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const executeToolCalls = useCallback(async (toolCalls, backendPlants, defaultReply) => {
    const plantList = (backendPlants && backendPlants.length) ? backendPlants : plants;
    let finalReply = defaultReply;

    for (const call of toolCalls) {
      switch (call.name) {
        case 'navigate_to_page': {
          const pageKey = call.parameters && call.parameters.page;
          const path = ROUTE_MAP[pageKey];
          if (path) {
            navigate(path);
            const label = ROUTE_LABELS[pageKey] || pageKey;
            finalReply = buildNavigateConfirmText(label);
          }
          break;
        }
        case 'water_plant': {
          const target = ((call.parameters && call.parameters.target) || '').toLowerCase().trim();
          try {
            if (target === 'semua') {
              showToast('💧 Menyiram semua tanaman...', 'info');
              await Promise.all(plantList.map((p) => waterPlantApi(p.id)));
              showToast('✅ Semua tanaman berhasil disiram!', 'success');
              finalReply = buildWaterAllConfirmText(plantList.length);
            } else {
              const found = plantList.find((p) =>
                p.name.toLowerCase().includes(target) ||
                (p.type || '').toLowerCase().includes(target) ||
                p.name.toLowerCase().split(' ').some((w) => w.length > 2 && target.includes(w))
              );
              if (found) {
                await waterPlantApi(found.id);
                showToast(`💧 ${found.name} berhasil disiram!`, 'success');
                finalReply = buildWateringConfirmText(found.name);
              } else {
                showToast(`Tanaman "${target}" tidak ditemukan.`, 'warning');
              }
            }
            await loadPlants();
          } catch (err) {
            showToast(`Gagal menyiram: ${err.message}`, 'error');
          }
          break;
        }
        case 'toggle_auto_water': {
          const plantName = ((call.parameters && call.parameters.plantName) || '').toLowerCase();
          const enabled   = Boolean(call.parameters && call.parameters.enabled);
          try {
            const found = plantList.find((p) => p.name.toLowerCase().includes(plantName));
            if (found) {
              await toggleAutoWaterApi(found.id, enabled);
              showToast(`${enabled ? '🔄 Aktifkan' : '⏹ Nonaktifkan'} siram otomatis ${found.name}`, 'success');
              finalReply = buildAutoWaterConfirmText(found.name, enabled);
              await loadPlants();
            } else {
              showToast(`Tanaman "${plantName}" tidak ditemukan.`, 'warning');
            }
          } catch (err) {
            showToast(`Gagal toggle auto water: ${err.message}`, 'error');
          }
          break;
        }
        case 'get_garden_report': {
          const reportData = computeGardenReportData(plantList);
          finalReply = buildGardenReportText(reportData);
          break;
        }
        case 'toggle_theme': {
          const targetTheme = call.parameters && call.parameters.theme;
          if (targetTheme === 'dark' || targetTheme === 'light') {
            toggleTheme(targetTheme);
            finalReply = targetTheme === 'dark' ? 'Mode malam diaktifkan.' : 'Mode terang diaktifkan.';
          } else {
            toggleTheme();
            finalReply = 'Tema tampilan berhasil diubah.';
          }
          break;
        }
        default:
          console.warn('[Taku] Unknown tool call:', call.name);
      }
    }

    return finalReply;
  }, [navigate, plants, loadPlants, showToast, toggleTheme]);

  // Fast local intent matching (< 10ms response)
  const tryLocalFastPath = useCallback(async (transcript) => {
    const lower = transcript.toLowerCase().trim();

    // 0. Jawaban konfirmasi (ya / tidak) saat Taku sedang menunggu
    if (getTakuState().confirm) {
      if (/\b(ya|iya|boleh|oke|ok|siram|lanjut|tentu)\b/.test(lower)) { answerConfirm(true); return true; }
      if (/\b(tidak|nggak|enggak|jangan|nanti|batal)\b/.test(lower)) { answerConfirm(false); return true; }
    }

    // 0b. Hentikan Taku
    if (getTakuState().presenting && /\b(stop|berhenti|diam|cukup|hentikan)\b/.test(lower)) {
      stopScenes();
      return true;
    }

    // 0c. Mode presentasi
    if (lower.includes('presentasi') || lower.includes('demo lengkap') || lower.includes('perkenalkan diri')) {
      startPresentation();
      return true;
    }

    // 1. Laporan — Taku berkeliling aplikasi sambil menjelaskan
    if (lower.includes('laporan') || lower.includes('kondisi kebun') || lower.includes('status kebun') || lower.includes('kondisi tanaman') || lower.includes('status tanaman') || lower.includes('bagaimana kebun')) {
      startGardenReport();
      return true;
    }

    // 2. Siram
    if (lower.includes('siram') || lower.includes('siramin') || lower.includes('watering')) {
      if (lower.includes('semua')) {
        showToast('💧 Menyiram semua tanaman...', 'info');
        speakAndShow(buildWaterAllConfirmText(plants.length));
        try {
          await Promise.all(plants.map((p) => waterPlantApi(p.id)));
          showToast('✅ Semua tanaman berhasil disiram!', 'success');
          await loadPlants();
        } catch (err) {
          showToast(`Gagal menyiram: ${err.message}`, 'error');
        }
        return true;
      }

      const found = plants.find((p) =>
        lower.includes(p.name.toLowerCase()) ||
        (p.type && lower.includes(p.type.toLowerCase())) ||
        p.name.toLowerCase().split(' ').some((w) => w.length > 2 && lower.includes(w))
      );
      if (found) {
        showToast(`💧 Menyiram ${found.name}...`, 'info');
        speakAndShow(buildWateringConfirmText(found.name));
        try {
          await waterPlantApi(found.id);
          showToast(`✅ ${found.name} berhasil disiram!`, 'success');
          await loadPlants();
        } catch (err) {
          showToast(`Gagal menyiram: ${err.message}`, 'error');
        }
        return true;
      }
    }

    // 3. Navigasi
    if (lower.includes('dashboard') || lower.includes('beranda')) {
      navigate('/dashboard');
      speakAndShow(buildNavigateConfirmText('Dashboard'));
      return true;
    }
    if (lower.includes('kebun') || lower.includes('tanaman saya')) {
      navigate('/garden');
      speakAndShow(buildNavigateConfirmText('Kebun Saya'));
      return true;
    }
    if (lower.includes('riwayat') || lower.includes('history')) {
      navigate('/history');
      speakAndShow(buildNavigateConfirmText('Riwayat'));
      return true;
    }
    if (lower.includes('kelola') || lower.includes('manajemen tanaman')) {
      navigate('/manage-plants');
      speakAndShow(buildNavigateConfirmText('Manajemen Tanaman'));
      return true;
    }
    if (lower.includes('profil') || lower.includes('pengaturan')) {
      navigate('/profile');
      speakAndShow(buildNavigateConfirmText('Profil dan Pengaturan'));
      return true;
    }

    // 4. Ubah Mode Gelap / Terang (Theme Toggle)
    if (lower.includes('dark mode') || lower.includes('mode gelap') || lower.includes('tema malam') || lower.includes('mode malam')) {
      toggleTheme('dark');
      speakAndShow('Siap, beralih ke Mode Gelap Kebun Malam.');
      return true;
    }
    if (lower.includes('light mode') || lower.includes('mode terang') || lower.includes('tema siang') || lower.includes('mode siang')) {
      toggleTheme('light');
      speakAndShow('Siap, beralih ke Mode Terang.');
      return true;
    }
    if (lower.includes('ganti tema') || lower.includes('ubah tema') || lower.includes('toggle mode')) {
      toggleTheme();
      speakAndShow('Siap, tema tampilan sudah diubah.');
      return true;
    }

    return false;
  }, [navigate, plants, loadPlants, speakAndShow, showToast, toggleTheme]);

  const processCommand = useCallback(async (transcript) => {
    // 1. Coba fast-path lokal terlebih dahulu (respons seketika < 20ms)
    const handledLocally = await tryLocalFastPath(transcript);
    if (handledLocally) {
      return;
    }

    // 2. Jika bukan perintah umum, kirim ke backend
    setPhase('processing');
    try {
      const result = await takuCommandApi(transcript, location.pathname);
      const { toolCalls = [], spokenReply = '', plants: backendPlants } = result;
      let replyToSpeak = spokenReply;

      if (toolCalls.length > 0) {
        replyToSpeak = await executeToolCalls(toolCalls, backendPlants, spokenReply);
      }

      if (replyToSpeak) {
        speakAndShow(replyToSpeak);
      } else {
        setPhase('idle');
      }
    } catch (err) {
      console.error('[Taku] processCommand error:', err);
      setPhase('idle');
      const fallback = 'Maaf, saya sedang tidak bisa terhubung ke server. Coba lagi sebentar.';
      speakAndShow(fallback);
      showToast('Taku AI tidak merespons.', 'error');
    }
  }, [location.pathname, tryLocalFastPath, executeToolCalls, speakAndShow, showToast]);

  const handleManualCommand = useCallback(async (text) => {
    setShowMenu(false);
    showToast(`▶ "${text}"`, 'info');
    await processCommand(text);
  }, [processCommand, showToast]);

  const handleButtonClick = async () => {
    if (phase === 'listening') {
      recognitionRef.current && recognitionRef.current.stop();
      return;
    }
    if (phase === 'processing' || phase === 'speaking') return;
    setShowMenu(false);

    // Minta akses mic secara eksplisit saat klik jika belum diizinkan
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setSpeechOk(true);
      } catch (err) {
        console.warn('Microphone permission check:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          showToast('Izin mikrofon diperlukan. Silakan klik "Allow" pada pop-up browser.', 'warning');
          setShowMenu(true);
          return;
        }
      }
    }

    try {
      recognitionRef.current && recognitionRef.current.start();
    } catch (err) {
      console.error('[Taku] Speech start error:', err);
      setPhase('idle');
    }
  };

  useEffect(() => () => { if (bubbleTimer.current) clearTimeout(bubbleTimer.current); }, []);

  const ph           = tk.presenting ? tk.phase : phase;
  const isListening  = ph === 'listening';
  const isProcessing = ph === 'processing';
  const isSpeaking   = ph === 'speaking';
  const isActive     = isListening || isProcessing || isSpeaking;

  const ringColor = isListening ? '#3B8BF7' : isProcessing ? '#F5A623' : '#1D9E75';
  const buttonLabel = isListening
    ? 'Mendengarkan...'
    : isProcessing
    ? 'Memproses...'
    : isSpeaking
    ? 'Berbicara...'
    : 'Tombol Taku AI - Ketuk untuk berbicara';

  return (
    <>
      <style>{TAKU_STYLES}</style>
      <div style={{ position: 'fixed', bottom: '84px', right: '20px', zIndex: 1100, fontFamily: 'var(--font-family)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>

        {/* Response bubble */}
        {bubble && !tk.presenting && (
          <div style={{ background: 'var(--color-card, #fff)', border: '1px solid var(--color-border, #DCF0E9)', borderRadius: '16px', borderBottomRightRadius: '4px', padding: '10px 14px', maxWidth: '270px', fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text)', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', animation: bubbleOut ? 'taku-bubble-out 0.35s ease forwards' : 'taku-bubble-in 0.3s ease both' }}>
            <span style={{ fontWeight: 700, color: '#1D9E75', fontSize: '11px', display: 'block', marginBottom: '3px', letterSpacing: '0.04em' }}>TAKU AI</span>
            {bubble}
          </div>
        )}

        {/* Tooltip hover */}
        {showTooltip && !isActive && !bubble && (
          <div style={{ background: 'var(--color-card, #fff)', border: '1px solid var(--color-border, #DCF0E9)', borderRadius: '12px', borderBottomRightRadius: '4px', padding: '10px 14px', maxWidth: '240px', fontSize: '12px', color: 'var(--color-text-sub)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', animation: 'taku-bubble-in 0.25s ease both' }}>
            <p style={{ fontWeight: 700, color: '#1D9E75', margin: '0 0 6px' }}>Asisten Aktif Taku</p>
            <ul style={{ margin: 0, paddingLeft: '14px', listStyleType: 'disc', lineHeight: 1.8 }}>
              <li>"Pindah ke kebun saya"</li>
              <li>"Siram durian"</li>
              <li>"Laporan kebun saya"</li>
              <li>"Aktifkan siram otomatis manggis"</li>
            </ul>
          </div>
        )}

        {/* Manual menu */}
        {showMenu && (
          <div style={{ background: 'var(--color-card, #fff)', border: '1px solid var(--color-border, #DCF0E9)', borderRadius: '14px', padding: '8px', width: '244px', boxShadow: '0 8px 28px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column', gap: '4px', animation: 'taku-bubble-in 0.25s ease both' }}>
            <div style={{ padding: '6px 8px', fontWeight: 700, fontSize: '11px', color: '#1D9E75', borderBottom: '1px solid var(--color-border-soft, #EDF7F3)', letterSpacing: '0.08em' }}>MENU TAKU AI</div>
            {[
              { label: '🎬 Mulai Presentasi',   cmd: 'mulai presentasi' },
              { label: '🛰️ Laporan Keliling',   cmd: 'berikan laporan kebun saya' },
              { label: 'Ke Dashboard',     cmd: 'pindah ke dashboard' },
              { label: 'Ke Kebun Saya',    cmd: 'pindah ke kebun saya' },
              { label: 'Ke Riwayat',       cmd: 'pindah ke riwayat' },
              { label: 'Kondisi Tanaman',  cmd: 'bagaimana kondisi tanaman saya' },
              { label: theme === 'dark' ? '☀️ Ubah ke Mode Terang' : '🌙 Ubah ke Mode Gelap', cmd: theme === 'dark' ? 'mode terang' : 'mode gelap' },
            ].map(({ label, cmd }) => (
              <button key={cmd} onClick={() => handleManualCommand(cmd)} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text)', width: '100%' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-pale, #E8FAF4)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                {label}
              </button>
            ))}
            {plants.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: '#9BB5AC', padding: '4px 10px 2px', fontWeight: 600, letterSpacing: '0.08em' }}>SIRAM TANAMAN</div>
                {plants.slice(0, 4).map((p) => (
                  <button key={p.id} onClick={() => handleManualCommand(`siram ${p.name}`)} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text)', width: '100%' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-pale, #E8FAF4)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                    Siram {p.name}
                  </button>
                ))}
                <button onClick={() => handleManualCommand('siram semua tanaman')} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#1D9E75', fontWeight: 600, width: '100%' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-pale, #E8FAF4)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                  Siram Semua ({plants.length} tanaman)
                </button>
              </>
            )}
            <button onClick={() => { navigate('/taku'); setShowMenu(false); }} style={{ background: 'none', border: 'none', textAlign: 'left', padding: '7px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text)', width: '100%', marginTop: '2px', borderTop: '1px solid var(--color-border-soft, #EDF7F3)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-pale, #E8FAF4)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
              Buka riwayat chat
            </button>
          </div>
        )}

        {/* Tombol Taku AI Container with Sonar Rings */}
        <div style={{ position: 'relative' }}>
          {/* Taku Core: ring HUD yang selalu hidup (idle) dan berdenyut saat bicara */}
          <TakuCore phase={ph} pulse={tk.pulse} size={134} />
          {/* Sonar Rings saat aktif */}
          {isActive && (
            <>
              <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', border: `2px solid ${ringColor}`, opacity: 0, animation: 'taku-sonar 1.6s ease-out infinite', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', border: `2px solid ${ringColor}`, opacity: 0, animation: 'taku-sonar 1.6s ease-out 0.55s infinite', pointerEvents: 'none' }} />
            </>
          )}
          {!isActive && (
            <div style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', border: '1.5px solid rgba(29,158,117,0.3)', opacity: 0, animation: 'taku-sonar 3s ease-out infinite', pointerEvents: 'none' }} />
          )}

          {/* Tombol Taku AI dengan Logo Robot */}
          <button
            onClick={handleButtonClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            aria-label={buttonLabel}
            title={buttonLabel}
            className={`taku-button ${isListening ? 'is-listening' : isProcessing ? 'is-processing' : isSpeaking ? 'is-speaking' : ''}`}
          >
            <img src="/taku-ai-logo.png" alt="Taku AI" className="taku-logo" />

            {/* Spinner Overlay saat memproses */}
            {isProcessing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ animation: 'taku-spin 0.8s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                </svg>
              </div>
            )}
          </button>

          {/* Waveform Animasi Saat Berbicara atau Standby Monitoring */}
          {isSpeaking ? (
            <div className="taku-waveform" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          ) : !isActive ? (
            <div className="taku-waveform taku-idle-waveform" aria-hidden="true" style={{ opacity: 0.45, transform: 'translateX(-50%) scale(0.7)' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ animation: 'taku-wave 1.6s ease-in-out infinite alternate', animationDelay: `${i * 0.35}s`, background: '#22E4D0' }} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="taku-label-badge" style={{
          color: isListening ? '#3B8BF7' : isProcessing ? '#F5A623' : '#1D9E75',
          borderColor: isListening ? 'rgba(59,139,247,0.4)' : isProcessing ? 'rgba(245,166,35,0.4)' : 'rgba(29,158,117,0.3)',
        }}>
          {isListening ? 'Mendengar...' : isProcessing ? 'Memproses...' : isSpeaking ? 'Berbicara...' : 'TAKU AI'}
        </div>
      </div>
    </>
  );
}
