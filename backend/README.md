---
title: 4XL Upscaler API
emoji: 🖼️
colorFrom: gray
colorTo: indigo
sdk: gradio
sdk_version: 5.9.1
app_file: app.py
python_version: 3.10.13
pinned: false
license: mit
---

# 4XL Upscaler API

Privacy-first neural image upscaling powered by Real-ESRGAN.

## 🔒 Privacy Features

- **No Persistence**: Temp files auto-deleted every hour
- **Memory Purge**: VRAM/RAM explicitly cleared after each inference
- **No Logging**: User images are never logged or stored

## 🚀 API Usage

```python
from gradio_client import Client

client = Client("mahinigam/4xl-api")
result = client.predict(
    image="path/to/image.jpg",
    model_name="RealESRGAN_x4plus",
    output_format="png",
    api_name="/upscale"
)
# Returns base64 encoded image
```

## 📊 Specifications

| Parameter | Value |
|-----------|-------|
| Max Input | 1024×1024px |
| Upscale Factor | 4× |
| Output Formats | PNG, JPEG, WebP |
| GPU Timeout | 60 seconds |
| Tile Size | 512px (with 32px padding) |

## 🧠 Available Models

| Model | Use Case | Architecture |
|-------|----------|-------------|
| `RealESRGAN_x4plus` | Photos & general images | 23 RRDB blocks |
| `RealESRNet_x4plus` | Faster processing | 23 RRDB blocks (lighter weights) |
| `RealESRGAN_x4plus_anime_6B` | Anime & illustrations | 6 RRDB blocks (~4x faster) |

## ⚡ Performance

- **Model Caching**: Loaded once, reused across requests
- **Smart Tiling**: 512px tiles with 32px overlap for seamless joins
- **Inference Mode**: `torch.inference_mode()` for optimized inference
- **FP16 on CUDA**: Half-precision for 2x memory efficiency
