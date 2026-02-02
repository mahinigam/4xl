---
title: 4XL Upscaler API
emoji: 🖼️
colorFrom: gray
colorTo: indigo
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
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

## 🧠 Available Models

- `RealESRGAN_x4plus` - General purpose (best quality)
- `RealESRNet_x4plus` - Faster, slightly lower quality
- `RealESRGAN_x4plus_anime_6B` - Optimized for anime/illustrations
