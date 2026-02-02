import React from 'react'

const FORMATS = [
  { id: 'png', name: 'PNG', description: 'Lossless, best quality' },
  { id: 'jpeg', name: 'JPEG', description: 'Smaller file size' },
  { id: 'webp', name: 'WebP', description: 'Modern format, good compression' },
]

function FormatSelector({ value, onChange, disabled }) {
  return (
    <div className="selector-group">
      <label className="selector-label">Output Format</label>
      <div className="format-options">
        {FORMATS.map((format) => (
          <button
            key={format.id}
            className={`format-option ${value === format.id ? 'selected' : ''}`}
            onClick={() => onChange(format.id)}
            disabled={disabled}
            title={format.description}
          >
            <span className="format-name">{format.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default FormatSelector
