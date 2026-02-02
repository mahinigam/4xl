import { useState, useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860'

export function useUpscaler() {
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const upscale = useCallback(async (imageFile, modelName, outputFormat) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      // Convert image to base64 data URL
      const base64Image = await fileToBase64(imageFile)
      
      // Gradio 4.x API format - use /call endpoint for named API
      // First, queue the request
      const queueResponse = await fetch(`${API_URL}/call/upscale`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            base64Image,      // Image as base64 data URL
            modelName,        // Model selection
            outputFormat,     // Output format
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

      // Poll for result using SSE endpoint
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

// Helper: Convert File to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
