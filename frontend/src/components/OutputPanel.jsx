import React, { useCallback } from 'react'
import ImageCompare from './ImageCompare'

function OutputPanel({ result, isLoading, error, format, originalPreview, progress, mode }) {
  
  const handleDownload = useCallback(() => {
    if (!result) return
    
    const link = document.createElement('a')
    link.href = result
    link.download = `4xl-upscaled.${format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [result, format])

  if (isLoading) {
    const progressPct = progress?.progress != null ? Math.round(progress.progress * 100) : null
    const isLocal = mode === 'local'

    return (
      <div className="output-container loading">
        <div className="loader">
          <div className="loader-ring" />
          <p className="loader-text">
            {progress?.message || (isLocal ? 'Processing on your device...' : 'Processing with server...')}
          </p>
          {progressPct != null && (
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progressPct}%` }} />
            </div>
          )}
          <p className="loader-subtext">
            {isLocal
              ? 'Running locally — your image never leaves this device'
              : 'This may take up to 60 seconds'}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="output-container error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <p className="error-text">{error}</p>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="output-container has-result">
        <div className="result-image-container">
          {originalPreview ? (
            <ImageCompare originalSrc={originalPreview} resultSrc={result} />
          ) : (
            <img src={result} alt="Upscaled result" className="result-image" />
          )}
        </div>
        <button className="download-button" onClick={handleDownload}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
          <span>Download {format.toUpperCase()}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="output-container empty">
      <div className="empty-state">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="0" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <p className="empty-text">Enhanced image will appear here</p>
      </div>
    </div>
  )
}

export default OutputPanel
