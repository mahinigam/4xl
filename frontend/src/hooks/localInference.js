/**
 * Local ONNX Runtime inference engine for Real-ESRGAN.
 *
 * Runs entirely in the user's browser via WebGPU (preferred) or WASM fallback.
 * Downloads the ONNX model once and caches it in the browser (Cache API).
 *
 * Supports tiling for large images to avoid GPU OOM.
 */
import * as ort from 'onnxruntime-web'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MODEL_BASE_URL =
  'https://huggingface.co/spaces/mahinigam/4xl-api/resolve/main/models'

const MODEL_FILES = {
  RealESRGAN_x4plus: 'RealESRGAN_x4plus.onnx',
  RealESRNet_x4plus: 'RealESRNet_x4plus.onnx',
  RealESRGAN_x4plus_anime_6B: 'RealESRGAN_x4plus_anime_6B.onnx',
}

const SCALE = 4
const TILE_SIZE = 192 // input tile pixels (output = 768)
const TILE_PAD = 16 // overlap padding to prevent seam artifacts
const CACHE_NAME = '4xl-onnx-models'

// ---------------------------------------------------------------------------
// Capability detection
// ---------------------------------------------------------------------------

/** Check if WebGPU is available in this browser. */
export async function hasWebGPU() {
  if (typeof navigator === 'undefined' || !navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return !!adapter
  } catch {
    return false
  }
}

/** Check if the browser can run local inference at all (WebGPU or WASM). */
export async function canRunLocally() {
  // WASM is always available in modern browsers,
  // but we need at least ~500 MB free memory for the model.
  // We'll attempt to load — if it fails, the hybrid hook falls back.
  return true
}

/**
 * Determine the best execution provider.
 * Priority: webgpu > wasm
 */
async function getBestProvider() {
  if (await hasWebGPU()) return 'webgpu'
  return 'wasm'
}

// ---------------------------------------------------------------------------
// Model caching (Cache API)
// ---------------------------------------------------------------------------

async function getCachedModel(url) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = await cache.match(url)
    if (response) return new Uint8Array(await response.arrayBuffer())
  } catch {
    // Cache API not available — fall through to network fetch
  }
  return null
}

async function cacheModel(url, data) {
  try {
    const cache = await caches.open(CACHE_NAME)
    const response = new Response(data, {
      headers: { 'Content-Type': 'application/octet-stream' },
    })
    await cache.put(url, response)
  } catch {
    // Silently fail — caching is optional
  }
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

let _session = null
let _sessionModel = null
let _sessionProvider = null

/**
 * Download (or retrieve from cache) and create an ONNX inference session.
 */
async function getSession(modelName, onProgress) {
  if (_session && _sessionModel === modelName) return _session

  // Dispose previous session
  if (_session) {
    try { _session.release() } catch { /* ignore */ }
    _session = null
    _sessionModel = null
  }

  const fileName = MODEL_FILES[modelName]
  if (!fileName) throw new Error(`Unknown model: ${modelName}`)
  const url = `${MODEL_BASE_URL}/${fileName}`

  // Try cache first
  onProgress?.({ stage: 'loading', message: 'Checking model cache...' })
  let modelData = await getCachedModel(url)

  if (!modelData) {
    // Download with progress
    onProgress?.({ stage: 'downloading', message: 'Downloading model...', progress: 0 })
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to download model: HTTP ${response.status}`)

    const contentLength = +response.headers.get('Content-Length') || 0
    const reader = response.body.getReader()
    const chunks = []
    let received = 0

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      if (contentLength) {
        onProgress?.({
          stage: 'downloading',
          message: `Downloading model... ${Math.round((received / contentLength) * 100)}%`,
          progress: received / contentLength,
        })
      }
    }

    modelData = new Uint8Array(received)
    let offset = 0
    for (const chunk of chunks) {
      modelData.set(chunk, offset)
      offset += chunk.length
    }

    // Cache for next time
    await cacheModel(url, modelData.slice())
    onProgress?.({ stage: 'downloading', message: 'Model cached for future use', progress: 1 })
  }

  // Create session
  onProgress?.({ stage: 'initializing', message: 'Initializing AI engine...' })
  const provider = await getBestProvider()

  const sessionOptions = {
    executionProviders: [provider],
    graphOptimizationLevel: 'all',
  }

  // For WASM, disable multi-threading (no SharedArrayBuffer in HF iframe)
  if (provider === 'wasm') {
    ort.env.wasm.numThreads = 1
    ort.env.wasm.simd = true
  }

  _session = await ort.InferenceSession.create(modelData.buffer, sessionOptions)
  _sessionModel = modelName
  _sessionProvider = provider

  onProgress?.({
    stage: 'ready',
    message: `Ready (${provider === 'webgpu' ? 'GPU' : 'CPU'})`,
    provider,
  })

  return _session
}

// ---------------------------------------------------------------------------
// Image ↔ Tensor utilities
// ---------------------------------------------------------------------------

/**
 * Convert an ImageData (RGBA, 0-255) region to a Float32 CHW tensor (0-1).
 * Returns shape [1, 3, h, w].
 */
function imageDataToTensor(imageData, x, y, w, h) {
  const { data, width } = imageData
  const tensor = new Float32Array(1 * 3 * h * w)
  const chSize = h * w

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const srcIdx = ((y + row) * width + (x + col)) * 4
      const dstIdx = row * w + col
      tensor[dstIdx] = data[srcIdx] / 255 // R
      tensor[chSize + dstIdx] = data[srcIdx + 1] / 255 // G
      tensor[2 * chSize + dstIdx] = data[srcIdx + 2] / 255 // B
    }
  }

  return new ort.Tensor('float32', tensor, [1, 3, h, w])
}

// ---------------------------------------------------------------------------
// Core inference with tiling
// ---------------------------------------------------------------------------

/**
 * Run Real-ESRGAN inference on a single tile.
 */
async function runTile(session, inputTensor) {
  const feeds = { input: inputTensor }
  const results = await session.run(feeds)
  return results.output
}

/**
 * Upscale a full image using tiling to stay within memory limits.
 *
 * @param {HTMLImageElement|ImageBitmap} image  — source image
 * @param {string} modelName  — one of MODEL_FILES keys
 * @param {string} outputFormat — 'png' | 'jpeg' | 'webp'
 * @param {function} onProgress — progress callback
 * @returns {string} data-URI of the upscaled image
 */
export async function upscaleLocal(image, modelName, outputFormat, onProgress) {
  // Load model / session
  const session = await getSession(modelName, onProgress)

  // Draw source image to canvas to get pixel data
  const srcCanvas = new OffscreenCanvas(image.width, image.height)
  const srcCtx = srcCanvas.getContext('2d')
  srcCtx.drawImage(image, 0, 0)
  const srcData = srcCtx.getImageData(0, 0, image.width, image.height)

  const inW = image.width
  const inH = image.height
  const outW = inW * SCALE
  const outH = inH * SCALE

  // Output canvas
  const outCanvas = new OffscreenCanvas(outW, outH)
  const outCtx = outCanvas.getContext('2d')

  // Calculate tiles
  const tilesX = Math.ceil(inW / TILE_SIZE)
  const tilesY = Math.ceil(inH / TILE_SIZE)
  const totalTiles = tilesX * tilesY
  let processed = 0

  onProgress?.({
    stage: 'processing',
    message: `Upscaling (${totalTiles} tile${totalTiles > 1 ? 's' : ''})...`,
    progress: 0,
    provider: _sessionProvider,
  })

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      // Input tile boundaries (with padding)
      const inX = tx * TILE_SIZE
      const inY = ty * TILE_SIZE
      const inTileW = Math.min(TILE_SIZE, inW - inX)
      const inTileH = Math.min(TILE_SIZE, inH - inY)

      // Padded region (clamped to image bounds)
      const padX0 = Math.max(0, inX - TILE_PAD)
      const padY0 = Math.max(0, inY - TILE_PAD)
      const padX1 = Math.min(inW, inX + inTileW + TILE_PAD)
      const padY1 = Math.min(inH, inY + inTileH + TILE_PAD)
      const padW = padX1 - padX0
      const padH = padY1 - padY0

      // Run inference on padded tile
      const inputTensor = imageDataToTensor(srcData, padX0, padY0, padW, padH)
      const outputTensor = await runTile(session, inputTensor)

      // Extract the non-padded region from the output
      const outPadW = padW * SCALE
      const outPadH = padH * SCALE
      const cropX = (inX - padX0) * SCALE
      const cropY = (inY - padY0) * SCALE
      const cropW = inTileW * SCALE
      const cropH = inTileH * SCALE

      // Write cropped output tile to the output canvas
      const outData = outputTensor.data
      const outChSize = outPadH * outPadW
      const tileImageData = outCtx.createImageData(cropW, cropH)

      for (let row = 0; row < cropH; row++) {
        for (let col = 0; col < cropW; col++) {
          const srcRow = cropY + row
          const srcCol = cropX + col
          const srcIdx = srcRow * outPadW + srcCol
          const dstIdx = (row * cropW + col) * 4
          tileImageData.data[dstIdx] = Math.round(Math.min(1, Math.max(0, outData[srcIdx])) * 255)
          tileImageData.data[dstIdx + 1] = Math.round(Math.min(1, Math.max(0, outData[outChSize + srcIdx])) * 255)
          tileImageData.data[dstIdx + 2] = Math.round(Math.min(1, Math.max(0, outData[2 * outChSize + srcIdx])) * 255)
          tileImageData.data[dstIdx + 3] = 255
        }
      }

      outCtx.putImageData(tileImageData, inX * SCALE, inY * SCALE)

      processed++
      onProgress?.({
        stage: 'processing',
        message: `Upscaling tile ${processed}/${totalTiles}...`,
        progress: processed / totalTiles,
        provider: _sessionProvider,
      })
    }
  }

  // Encode output
  onProgress?.({ stage: 'encoding', message: 'Encoding output...' })
  const mimeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }
  const mime = mimeMap[outputFormat] || 'image/png'
  const quality = outputFormat === 'png' ? undefined : 0.95

  const blob = await outCanvas.convertToBlob({ type: mime, quality })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.readAsDataURL(blob)
  })
}

/**
 * Get the currently active execution provider info.
 */
export function getProviderInfo() {
  return {
    provider: _sessionProvider,
    modelLoaded: _sessionModel,
  }
}

/**
 * Release the cached session and free memory.
 */
export function releaseSession() {
  if (_session) {
    try { _session.release() } catch { /* ignore */ }
    _session = null
    _sessionModel = null
    _sessionProvider = null
  }
}
