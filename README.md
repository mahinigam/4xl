# 4XL — Privacy-First Neural Image Upscaler

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Gradio-4.44-FF6F00?style=flat-square" alt="Gradio" />
  <img src="https://img.shields.io/badge/Real--ESRGAN-Powered-green?style=flat-square" alt="Real-ESRGAN" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="MIT License" />
</p>

4× neural image upscaling with a **privacy-first** approach. Your images are processed in memory and never stored.

## ✨ Features

- **4× Upscaling** — Enhance images to 4x their original resolution using Real-ESRGAN
- **Privacy-First** — No logging, no storage, automatic memory purge
- **Three Models** — General (best quality), Fast, and Anime-optimized
- **Multiple Formats** — Export as PNG, JPEG, or WebP
- **Free GPU** — Powered by HuggingFace ZeroGPU

## 🏗️ Architecture

```
┌─────────────────────┐     HTTP     ┌─────────────────────┐
│   Frontend Space    │ ──────────►  │   Backend Space     │
│   (React + Vite)    │              │   (Gradio + GPU)    │
│                     │  ◄──────────  │                     │
│   Static Docker     │   Base64     │   ZeroGPU (Free)    │
└─────────────────────┘              └─────────────────────┘
```

## 🚀 Quick Start

### Local Development

```bash
# Clone the repository
git clone https://github.com/mahinigam/4xl.git
cd 4xl

# Option 1: Docker Compose (Recommended)
docker-compose up

# Option 2: Run separately

# Terminal 1 - Backend
cd backend
pip install -r requirements.txt
python app.py

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Deploy to HuggingFace

1. **Create two HuggingFace Spaces:**
   - `mahinigam/4xl-api` (SDK: Gradio, Hardware: ZeroGPU)
   - `mahinigam/4xl` (SDK: Docker, Hardware: CPU Basic)

2. **Set GitHub Secret:**
   - Go to GitHub repo → Settings → Secrets → Actions
   - Add `HF_TOKEN` with your HuggingFace write token

3. **Push to main branch:**
   ```bash
   git push origin main
   ```
   
   GitHub Actions will automatically deploy both spaces.

## 🔒 Privacy Features

| Feature | Implementation |
|---------|---------------|
| **No Persistence** | `delete_cache=(3600, 3600)` — Auto-wipes temp files hourly |
| **VRAM Purge** | `torch.cuda.empty_cache()` after every inference |
| **RAM Purge** | `gc.collect()` after every inference |
| **No Logging** | Logging disabled, no print statements for images |

## 🎨 Design System

**Cinematic Systems** aesthetic:
- Deep obsidian background (`#0D0D0F`)
- Glassmorphism panels (20px blur)
- Navy blue ambient glows (0.15 intensity)
- Space Grotesk headings + Inter body text
- Liquid-smooth cubic-bezier transitions
- Analog film grain texture overlay

## 📁 Project Structure

```
4xl/
├── backend/                 # Gradio API (HF Space: 4xl-api)
│   ├── app.py              # Real-ESRGAN inference
│   ├── requirements.txt
│   └── README.md           # HF Space config
│
├── frontend/               # React App (HF Space: 4xl)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── styles/
│   ├── Dockerfile
│   └── README.md           # HF Space config
│
├── docker-compose.yml      # Local development
└── .github/workflows/      # CI/CD
```

## 📊 Specifications

| Parameter | Value |
|-----------|-------|
| Max Input Resolution | 1024×1024px |
| Upscale Factor | 4× (fixed) |
| Output Formats | PNG, JPEG, WebP |
| GPU Timeout | 60 seconds |
| Models | RealESRGAN_x4plus, RealESRNet_x4plus, RealESRGAN_x4plus_anime_6B |

## 📄 License

MIT License — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with 🖤 by <a href="https://github.com/mahinigam">@mahinigam</a>
</p>
