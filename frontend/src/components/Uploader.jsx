import React, { useCallback, useRef, useState } from 'react'

function Uploader({ onImageSelect, preview, disabled }) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (disabled) return
    
    const file = e.dataTransfer.files[0]
    if (file && isValidImage(file)) {
      onImageSelect(file)
    }
  }, [disabled, onImageSelect])

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (file && isValidImage(file)) {
      onImageSelect(file)
    }
  }, [onImageSelect])

  const isValidImage = (file) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    return validTypes.includes(file.type)
  }

  return (
    <div 
      className={`uploader ${isDragging ? 'dragging' : ''} ${preview ? 'has-preview' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload image"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="file-input"
        disabled={disabled}
      />
      
      {preview ? (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="preview-image" />
          <div className="preview-overlay">
            <span>Click to replace</span>
          </div>
        </div>
      ) : (
        <div className="upload-prompt">
          <div className="upload-icon">
            <span className="material-symbols-outlined">cloud_upload</span>
          </div>
          <p className="upload-text">Drag Image Here</p>
          <p className="upload-subtext">or click to browse local volume</p>
          <div className="upload-formats">
            <span className="upload-format-badge">JPG</span>
            <span className="upload-format-badge">PNG</span>
            <span className="upload-format-badge">WebP</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default Uploader
