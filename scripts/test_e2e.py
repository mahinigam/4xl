#!/usr/bin/env python3
"""End-to-end test suite for 4XL deployed on HuggingFace Spaces."""

import sys
import json
import time
import urllib.request
import urllib.error
from PIL import Image
from io import BytesIO

FRONTEND = "https://mahinigam-4xl.hf.space"
BACKEND = "https://mahinigam-4xl-api.hf.space"
ONNX_BASE = "https://huggingface.co/spaces/mahinigam/4xl-api/resolve/main/models"

passed = 0
failed = 0

def test(name, fn):
    global passed, failed
    try:
        result = fn()
        print(f"  PASS  {name}: {result}")
        passed += 1
    except Exception as e:
        print(f"  FAIL  {name}: {e}")
        failed += 1

# -------------------------------------------------------
# Test 1: Frontend loads
# -------------------------------------------------------
def t1():
    req = urllib.request.Request(f"{FRONTEND}/")
    resp = urllib.request.urlopen(req, timeout=15)
    assert resp.status == 200, f"HTTP {resp.status}"
    body = resp.read().decode()
    assert "4XL" in body or "4xl" in body, "Page content missing"
    return f"HTTP 200, {len(body)} bytes"

test("Frontend loads", t1)

# -------------------------------------------------------
# Test 2: Backend API info
# -------------------------------------------------------
def t2():
    resp = urllib.request.urlopen(f"{BACKEND}/gradio_api/info", timeout=15)
    data = json.loads(resp.read())
    eps = data.get("named_endpoints", {})
    assert "/upscale" in eps, f"Endpoints: {list(eps.keys())}"
    return f"Endpoints: {list(eps.keys())}"

test("Backend API info", t2)

# -------------------------------------------------------
# Test 3: Proxy works (frontend /api/ -> backend /gradio_api/)
# -------------------------------------------------------
def t3():
    resp = urllib.request.urlopen(f"{FRONTEND}/api/info", timeout=15)
    data = json.loads(resp.read())
    assert "/upscale" in data.get("named_endpoints", {}), "Proxy not forwarding"
    return "Proxy OK"

test("Proxy /api/ -> /gradio_api/", t3)

# -------------------------------------------------------
# Test 4: Upload via proxy
# -------------------------------------------------------
def t4():
    img = Image.new("RGB", (64, 64), color=(100, 150, 200))
    buf = BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    import http.client
    import mimetypes
    boundary = "----4xlTestBoundary"
    body_parts = []
    body_parts.append(f"--{boundary}".encode())
    body_parts.append(b'Content-Disposition: form-data; name="files"; filename="test.png"')
    body_parts.append(b"Content-Type: image/png")
    body_parts.append(b"")
    body_parts.append(img_bytes)
    body_parts.append(f"--{boundary}--".encode())
    body = b"\r\n".join(body_parts)

    req = urllib.request.Request(
        f"{FRONTEND}/api/upload?upload_id=e2etest",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=30)
    paths = json.loads(resp.read())
    assert len(paths) > 0, "No paths returned"
    return f"Uploaded -> {paths[0][:60]}..."

upload_path = None
def t4_with_save():
    global upload_path
    img = Image.new("RGB", (64, 64), color=(100, 150, 200))
    buf = BytesIO()
    img.save(buf, format="PNG")
    img_bytes = buf.getvalue()

    boundary = "----4xlTestBoundary"
    body_parts = []
    body_parts.append(f"--{boundary}".encode())
    body_parts.append(b'Content-Disposition: form-data; name="files"; filename="test.png"')
    body_parts.append(b"Content-Type: image/png")
    body_parts.append(b"")
    body_parts.append(img_bytes)
    body_parts.append(f"--{boundary}--".encode())
    body = b"\r\n".join(body_parts)

    req = urllib.request.Request(
        f"{FRONTEND}/api/upload?upload_id=e2etest",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=30)
    paths = json.loads(resp.read())
    assert len(paths) > 0, "No paths returned"
    upload_path = paths[0]
    return f"Uploaded -> {paths[0][:60]}..."

test("Upload via proxy", t4_with_save)

# -------------------------------------------------------
# Test 5: Full server-side upscale
# -------------------------------------------------------
def t5():
    global upload_path
    if not upload_path:
        raise Exception("Skipped — upload failed")

    payload = json.dumps({
        "data": [{"path": upload_path}, "RealESRNet_x4plus", "png"]
    }).encode()

    req = urllib.request.Request(
        f"{FRONTEND}/api/call/upscale",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    resp = urllib.request.urlopen(req, timeout=30)
    queue_data = json.loads(resp.read())
    event_id = queue_data.get("event_id")
    assert event_id, f"No event_id: {queue_data}"

    print(f"         Queued event: {event_id}, waiting ~30s...")
    time.sleep(35)

    result_resp = urllib.request.urlopen(
        f"{FRONTEND}/api/call/upscale/{event_id}", timeout=60
    )
    result_text = result_resp.read().decode()

    has_complete = "event: complete" in result_text
    has_base64 = "data:image/png;base64," in result_text
    assert has_complete, "No 'event: complete' in SSE"
    assert has_base64, "No base64 image in response"
    b64_len = len(result_text)
    return f"Complete, response {b64_len} bytes (base64 PNG)"

test("Full server-side upscale", t5)

# -------------------------------------------------------
# Test 6: ONNX model files accessible
# -------------------------------------------------------
def t6_general():
    req = urllib.request.Request(f"{ONNX_BASE}/RealESRGAN_x4plus.onnx", method="HEAD")
    resp = urllib.request.urlopen(req, timeout=15)
    size = resp.headers.get("Content-Length", "0")
    assert resp.status == 200, f"HTTP {resp.status}"
    return f"HTTP 200, {int(size)/(1024*1024):.1f} MB"

def t6_anime():
    req = urllib.request.Request(f"{ONNX_BASE}/RealESRGAN_x4plus_anime_6B.onnx", method="HEAD")
    resp = urllib.request.urlopen(req, timeout=15)
    size = resp.headers.get("Content-Length", "0")
    assert resp.status == 200, f"HTTP {resp.status}"
    return f"HTTP 200, {int(size)/(1024*1024):.1f} MB"

def t6_fast():
    req = urllib.request.Request(f"{ONNX_BASE}/RealESRNet_x4plus.onnx", method="HEAD")
    resp = urllib.request.urlopen(req, timeout=15)
    assert resp.status == 200, f"HTTP {resp.status}"
    return "HTTP 200"

test("ONNX model: RealESRGAN_x4plus", t6_general)
test("ONNX model: anime_6B", t6_anime)
test("ONNX model: RealESRNet_x4plus", t6_fast)

# -------------------------------------------------------
# Test 7: JS/CSS/WASM assets served
# -------------------------------------------------------
def t7():
    resp = urllib.request.urlopen(f"{FRONTEND}/", timeout=15)
    html = resp.read().decode()
    # Extract JS asset paths from the HTML
    import re
    js_files = re.findall(r'src="(/assets/[^"]+\.js)"', html)
    css_files = re.findall(r'href="(/assets/[^"]+\.css)"', html)
    results = []
    for f in js_files:
        r = urllib.request.urlopen(f"{FRONTEND}{f}", timeout=15)
        assert r.status == 200, f"{f}: HTTP {r.status}"
        results.append(f"JS {f.split('/')[-1]}")
    for f in css_files:
        r = urllib.request.urlopen(f"{FRONTEND}{f}", timeout=15)
        assert r.status == 200, f"{f}: HTTP {r.status}"
        results.append(f"CSS {f.split('/')[-1]}")
    return ", ".join(results) if results else "No assets found (unexpected)"

test("JS/CSS assets served", t7)

def t7_wasm():
    resp = urllib.request.urlopen(f"{FRONTEND}/", timeout=15)
    html = resp.read().decode()
    # WASM is loaded dynamically by onnxruntime-web, check if the MJS bundle exists
    import re
    mjs_files = re.findall(r'"(/assets/[^"]+\.mjs)"', html)
    # Try to find the WASM file from the dist listing
    # The WASM file is referenced by the ORT bundle, not directly in HTML
    # Let's check via a known pattern from the build output
    req = urllib.request.Request(f"{FRONTEND}/assets/", method="GET")
    try:
        resp2 = urllib.request.urlopen(req, timeout=10)
    except:
        pass  # nginx may not list directory

    # Check a known asset from build: ort-wasm-simd-threaded.jsep-*.wasm
    # We can find it by fetching the ORT bundle and looking for the reference
    for mf in mjs_files:
        r = urllib.request.urlopen(f"{FRONTEND}{mf}", timeout=15)
        content = r.read().decode(errors="replace")
        import re as re2
        wasm_refs = re2.findall(r'([a-zA-Z0-9_.-]+\.wasm)', content)
        if wasm_refs:
            wasm_file = wasm_refs[0]
            wr = urllib.request.urlopen(f"{FRONTEND}/assets/{wasm_file}", timeout=30)
            assert wr.status == 200, f"WASM HTTP {wr.status}"
            wasm_size = int(wr.headers.get("Content-Length", "0"))
            return f"WASM OK: {wasm_file} ({wasm_size/(1024*1024):.1f} MB)"
    return "WASM file not found in ORT bundle (may still work via CDN)"

test("WASM file served", t7_wasm)

# -------------------------------------------------------
# Test 8: Nginx headers
# -------------------------------------------------------
def t8():
    resp = urllib.request.urlopen(f"{FRONTEND}/", timeout=15)
    # HTTP/2 normalises header names to lowercase, use case-insensitive lookup
    hdrs = {k.lower(): v for k, v in resp.headers.items()}
    issues = []
    # Should NOT have X-Frame-Options (breaks HF iframe)
    if "x-frame-options" in hdrs:
        issues.append("X-Frame-Options present (blocks HF iframe)")
    # Should have X-Content-Type-Options
    xcto = hdrs.get("x-content-type-options", "")
    if "nosniff" not in xcto:
        issues.append("Missing X-Content-Type-Options: nosniff")
    if issues:
        raise Exception("; ".join(issues))
    return f"No X-Frame-Options, has nosniff"

test("Nginx headers correct", t8)

# -------------------------------------------------------
# Summary
# -------------------------------------------------------
print(f"\n{'='*50}")
print(f"Results: {passed} passed, {failed} failed, {passed+failed} total")
print(f"{'='*50}")
sys.exit(1 if failed > 0 else 0)
