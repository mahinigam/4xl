"""
4XL - Privacy-First Image Upscaler API
Real-ESRGAN powered neural upscaling with ZeroGPU

PRIVACY FEATURES:
- No image logging or persistence
- VRAM/RAM purge after each inference
- Automatic cache cleanup
"""

import os
import gc
import tempfile
import numpy as np
from PIL import Image
from io import BytesIO
import base64

import torch
import gradio as gr

# ZeroGPU support - only available on HuggingFace Spaces
# For local development, we mock the decorator
try:
    import spaces
    ZERO_GPU_AVAILABLE = True
except ImportError:
    ZERO_GPU_AVAILABLE = False
    # Mock decorator for local development
    class spaces:
        @staticmethod
        def GPU(duration=60):
            def decorator(func):
                return func
            return decorator

# Model imports
from basicsr.archs.rrdbnet_arch import RRDBNet
from realesrgan import RealESRGANer

# ============================================================================
# PRIVACY: Disable any potential logging
# ============================================================================
import logging
logging.disable(logging.CRITICAL)  # PRIVACY: Suppress all logs

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================
MODEL_CONFIGS = {
    "RealESRGAN_x4plus": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
        "scale": 4,
        "model": lambda: RRDBNet(
            num_in_ch=3, num_out_ch=3, num_feat=64, 
            num_block=23, num_grow_ch=32, scale=4
        ),
    },
    "RealESRNet_x4plus": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.1/RealESRNet_x4plus.pth",
        "scale": 4,
        "model": lambda: RRDBNet(
            num_in_ch=3, num_out_ch=3, num_feat=64,
            num_block=23, num_grow_ch=32, scale=4
        ),
    },
    "RealESRGAN_x4plus_anime_6B": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",
        "scale": 4,
        "model": lambda: RRDBNet(
            num_in_ch=3, num_out_ch=3, num_feat=64,
            num_block=6, num_grow_ch=32, scale=4
        ),
    },
}

# Cache directory for model weights
WEIGHTS_DIR = os.path.join(tempfile.gettempdir(), "4xl_weights")
os.makedirs(WEIGHTS_DIR, exist_ok=True)

# Maximum input resolution (prevents OOM on ZeroGPU's 16GB VRAM)
MAX_RESOLUTION = 1024  # pixels (longest side)


def download_weights(model_name: str) -> str:
    """Download model weights if not cached."""
    config = MODEL_CONFIGS[model_name]
    weight_path = os.path.join(WEIGHTS_DIR, f"{model_name}.pth")
    
    if not os.path.exists(weight_path):
        import urllib.request
        urllib.request.urlretrieve(config["url"], weight_path)
    
    return weight_path


def resize_if_needed(image: Image.Image) -> Image.Image:
    """Resize image if it exceeds maximum resolution."""
    w, h = image.size
    if max(w, h) > MAX_RESOLUTION:
        ratio = MAX_RESOLUTION / max(w, h)
        new_w, new_h = int(w * ratio), int(h * ratio)
        image = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    return image


@spaces.GPU(duration=60)  # ZeroGPU: 60 second timeout
def upscale_image(
    image: Image.Image,
    model_name: str,
    output_format: str
) -> str:
    """
    Upscale image using Real-ESRGAN.
    
    Returns: Base64 encoded image string
    """
    if image is None:
        raise gr.Error("No image provided")
    
    try:
        # Resize if too large
        image = resize_if_needed(image)
        
        # Convert PIL to numpy (RGB -> BGR for OpenCV)
        img_np = np.array(image)
        if len(img_np.shape) == 2:  # Grayscale
            img_np = np.stack([img_np] * 3, axis=-1)
        img_bgr = img_np[:, :, ::-1]  # RGB to BGR
        
        # Load model
        config = MODEL_CONFIGS[model_name]
        weight_path = download_weights(model_name)
        
        # Detect device - CUDA for HF Spaces, MPS for Mac, CPU fallback
        if torch.cuda.is_available():
            device = "cuda"
            use_half = True
        elif torch.backends.mps.is_available():
            device = "mps"
            use_half = False  # MPS doesn't support FP16 well
        else:
            device = "cpu"
            use_half = False
        
        model = config["model"]()
        upsampler = RealESRGANer(
            scale=config["scale"],
            model_path=weight_path,
            model=model,
            tile=0,  # No tiling for smaller images
            tile_pad=10,
            pre_pad=0,
            half=use_half,
            device=device,
        )
        
        # Upscale (fixed 4x)
        output_bgr, _ = upsampler.enhance(img_bgr, outscale=4)
        
        # Convert BGR back to RGB
        output_rgb = output_bgr[:, :, ::-1]
        output_pil = Image.fromarray(output_rgb)
        
        # Encode to requested format
        buffer = BytesIO()
        format_map = {
            "png": ("PNG", "image/png"),
            "jpeg": ("JPEG", "image/jpeg"),
            "webp": ("WEBP", "image/webp"),
        }
        pil_format, mime_type = format_map.get(output_format.lower(), ("PNG", "image/png"))
        
        save_kwargs = {"format": pil_format}
        if pil_format == "JPEG":
            save_kwargs["quality"] = 95
        elif pil_format == "WEBP":
            save_kwargs["quality"] = 95
        
        output_pil.save(buffer, **save_kwargs)
        img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
        
        # ====================================================================
        # PRIVACY: Explicit memory cleanup
        # ====================================================================
        del upsampler, model, img_np, img_bgr, output_bgr, output_rgb, output_pil
        del buffer
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()  # PRIVACY: Purge VRAM
        gc.collect()              # PRIVACY: Purge RAM
        # ====================================================================
        
        return f"data:{mime_type};base64,{img_base64}"
    
    except Exception as e:
        # PRIVACY: Don't expose internal errors
        torch.cuda.empty_cache()
        gc.collect()
        raise gr.Error("Processing failed. Please try a smaller image or different model.")


# ============================================================================
# GRADIO API INTERFACE
# ============================================================================
# PRIVACY: delete_cache=(3600, 3600) wipes temp files every hour
with gr.Blocks(
    title="4XL Upscaler API",
    delete_cache=(3600, 3600),  # PRIVACY: Auto-cleanup every hour
) as demo:
    
    gr.Markdown("# 4XL Upscaler API")
    gr.Markdown(f"**Max input resolution:** {MAX_RESOLUTION}×{MAX_RESOLUTION}px")
    gr.Markdown("**Upscale factor:** 4× (fixed)")
    
    with gr.Row():
        with gr.Column():
            input_image = gr.Image(
                type="pil",
                label="Input Image",
                sources=["upload"],
            )
            model_dropdown = gr.Dropdown(
                choices=list(MODEL_CONFIGS.keys()),
                value="RealESRGAN_x4plus",
                label="Model",
            )
            format_dropdown = gr.Dropdown(
                choices=["png", "jpeg", "webp"],
                value="png",
                label="Output Format",
            )
            submit_btn = gr.Button("Upscale", variant="primary")
        
        with gr.Column():
            output_data = gr.Textbox(
                label="Output (Base64)",
                lines=5,
                max_lines=10,
            )
    
    submit_btn.click(
        fn=upscale_image,
        inputs=[input_image, model_dropdown, format_dropdown],
        outputs=output_data,
        api_name="upscale",  # API endpoint: /api/upscale
    )

# Launch configuration
if __name__ == "__main__":
    import os
    # Use share=True for local dev if localhost is not accessible
    is_hf_space = os.environ.get("SPACE_ID") is not None
    
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        show_api=True,
        share=not is_hf_space,  # Share locally, not on HF Spaces
    )
