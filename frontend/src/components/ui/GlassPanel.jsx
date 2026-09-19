import React from 'react'

function GlassPanel({ children, className = '', title = '', ...props }) {
  return (
    <div className={`glass-panel ${className}`} {...props}>
      {/* Macintosh Window Titlebar */}
      <div className="window-titlebar">
        <div className="window-close-box" />
        <div className="window-title-pill">
          <span className="window-title-dot" />
          <span>{title || '4XL'}</span>
        </div>
        <div className="window-zoom-box">
          <div className="window-zoom-inner" />
        </div>
      </div>
      {children}
    </div>
  )
}

export default GlassPanel
