import React, { useCallback } from 'react'

function OutputPanel({ result, isLoading, error, format }) {
  
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
    return (
      <div className="output-container loading">
        <div className="loader">
          <div className="loader-ring" />
          <p className="loader-text">Processing with GPU...</p>
          <p className="loader-subtext">This may take up to 60 seconds</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="output-container error">
        <div className="error-content">
          <div className="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
            </svg>
          </div>
          <p className="error-text">{error}</p>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="output-container has-result">
        <div className="result-image-container">
          <img src={result} alt="Upscaled result" className="result-image" />
        </div>
        <button className="download-button" onClick={handleDownload}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 4v12m0 0l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
            <rect x="3" y="3" width="18" height="18" rx="2" />
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
