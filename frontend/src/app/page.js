'use client';

import React, { useState, useRef, useEffect } from 'react';

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

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
      
      // Match canvas dimensions to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Mirror horizontal for capturing to match the mirror preview
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      
      // Draw frame
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Reset transformation
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
                if (!cameraActive && !image) fileInputRef.current?.click();
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
                    <p style={{ fontWeight: 500 }}>Click to browse or drop an image</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Supports PNG, JPG, JPEG
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Row for Camera/File */}
          <div className="btn-row">
            {!cameraActive ? (
              <button className="btn btn-secondary" onClick={startCamera}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                </svg>
                Use Camera
              </button>
            ) : (
              <button className="btn btn-primary" onClick={capturePhoto}>
                Capture Snap
              </button>
            )}

            <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
              Choose File
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleFileUpload} 
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
                AI is extracting & speaking...
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
            <div style={{ color: 'var(--error)', fontSize: '0.9rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
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
              <p style={{ fontWeight: 500 }}>No audio generated yet</p>
              <p style={{ fontSize: '0.8rem', width: '80%' }}>
                Provide an image and request extraction to synthesize your custom practice file.
              </p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <>
              {/* Audio player card */}
              {audioUrl && (
                <div className="audio-player-container">
                  <div className="audio-info">
                    <span style={{ fontSize: '1.2rem' }}>🎧</span>
                    <div>
                      <p style={{ fontWeight: 600 }}>Stitched MP3 Guide</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {readAlong ? "Read-Along Mode Enabled (+ duration + 1s gaps)" : "Normal Mode Enabled (1s gaps)"}
                      </p>
                    </div>
                  </div>
                  
                  <audio controls src={audioUrl} className="audio-controls" key={audioUrl}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {/* List of elements */}
              <div className="form-group">
                <span className="form-label">Extracted Items ({items.length})</span>
                <div className="word-list">
                  {items.map((item, index) => (
                    <div className="word-item" key={index}>
                      <span className="word-text">{item.text}</span>
                      <span className="word-badge">{item.language}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
