import { useState, useCallback } from 'react'

// In production: /api → proxied through nginx to backend's /gradio_api/
// In local dev: http://localhost:7860/gradio_api (direct to Gradio 5.x backend)
const API_URL = import.meta.env.VITE_API_URL || '/api'

export function useUpscaler() {
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const upscale = useCallback(async (imageFile, modelName, outputFormat) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Step 1: Upload the file to Gradio's upload endpoint
      const formData = new FormData()
      formData.append('files', imageFile)
      
      const uploadResponse = await fetch(`${API_URL}/upload?upload_id=${Date.now()}`, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }

      const uploadedFiles = await uploadResponse.json()
      if (!uploadedFiles || uploadedFiles.length === 0) {
        throw new Error('No file path returned from upload')
      }

      // Gradio returns array of file paths
      const filePath = uploadedFiles[0]

      // Step 2: Call the API with the uploaded file reference
      // Gradio 4.x expects image as { path: "...", ... } object
      const queueResponse = await fetch(`${API_URL}/call/upscale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            { path: filePath },  // Image as FileData object
            modelName,           // Model selection
            outputFormat,        // Output format
          ],
        }),
      })

      if (!queueResponse.ok) {
        const errText = await queueResponse.text()
        throw new Error(`API Error: ${errText}`)
      }

      const queueData = await queueResponse.json()
      const eventId = queueData.event_id

      if (!eventId) {
        throw new Error('No event ID returned from API')
      }

      // Step 3: Poll for result using SSE endpoint
      const resultResponse = await fetch(`${API_URL}/call/upscale/${eventId}`)
      
      if (!resultResponse.ok) {
        throw new Error('Failed to get result')
      }

      // Parse SSE response
      const resultText = await resultResponse.text()
      const lines = resultText.split('\n')
      
      let resultData = null
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const jsonStr = line.slice(6)
            const parsed = JSON.parse(jsonStr)
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              resultData = parsed[0]
            }
          } catch {
            // Not JSON, continue
          }
        }
      }

      if (!resultData) {
        throw new Error('No result returned from upscaler')
      }

      setResult(resultData)
    } catch (err) {
      console.error('Upscale error:', err)
      setError(err.message || 'Failed to upscale image. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    upscale,
    result,
    isLoading,
    error,
    reset,
  }
}
