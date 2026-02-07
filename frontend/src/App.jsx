import React, { useState, useCallback } from 'react'
import Uploader from './components/Uploader'
import OutputPanel from './components/OutputPanel'
import ModelSelector from './components/ModelSelector'
import FormatSelector from './components/FormatSelector'
import Button from './components/ui/Button'
import GlassPanel from './components/ui/GlassPanel'
import { useUpscaler } from './hooks/useUpscaler'

function App() {
  const [inputImage, setInputImage] = useState(null)
  const [inputPreview, setInputPreview] = useState(null)
  const [model, setModel] = useState('RealESRGAN_x4plus')
  const [format, setFormat] = useState('png')
  
  const { upscale, result, isLoading, error, reset } = useUpscaler()

  const handleImageSelect = useCallback((file) => {
    setInputImage(file)
    setInputPreview(URL.createObjectURL(file))
    reset()
  }, [reset])

  const handleUpscale = useCallback(async () => {
    if (!inputImage) return
    await upscale(inputImage, model, format)
  }, [inputImage, model, format, upscale])

  const handleClear = useCallback(() => {
    setInputImage(null)
    setInputPreview(null)
    reset()
  }, [reset])

  return (
    <div className="app-container">
      {/* Watercolor background layers */}
      <div className="watercolor-bg" aria-hidden="true">
        <div className="peacock-plume" />
        <div className="watercolor-layer layer-1" />
        <div className="watercolor-layer layer-2" />
        <div className="watercolor-layer layer-3" />
        <div className="glassy-sheen" />
        <div className="micro-refraction" />
      </div>

      {/* Film grain overlay */}
      <div className="film-grain" aria-hidden="true" />

      <main className="main-content">
        {/* Header */}
        <header className="header">
          <h1 className="logo">
            <span className="logo-4">4</span>
            <span className="logo-xl">XL</span>
          </h1>
        </header>

        {/* Main interface */}
        <div className="interface-grid">
          {/* Input Panel */}
          <GlassPanel className="panel-input">
            <h2 className="panel-title">Input</h2>
            <Uploader 
              onImageSelect={handleImageSelect}
              preview={inputPreview}
              disabled={isLoading}
            />
            {inputPreview && (
              <p className="image-info">
                Max input: 1024×1024px • Output: 4× upscaled
              </p>
            )}
          </GlassPanel>

          {/* Output Panel */}
          <GlassPanel className="panel-output">
            <h2 className="panel-title">Output</h2>
            <OutputPanel 
              result={result}
              isLoading={isLoading}
              error={error}
              format={format}
              originalPreview={inputPreview}
            />
          </GlassPanel>
        </div>

        {/* Controls */}
        <GlassPanel className="controls-panel">
          <div className="controls-grid">
            <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
            <FormatSelector value={format} onChange={setFormat} disabled={isLoading} />
          </div>
          
          <div className="actions">
            <Button 
              variant="secondary" 
              onClick={handleClear}
              disabled={isLoading || !inputImage}
            >
              Clear
            </Button>
            <Button 
              variant="primary" 
              onClick={handleUpscale}
              disabled={isLoading || !inputImage}
              loading={isLoading}
            >
              {isLoading ? 'Enhancing...' : 'Enhance'}
            </Button>
          </div>
        </GlassPanel>

        {/* Footer */}
        <footer className="footer">
          <p>Your images are processed securely and never stored.</p>
          <p className="footer-links">
            <a href="https://github.com/mahinigam/4xl" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <span className="separator">•</span>
            <span>Powered by Real-ESRGAN</span>
          </p>
        </footer>
      </main>
    </div>
  )
}

export default App
