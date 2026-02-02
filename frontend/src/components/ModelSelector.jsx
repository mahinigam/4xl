import React from 'react'

const MODELS = [
  {
    id: 'RealESRGAN_x4plus',
    name: 'General',
    description: 'Best for photos & general images',
  },
  {
    id: 'RealESRNet_x4plus',
    name: 'Fast',
    description: 'Faster processing, good quality',
  },
  {
    id: 'RealESRGAN_x4plus_anime_6B',
    name: 'Anime',
    description: 'Optimized for anime & illustrations',
  },
]

function ModelSelector({ value, onChange, disabled }) {
  return (
    <div className="selector-group">
      <label className="selector-label">Model</label>
      <div className="model-options">
        {MODELS.map((model) => (
          <button
            key={model.id}
            className={`model-option ${value === model.id ? 'selected' : ''}`}
            onClick={() => onChange(model.id)}
            disabled={disabled}
            title={model.description}
          >
            <span className="model-name">{model.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default ModelSelector
