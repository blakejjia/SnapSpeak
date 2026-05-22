'use client';

import React, { useState, useRef, useEffect } from 'react';

// Client-side text-to-speech speaker helper using Web Speech API
const speakText = (text, lang) => {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    
    const langCodeMap = {
      'en': 'en-US',
      'zh': 'zh-CN',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'fr': 'fr-FR',
      'es': 'es-ES',
      'de': 'de-DE',
      'ru': 'ru-RU',
      'it': 'it-IT'
    };
    
    const targetLang = langCodeMap[lang.toLowerCase()] || lang;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    
    // Find voice matching language code
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(voice => 
      voice.lang.toLowerCase().includes(targetLang.toLowerCase()) || 
      voice.lang.toLowerCase().startsWith(lang.toLowerCase())
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  }
};

export default function Home() {
  const [image, setImage] = useState(null); // base64 representation
  const [prompt, setPrompt] = useState('Extract all vocabulary words and sentences from this image.');
  const [readAlong, setReadAlong] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [audioUrl, setAudioUrl] = useState(null);
  
  // Camera state and refs
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Custom Audio Player State & Refs
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPrompt = localStorage.getItem('pic_reader_prompt');
      if (savedPrompt !== null) {
        setPrompt(savedPrompt);
      }
      const savedReadAlong = localStorage.getItem('pic_reader_read_along');
      if (savedReadAlong !== null) {
        setReadAlong(savedReadAlong === 'true');
      }
    }
  }, []);

  // Save prompt to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pic_reader_prompt', prompt);
    }
  }, [prompt]);

  // Save read_along to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('pic_reader_read_along', readAlong.toString());
    }
  }, [readAlong]);

  // Reset audio player state when audioUrl changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioUrl]);

  // Audio actions
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Audio playback error:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = clickX / width;
    const newTime = clickPercentage * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = Math.floor(secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startCamera = async () => {
    setError(null);
    setImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Unable to access camera. Please check permissions or upload a picture instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      context.setTransform(1, 0, 0, 1, 0, 0);
      
      const base64Data = canvas.toDataURL('image/jpeg');
      setImage(base64Data);
      stopCamera();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setError(null);
      stopCamera();
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.onerror = () => {
        setError("Error reading file.");
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImage(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProcess = async () => {
    if (!image) {
      setError("Please capture or upload an image first.");
      return;
    }

    setLoading(true);
    setError(null);
    setItems([]);
    setAudioUrl(null);

    try {
      const response = await fetch('/api/process-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image,
          prompt,
          read_along: readAlong
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Server responded with an error.");
      }

      const data = await response.json();
      setItems(data.items);
      setAudioUrl(data.audio_url);
    } catch (err) {
      console.error("Processing failed:", err);
      setError(err.message || "Failed to process the image and generate audio.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Background Mesh Glow Elements */}
      <div className="mesh-glow mesh-glow-1" />
      <div className="mesh-glow mesh-glow-2" />
      <div className="mesh-glow mesh-glow-3" />

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="logo-section">
            <span className="logo-icon" role="img" aria-label="microphone">🎙️</span>
            <div>
              <h1 className="logo-text">Pic-Reader</h1>
              <p className="subtitle">Multilingual Picture to Voice Synthesizer</p>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="main-grid">
          
          {/* Left column: Input parameters & Image Capture */}
          <section className="glass-panel">
            <h2 className="panel-title">Source Image & Setup</h2>
            
            {/* Capture Box */}
            <div className="form-group">
              <span className="form-label">Input Picture</span>
              
              <div 
                className="capture-box" 
                onClick={() => {
                  if (!cameraActive && !image && !loading) fileInputRef.current?.click();
                }}
              >
                {/* Camera Active View */}
                {cameraActive && (
                  <div className="preview-container">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="webcam-video"
                    />
                    <button 
                      className="remove-preview-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        stopCamera();
                      }}
                      title="Close Camera"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Captured / Uploaded Image View */}
                {image && (
                  <div className="preview-container">
                    <img src={image} alt="Preview" className="preview-img" />
                    <button 
                      className="remove-preview-btn" 
                      onClick={(e) => {
                        e.stopPropagation();
                        clearImage();
                      }}
                      title="Remove Image"
                      disabled={loading}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Default view */}
                {!cameraActive && !image && (
                  <>
                    <svg className="capture-icon" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                    <div>
                      <p style={{ fontWeight: 600 }}>Click to browse or drop an image</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Supports PNG, JPG, JPEG
                      </p>
                    </div>
                  </>
                )}

                {/* Laser scan line overlay when loading */}
                {loading && (
                  <div className="scanner-overlay" onClick={(e) => e.stopPropagation()}>
                    <div className="scanner-line" />
                    <span className="spinner" />
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>Analyzing Image...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Row for Camera/File */}
            <div className="btn-row">
              {!cameraActive ? (
                <button 
                  className="btn btn-secondary" 
                  onClick={startCamera}
                  disabled={loading}
                >
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  </svg>
                  Use Camera
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  onClick={capturePhoto}
                  disabled={loading}
                >
                  Capture Snap
                </button>
              )}

              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Choose File
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleFileUpload} 
                disabled={loading}
              />
            </div>

            {/* User OCR Prompt Instructions */}
            <div className="form-group">
              <label className="form-label">AI Extraction Request / Prompt</label>
              <textarea
                className="input-textarea"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Extract words and translate. Make sure to specify what words you want."
                disabled={loading}
              />
            </div>

            {/* Settings: Read Along Toggle */}
            <div className="settings-bar">
              <div className="toggle-info">
                <span className="toggle-title">Enable Follow-Along Mode (跟读)</span>
                <span className="toggle-desc">Adds a pause equal to the audio duration + 1s between items for repeating.</span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={readAlong}
                  onChange={(e) => setReadAlong(e.target.checked)}
                  disabled={loading}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Hidden Canvas for capturing camera frame */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Submit Trigger */}
            <button 
              className="btn btn-primary" 
              onClick={handleProcess} 
              disabled={loading || !image}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
                  Extracting & Synthesizing...
                </>
              ) : (
                <>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                  </svg>
                  Process & Generate Voice
                </>
              )}
            </button>

            {/* General Errors banner */}
            {error && (
              <div style={{ color: 'var(--error)', fontSize: '0.9rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.22)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                {error}
              </div>
            )}
          </section>

          {/* Right column: Results & Player */}
          <section className="glass-panel">
            <h2 className="panel-title">Extracted Output</h2>
            
            {loading && (
              <div className="loading-box">
                <div className="spinner"></div>
                <p style={{ color: 'var(--text-secondary)' }}>OCR-ing, parsing languages, and generating TTS...</p>
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="empty-state">
                <span className="empty-icon">📝</span>
                <p style={{ fontWeight: 600, color: '#fff' }}>No audio generated yet</p>
                <p style={{ fontSize: '0.8rem', width: '80%' }}>
                  Provide an image and request extraction to synthesize your custom practice file.
                </p>
              </div>
            )}

            {!loading && items.length > 0 && (
              <>
                {/* Audio player card */}
                {audioUrl && (
                  <div className="audio-deck">
                    <div className="audio-deck-header">
                      <div className="audio-deck-title">
                        <span className={`audio-deck-pulse ${isPlaying ? '' : 'paused'}`}></span>
                        <span>Stitched Voice Guide</span>
                      </div>
                      <span className="audio-deck-badge">
                        {readAlong ? "跟读模式 (+ gap)" : "标准模式"}
                      </span>
                    </div>
                    
                    <div className="audio-controls-row">
                      <button className="audio-play-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                        {isPlaying ? (
                          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: '2px' }}>
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      
                      <a 
                        href={audioUrl} 
                        download 
                        className="audio-download-btn" 
                        title="Download Audio"
                        aria-label="Download Audio"
                      >
                        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </a>
                      
                      <div className="audio-timeline-container">
                        <div className="audio-progress-bar-bg" onClick={handleProgressClick}>
                          <div 
                            className="audio-progress-bar-fill" 
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                          >
                            <div className="audio-progress-handle"></div>
                          </div>
                        </div>
                        
                        <div className="audio-timeline-times">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <audio 
                      ref={audioRef}
                      src={audioUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={handleAudioEnded}
                      style={{ display: 'none' }}
                      key={audioUrl}
                    />
                  </div>
                )}

                {/* Grid of Zperiod element-like items */}
                <div className="form-group">
                  <span className="form-label">Extracted Elements ({items.length})</span>
                  
                  <div className="element-grid">
                    {items.map((item, index) => {
                      const langClass = `lang-${item.language.toLowerCase()}`;
                      const isLong = item.text.length > 20;
                      const cardNumber = (index + 1).toString().padStart(2, '0');
                      
                      return (
                        <div 
                          className={`element-card ${langClass}`} 
                          key={index}
                          style={{ animationDelay: `${index * 60}ms` }}
                        >
                          <div className="card-header">
                            <span className="card-number">{cardNumber}</span>
                            <span className="card-badge">{item.language}</span>
                          </div>
                          
                          <div className="card-body">
                            <p className={`card-text ${isLong ? 'long-text' : ''}`}>{item.text}</p>
                          </div>
                          
                          <div className="card-actions">
                            <button 
                              className="card-action-btn"
                              title="Read Aloud"
                              onClick={() => speakText(item.text, item.language)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                              </svg>
                            </button>
                            
                            <button 
                              className="card-action-btn"
                              title="Copy Text"
                              onClick={() => navigator.clipboard.writeText(item.text)}
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
