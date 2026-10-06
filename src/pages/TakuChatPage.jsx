import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';
import { chatTakuApi, fetchChatHistoryApi } from '../services/plantService';
import '../css/app.css';

// Formatter sederhana untuk merender teks dari AI (bold, list, bullet points, line breaks)
function FormattedAiMessage({ text }) {
  if (!text) return null;

  // Split lines
  const lines = text.split('\n');
  return (
    <div className="taku-ai-content" style={{ lineHeight: 1.65, fontSize: '0.93rem' }}>
      {lines.map((line, idx) => {
        // Bullet list item
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || line.trim().startsWith('• ')) {
          const content = line.trim().replace(/^[-*•]\s+/, '');
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'flex-start' }}>
              <span style={{ color: '#1D9E75', fontWeight: 800, marginTop: '2px' }}>•</span>
              <div>{renderBoldText(content)}</div>
            </div>
          );
        }
        // Numbered list item
        const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'flex-start' }}>
              <span style={{ color: '#1D9E75', fontWeight: 700, minWidth: '18px' }}>{numMatch[1]}.</span>
              <div>{renderBoldText(numMatch[2])}</div>
            </div>
          );
        }
        // Empty line
        if (!line.trim()) {
          return <div key={idx} style={{ height: '8px' }} />;
        }
        // Normal paragraph
        return (
          <p key={idx} style={{ margin: '0 0 6px' }}>
            {renderBoldText(line)}
          </p>
        );
      })}
    </div>
  );
}

// Helper merender bold text (**text**)
function renderBoldText(str) {
  const parts = str.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: 'inherit', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function TakuChatPage() {
  const { plants, showToast, theme } = useApp();
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load chat history when selected plant changes
  const loadHistory = async (plantId) => {
    setLoadingHistory(true);
    try {
      const history = await fetchChatHistoryApi(plantId || null);
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        // Welcome message from Taku
        setMessages([
          {
            id: 'welcome-msg',
            role: 'assistant',
            content: `Halo! Saya Taku, asisten AI cerdas untuk kebun Tanamanku 🌱\n\nSaya siap membantu mendiagnosa penyakit daun, memantau tingkat kelembaban tanah, memberikan jadwal penyiraman presisi, hingga rekomendasi nutrisi terbaik untuk tanamanmu.\n\nAda yang bisa saya bantu hari ini?`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Gagal memuat riwayat chat:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory(selectedPlantId);
  }, [selectedPlantId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText : inputMessage;
    if (!textToSend || !textToSend.trim() || sending) return;

    const userText = textToSend.trim();
    setInputMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Append user message immediately
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      const res = await chatTakuApi(userText, selectedPlantId || null);
      const aiReplyMsg = {
        id: `reply-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiReplyMsg]);
    } catch (err) {
      showToast(err.message || 'Gagal berkomunikasi dengan Taku AI', 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Maaf, terjadi kendala saat menghubungi server AI. Silakan periksa koneksi internet Anda atau coba ajukan pertanyaan kembali beberapa saat lagi.',
          created_at: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaInput = (e) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Teks jawaban disalin ke clipboard! 📋', 'success');
  };

  const quickPrompts = [
    { icon: '📊', text: 'Bagaimana analisis kondisi tanaman saya hari ini?' },
    { icon: '💧', text: 'Berapa persen kelembaban ideal & kapan waktu siram?' },
    { icon: '🍂', text: 'Apa penyebab daun menguning dan bagaimana solusinya?' },
    { icon: '🐛', text: 'Cara alami membasmi kutu putih dan hama tanaman?' },
    { icon: '🌱', text: 'Kapan waktu pemupukan yang paling tepat?' },
  ];

  const selectedPlant = plants.find((p) => p.id === selectedPlantId);

  return (
    <Layout title="Tanya Taku AI">
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 130px)',
          minHeight: '560px',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 16px 48px rgba(15, 110, 86, 0.12)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-card, #FFFFFF)',
          position: 'relative',
        }}
      >
        {/* Header Bar: Taku AI Identity & Plant Context Selector */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(29, 158, 117, 0.08) 0%, rgba(15, 110, 86, 0.03) 100%)',
            borderBottom: '1px solid var(--color-border)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Logo & Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                position: 'relative',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #DCF7EC, #B2F0D8)',
                border: '2px solid #1D9E75',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                boxShadow: '0 6px 16px rgba(29,158,117,0.25)',
              }}
            >
              <img
                src="/taku-ai-logo.png"
                alt="Taku AI Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: '0px',
                  right: '0px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  border: '2px solid #FFFFFF',
                  boxShadow: '0 0 8px #22C55E',
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--color-text)' }}>
                  Taku AI Assistant
                </h2>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '20px',
                    background: 'rgba(29, 158, 117, 0.15)',
                    color: '#1D9E75',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  Online • GPT-Agronomy
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                Konsultasi agronomis cerdas & panduan perawatan 24/7
              </p>
            </div>
          </div>

          {/* Plant Context Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-sub)', fontWeight: 600 }}>
              Fokus Tanaman:
            </span>
            <select
              className="form-input form-select"
              value={selectedPlantId}
              onChange={(e) => setSelectedPlantId(e.target.value)}
              style={{
                padding: '7px 14px',
                fontSize: '0.84rem',
                borderRadius: '12px',
                minWidth: '180px',
                fontWeight: 600,
                background: 'var(--color-card)',
              }}
            >
              <option value="">🌱 Semua Tanaman (Umum)</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji || '🌿'} {p.name} {p.varietas ? `(${p.varietas})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Chat Messages Body */}
        <div
          style={{
            flex: 1,
            background: theme === 'dark' ? '#0D1A15' : '#F7FAF8',
            padding: '24px 20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {loadingHistory ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--color-text-muted)' }}>
              <span
                className="spinner"
                style={{
                  width: '32px',
                  height: '32px',
                  borderColor: 'var(--color-border)',
                  borderTopColor: '#1D9E75',
                  margin: '0 auto 12px',
                }}
              />
              <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>Memuat riwayat konsultasi Taku AI...</p>
            </div>
          ) : (
            messages.map((m, index) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id || index}
                  style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: '12px',
                    maxWidth: isUser ? '78%' : '84%',
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    animation: 'card-float-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
                  }}
                >
                  {/* Avatar Taku */}
                  {!isUser && (
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #DCF7EC, #B2F0D8)',
                        border: '1.5px solid #1D9E75',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '3px',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(29,158,117,0.2)',
                      }}
                    >
                      <img
                        src="/taku-ai-logo.png"
                        alt="Taku AI"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  )}

                  {/* Message Bubble Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    <div
                      style={{
                        padding: '14px 18px',
                        borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                        background: isUser
                          ? 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)'
                          : theme === 'dark'
                          ? '#14241E'
                          : '#FFFFFF',
                        color: isUser ? '#FFFFFF' : 'var(--color-text)',
                        border: isUser ? 'none' : '1px solid var(--color-border)',
                        boxShadow: isUser
                          ? '0 6px 20px rgba(29, 158, 117, 0.3)'
                          : '0 4px 18px rgba(0,0,0,0.05)',
                        position: 'relative',
                        wordBreak: 'break-word',
                      }}
                    >
                      {!isUser ? (
                        <FormattedAiMessage text={m.content} />
                      ) : (
                        <div style={{ lineHeight: 1.6, fontSize: '0.93rem', whiteSpace: 'pre-wrap' }}>
                          {m.content}
                        </div>
                      )}

                      {/* Tool chip on AI message */}
                      {!isUser && !m.isError && (
                        <div
                          style={{
                            marginTop: '10px',
                            paddingTop: '8px',
                            borderTop: '1px solid var(--color-border-soft, rgba(0,0,0,0.06))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '12px',
                          }}
                        >
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            🤖 Taku AI Agronomist
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(m.content)}
                            title="Salin jawaban"
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: '2px 6px',
                              cursor: 'pointer',
                              color: '#1D9E75',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '6px',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(29,158,117,0.1)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Salin
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-text-muted)',
                        marginTop: '5px',
                        padding: '0 4px',
                      }}
                    >
                      {m.created_at
                        ? new Date(m.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing indicator */}
          {sending && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                alignSelf: 'flex-start',
                animation: 'card-float-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #DCF7EC, #B2F0D8)',
                  border: '1.5px solid #1D9E75',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3px',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(29,158,117,0.2)',
                  animation: 'taku-breathe 3s ease-in-out infinite',
                }}
              >
                <img
                  src="/taku-ai-logo.png"
                  alt="Taku AI"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </div>
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: '20px 20px 20px 4px',
                  background: theme === 'dark' ? '#14241E' : '#FFFFFF',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#1D9E75',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#1D9E75',
                      animation: 'typing-bounce 1.2s infinite 0s',
                    }}
                  />
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#1D9E75',
                      animation: 'typing-bounce 1.2s infinite 0.15s',
                    }}
                  />
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#1D9E75',
                      animation: 'typing-bounce 1.2s infinite 0.3s',
                    }}
                  />
                </span>
                Taku sedang menganalisis & menyusun jawaban...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div
          style={{
            background: 'var(--color-card, #FFFFFF)',
            padding: '10px 18px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none',
          }}
        >
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              type="button"
              className="interactive-tap"
              onClick={() => handleSendMessage(p.text)}
              disabled={sending}
              style={{
                background: theme === 'dark' ? '#14241E' : '#F0F9F5',
                border: '1px solid var(--color-border)',
                borderRadius: '9999px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                cursor: sending ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0,
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                if (!sending) {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.025)';
                  e.currentTarget.style.borderColor = '#1D9E75';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(29,158,117,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span>{p.icon}</span>
              <span>{p.text}</span>
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div
          style={{
            background: 'var(--color-card, #FFFFFF)',
            padding: '14px 18px 18px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-end',
          }}
        >
          <div
            data-taku="chat-input"
            style={{
              flex: 1,
              background: theme === 'dark' ? '#0D1A15' : '#F6FAF8',
              border: '1.5px solid var(--color-border)',
              borderRadius: '16px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#1D9E75')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan masalah daun, dosis pupuk, kelembaban, dll... (Enter kirim)"
              rows={1}
              style={{
                flex: 1,
                padding: '6px 0',
                background: 'transparent',
                border: 'none',
                fontSize: '0.92rem',
                lineHeight: 1.5,
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                color: 'var(--color-text)',
                maxHeight: '120px',
              }}
            />
            {inputMessage && (
              <button
                type="button"
                onClick={() => setInputMessage('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '0.85rem',
                }}
                title="Hapus input"
              >
                ✕
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={sending || !inputMessage.trim()}
            className="btn btn-primary interactive-tap"
            style={{
              borderRadius: '14px',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              boxShadow: '0 6px 18px rgba(29, 158, 117, 0.35)',
              opacity: sending || !inputMessage.trim() ? 0.65 : 1,
              cursor: sending || !inputMessage.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? (
              <>
                <span
                  className="spinner"
                  style={{
                    width: '16px',
                    height: '16px',
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                  }}
                />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Kirim</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
}
