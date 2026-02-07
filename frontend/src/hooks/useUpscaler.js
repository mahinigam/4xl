import { useState, useCallback, useEffect, useRef } from 'react'
import { upscaleLocal, hasWebGPU, releaseSession } from './localInference'

// ---------------------------------------------------------------------------
// Server (Gradio) backend — used as fallback
// ---------------------------------------------------------------------------
const API_URL = import.meta.env.VITE_API_URL || '/api'

async function upscaleServer(imageFile, modelName, outputFormat) {
  // Step 1: Upload the file to Gradio's upload endpoint
  const formData = new FormData()
  formData.append('files', imageFile)

  const uploadResponse = await fetch(`${API_URL}/upload?upload_id=${Date.now()}`, {
    method: 'POST',
    body: formData,
  })
  if (!uploadResponse.ok) throw new Error('Failed to upload image')

  const uploadedFiles = await uploadResponse.json()
  if (!uploadedFiles || uploadedFiles.length === 0) {
    throw new Error('No file path returned from upload')
  }
  const filePath = uploadedFiles[0]

  // Step 2: Queue the upscale job
  const queueResponse = await fetch(`${API_URL}/call/upscale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [
        { path: filePath },
        modelName,
        outputFormat,
      ],
    }),
  })
  if (!queueResponse.ok) {
    const errText = await queueResponse.text()
    throw new Error(`API Error: ${errText}`)
  }

  const queueData = await queueResponse.json()
  const eventId = queueData.event_id
  if (!eventId) throw new Error('No event ID returned from API')

  // Step 3: Poll SSE result
  const resultResponse = await fetch(`${API_URL}/call/upscale/${eventId}`)
  if (!resultResponse.ok) throw new Error('Failed to get result')

  const resultText = await resultResponse.text()
  const lines = resultText.split('\n')
  let resultData = null
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.slice(6))
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
          resultData = parsed[0]
        }
      } catch { /* not JSON */ }
    }
  }
  if (!resultData) throw new Error('No result returned from upscaler')
  return resultData
}

// ---------------------------------------------------------------------------
// Hybrid hook
// ---------------------------------------------------------------------------

/**
 * Processing modes:
 *   'local'  — browser-side ONNX inference (WebGPU or WASM)
 *   'server' — HuggingFace backend via Gradio API
 */
export function useUpscaler() {
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('server')          // active processing mode
  const [progress, setProgress] = useState(null)       // { stage, message, progress?, provider? }
  const [localSupported, setLocalSupported] = useState(false)

  // Track whether a local-capable environment was detected
  const checkedRef = useRef(false)
  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    // Local mode is always possible (WASM fallback), but we prefer WebGPU
    hasWebGPU().then((gpu) => {
      setLocalSupported(true) // WASM always available
      if (gpu) setMode('local') // auto-prefer local when GPU exists
    })
  }, [])

  // ------ Upscale (hybrid) ------
  const upscale = useCallback(async (imageFile, modelName, outputFormat) => {
    setIsLoading(true)
    setError(null)
    setResult(null)
    setProgress(null)

    const tryLocal = mode === 'local'

    try {
      if (tryLocal) {
        // ---- Local path ----
        setProgress({ stage: 'loading', message: 'Preparing local AI engine...' })

        // Convert File → ImageBitmap
        const bitmap = await createImageBitmap(imageFile)

        const dataUri = await upscaleLocal(bitmap, modelName, outputFormat, (p) => {
          setProgress(p)
        })

        bitmap.close()
        setResult(dataUri)
        setProgress({ stage: 'done', message: 'Done (processed on your device)' })
      } else {
        // ---- Server path ----
        setProgress({ stage: 'processing', message: 'Uploading to server...' })
        const dataUri = await upscaleServer(imageFile, modelName, outputFormat)
        setResult(dataUri)
        setProgress({ stage: 'done', message: 'Done (processed on server)' })
      }
    } catch (err) {
      // If local fails, auto-fallback to server
      if (tryLocal) {
        console.warn('Local inference failed, falling back to server:', err.message)
        setProgress({ stage: 'processing', message: 'Local processing failed — using server...' })
        try {
          const dataUri = await upscaleServer(imageFile, modelName, outputFormat)
          setResult(dataUri)
          setProgress({ stage: 'done', message: 'Done (server fallback)' })
          return
        } catch (serverErr) {
          console.error('Server fallback also failed:', serverErr)
          setError('Both local and server processing failed. Please try again.')
          setProgress(null)
          return
        }
      }
      console.error('Upscale error:', err)
      setError(err.message || 'Failed to upscale image. Please try again.')
      setProgress(null)
    } finally {
      setIsLoading(false)
    }
  }, [mode])

  // ------ Reset ------
  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setIsLoading(false)
    setProgress(null)
  }, [])

  // ------ Toggle mode ------
  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'local' ? 'server' : 'local'))
  }, [])

  // ------ Cleanup on unmount ------
  useEffect(() => {
    return () => releaseSession()
  }, [])

  return {
    upscale,
    result,
    isLoading,
    error,
    reset,
    mode,
    setMode,
    toggleMode,
    progress,
    localSupported,
  }
}
