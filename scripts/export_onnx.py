#!/usr/bin/env python3
"""
Export Real-ESRGAN models to ONNX format for browser inference.

Usage:
    python scripts/export_onnx.py

Outputs .onnx files to scripts/onnx_models/
"""

import os
import sys
import urllib.request
import tempfile

import torch
import numpy as np

# Add backend to path for basicsr imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from basicsr.archs.rrdbnet_arch import RRDBNet

# ============================================================================
# MODEL DEFINITIONS (same as backend/app.py)
# ============================================================================
MODELS = {
    "RealESRGAN_x4plus": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
        "num_block": 23,
    },
    "RealESRNet_x4plus": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.1/RealESRNet_x4plus.pth",
        "num_block": 23,
    },
    "RealESRGAN_x4plus_anime_6B": {
        "url": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",
        "num_block": 6,
    },
}

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "onnx_models")
WEIGHTS_DIR = os.path.join(tempfile.gettempdir(), "4xl_weights")


def download_weights(name: str, url: str) -> str:
    """Download model weights if not already cached."""
    os.makedirs(WEIGHTS_DIR, exist_ok=True)
    path = os.path.join(WEIGHTS_DIR, f"{name}.pth")
    if not os.path.exists(path):
        print(f"  Downloading {name} weights...")
        urllib.request.urlretrieve(url, path)
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"  Downloaded: {size_mb:.1f} MB")
    else:
        size_mb = os.path.getsize(path) / (1024 * 1024)
        print(f"  Using cached weights: {size_mb:.1f} MB")
    return path


def export_model(name: str, config: dict) -> str:
    """Export a single model to ONNX."""
    print(f"\n{'='*60}")
    print(f"Exporting: {name}")
    print(f"{'='*60}")

    # Download weights
    weight_path = download_weights(name, config["url"])

    # Create model
    model = RRDBNet(
        num_in_ch=3,
        num_out_ch=3,
        num_feat=64,
        num_block=config["num_block"],
        num_grow_ch=32,
        scale=4,
    )

    # Load weights
    print("  Loading weights...")
    state_dict = torch.load(weight_path, map_location="cpu")
    # Some checkpoints wrap in 'params_ema' or 'params'
    if "params_ema" in state_dict:
        state_dict = state_dict["params_ema"]
    elif "params" in state_dict:
        state_dict = state_dict["params"]
    model.load_state_dict(state_dict, strict=True)
    model.eval()

    # Create dummy input (1, 3, 64, 64) — small for export, dynamic axes handle any size
    dummy_input = torch.randn(1, 3, 64, 64)

    # Export to ONNX
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    onnx_path = os.path.join(OUTPUT_DIR, f"{name}.onnx")

    print("  Exporting to ONNX (opset 17)...")
    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch", 2: "height", 3: "width"},
            "output": {0: "batch", 2: "height_4x", 3: "width_4x"},
        },
        opset_version=17,
        do_constant_folding=True,
    )

    size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"  Exported: {onnx_path} ({size_mb:.1f} MB)")

    # Verify
    import onnx
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    print(f"  Verified: ONNX model is valid")

    return onnx_path


def main():
    print("4XL — Real-ESRGAN ONNX Export")
    print(f"PyTorch version: {torch.__version__}")
    print(f"Output directory: {OUTPUT_DIR}")

    results = {}
    for name, config in MODELS.items():
        try:
            path = export_model(name, config)
            results[name] = path
        except Exception as e:
            print(f"  ERROR exporting {name}: {e}")
            results[name] = None

    print(f"\n{'='*60}")
    print("Export Summary:")
    print(f"{'='*60}")
    for name, path in results.items():
        if path:
            size_mb = os.path.getsize(path) / (1024 * 1024)
            print(f"  {name}: {size_mb:.1f} MB")
        else:
            print(f"  {name}: FAILED")

    failed = [n for n, p in results.items() if p is None]
    if failed:
        print(f"\nFailed: {', '.join(failed)}")
        sys.exit(1)
    else:
        print(f"\nAll models exported successfully to {OUTPUT_DIR}/")


if __name__ == "__main__":
    main()
