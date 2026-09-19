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
  
  const { upscale, result, isLoading, error, reset, mode, toggleMode, progress, provider } = useUpscaler()

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
      {/* Classic Macintosh Top Menu Bar */}
      <header className="mac-menubar">
        <div className="menubar-left">
          <nav className="menubar-nav">
            <span className="active">4XL</span>
          </nav>
        </div>
        <div className="menubar-right">
          <div className="menubar-badge">
            <span className="pulse-dot" />
            <span>Neural Upscaler</span>
          </div>
        </div>
      </header>

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
          <GlassPanel className="panel-input" title="Input">
            <div className="window-body">
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
            </div>
          </GlassPanel>

          {/* Output Panel */}
          <GlassPanel className="panel-output" title="Output">
            <div className="window-body">
              <h2 className="panel-title">Output</h2>
              <OutputPanel 
                result={result}
                isLoading={isLoading}
                error={error}
                format={format}
                originalPreview={inputPreview}
                progress={progress}
                mode={mode}
              />
            </div>
          </GlassPanel>
        </div>

        {/* Controls */}
        <GlassPanel className="controls-panel" title="Controls">
          <div className="window-body">
            <div className="controls-grid">
              <ModelSelector value={model} onChange={setModel} disabled={isLoading} />
              <FormatSelector value={format} onChange={setFormat} disabled={isLoading} />
              <div className="selector-group">
                <label className="selector-label">Processing</label>
                <button
                  className={`mode-toggle ${mode}`}
                  onClick={toggleMode}
                  disabled={isLoading}
                  title={mode === 'local'
                    ? `Running on your device (${provider === 'webgpu' ? 'WebGPU' : 'WASM'})`
                    : 'Running on remote server'}
                >
                  <span className="mode-indicator" />
                  <span className="mode-label">
                    {mode === 'local' ? 'Your Device' : 'Server'}
                  </span>
                  <span className={`provider-badge ${mode === 'local' ? provider : 'cloud'}`}>
                    {mode === 'local'
                      ? (provider === 'webgpu' ? 'GPU' : 'CPU')
                      : 'Cloud'}
                  </span>
                </button>
              </div>
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
          </div>
        </GlassPanel>

      </main>

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
    </div>
  )
}

export default App
