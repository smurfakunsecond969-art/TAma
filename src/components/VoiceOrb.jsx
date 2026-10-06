import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { waterPlantApi } from '../services/plantService';
import { speakText } from '../services/takuAiService';

export default function VoiceOrb() {
  const { plants, showToast, loadPlants } = useApp();
  const [isListening, setIsListening] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [showManualMenu, setShowManualMenu] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Cek kompatibilitas Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.lang = 'id-ID';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setIsListening(true);
      speakText("Saya mendengarkan.");
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        showToast('Akses mikrofon ditolak. Menggunakan menu manual.', 'warning');
        setSpeechSupported(false);
        setShowManualMenu(true);
      } else {
        showToast('Gagal mengenali suara, silakan coba lagi.', 'error');
      }
    };

    rec.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log('Voice Command received:', transcript);
      showToast(`Mendengar: "${transcript}"`, 'info');
      await handleVoiceCommand(transcript);
    };

    recognitionRef.current = rec;
  }, [plants]);

  // Mencocokkan frasa suara
  const handleVoiceCommand = async (command) => {
    // 1. Kondisi Tanaman
    if (command.includes('kondisi tanaman') || command.includes('keadaan tanaman') || command.includes('status tanaman')) {
      const total = plants.length;
      const good = plants.filter((p) => p.status === 'good').length;
      const warning = plants.filter((p) => p.status === 'warning').length;
      
       let reply = `Tanaman Anda memiliki ${total} tanaman terdaftar. `;
      if (warning > 0) {
        reply += `${good} tanaman dalam kondisi baik, dan ${warning} tanaman butuh perhatian Anda.`;
      } else {
        reply += `Semua ${good} tanaman dalam kondisi sangat baik dan optimal.`;
      }

      speakText(reply);
      showToast(reply, 'success');
      return;
    }

    // 2. Perintah Siram
    if (command.includes('siram') || command.includes('siramlah')) {
      // Cari nama tanaman dalam command
      const targetPlant = plants.find((p) => {
        const nameLower = p.name.toLowerCase();
        const typeLower = p.type.toLowerCase();
        // Cek kecocokan nama atau jenis tanaman (misal "durian" cocok dengan "Durian Black Thorn #1")
        return command.includes(nameLower) || command.includes(typeLower) || 
               nameLower.split(' ').some(word => word.length > 2 && command.includes(word));
      });

      if (targetPlant) {
        speakText(`Baik, perintah menyiram ${targetPlant.name} telah diterima.`);
        try {
          await waterPlantApi(targetPlant.id);
          showToast(`💧 ${targetPlant.name} disiram via asisten suara`, 'success');
          await loadPlants();
        } catch (err) {
          showToast(`Gagal menyiram: ${err.message}`, 'error');
        }
      } else {
        const reply = "Maaf, saya tidak menemukan nama tanaman tersebut di kebun Anda.";
        speakText(reply);
        showToast(reply, 'warning');
      }
      return;
    }

    // 3. Perintah Stop
    if (command.includes('hentikan') || command.includes('stop') || command.includes('selesai')) {
      const reply = "Baik, penyiraman dihentikan.";
      speakText(reply);
      showToast(reply, 'info');
      return;
    }

    // Jika tidak ada perintah yang cocok
    const fallbackReply =           "Perintah tidak dikenali. Ucapkan 'siram' diikuti nama tanaman, atau 'kondisi tanaman'.";
    speakText(fallbackReply);
    showToast(fallbackReply, 'warning');
  };

  const handleOrbClick = () => {
    if (!speechSupported) {
      setShowManualMenu(!showManualMenu);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
        // Jika start gagal karena asinkron
        recognitionRef.current.stop();
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '80px', right: '24px', zIndex: 1001, fontFamily: 'var(--font-family)' }}>
      {/* Tooltip / Hint */}
      {showTooltip && !isListening && (
        <div style={{
          position: 'absolute', bottom: '70px', right: '0', background: 'var(--color-card)',
          color: 'var(--color-text)', padding: '12px', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)', width: '220px', fontSize: 'var(--font-size-xs)',
          border: '1px solid var(--color-border)', animation: 'slideUp 0.25s ease'
        }}>
          <p style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--color-primary)' }}>Asisten Suara Cerdas</p>
          <p style={{ color: 'var(--color-text-sub)', marginBottom: '8px' }}>Ucapkan perintah seperti:</p>
          <ul style={{ paddingLeft: '12px', listStyleType: 'disc', color: 'var(--color-text-sub)' }}>
            <li>"Siram Durian"</li>
                <li>"Kondisi tanaman"</li>
            <li>"Hentikan penyiraman"</li>
          </ul>
        </div>
      )}

      {/* Manual Dropdown Fallback */}
      {showManualMenu && (
        <div style={{
          position: 'absolute', bottom: '70px', right: '0', background: 'var(--color-card)',
          color: 'var(--color-text)', padding: '8px', borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)', width: '240px', border: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: '6px'
        }}>
          <div style={{ padding: '6px 8px', fontWeight: 700, fontSize: '12px', borderBottom: '1px solid var(--color-border-soft)' }}>
            Menu Pintasan Asisten
          </div>
          <button className="btn btn-ghost btn-xs w-full" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                 onClick={() => handleVoiceCommand("bagaimana kondisi tanaman")}>
            📢 Tanya Kondisi Tanaman
          </button>
          {plants.map((p) => (
            <button key={p.id} className="btn btn-ghost btn-xs w-full" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
              onClick={() => handleVoiceCommand(`siram ${p.name}`)}>
              💧 Siram {p.name}
            </button>
          ))}
        </div>
      )}

      {/* The Floating Orb */}
      <button
        onClick={handleOrbClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: isListening ? 'var(--color-info)' : 'var(--color-primary)',
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isListening ? '0 0 20px rgba(59,139,247,0.6)' : 'var(--shadow-lg)',
          cursor: 'pointer', border: 'none', position: 'relative',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        className={isListening ? '' : 'pulse-breathe'}
        aria-label="Asisten Suara"
      >
        {/* Sonar rings when listening */}
        {isListening && (
          <>
            <div className="sonar-ring" style={{ inset: '-8px', borderColor: 'var(--color-info)', animationDuration: '1.5s' }}></div>
            <div className="sonar-ring" style={{ inset: '-16px', borderColor: 'var(--color-info)', animationDuration: '1.5s', animationDelay: '0.5s' }}></div>
          </>
        )}

        {/* Sonar rings when idle */}
        {!isListening && (
          <div className="sonar-ring" style={{ inset: '-8px', opacity: 0.4 }}></div>
        )}

        {/* Icon */}
        {isListening ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="4" y="9" width="3" height="6" rx="1.5" />
            <rect x="10" y="5" width="3" height="14" rx="1.5" />
            <rect x="16" y="9" width="3" height="6" rx="1.5" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
        )}
      </button>
    </div>
  );
}
