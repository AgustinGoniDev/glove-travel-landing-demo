"""Downloads real elevation and satellite imagery for each chapter of the flight and writes, per chapter:

  public/terrain/<id>/height.bin   Uint16 heights in meters (row-major, size x size), north at row 0
  public/terrain/<id>/color.jpg    satellite image, painted look (see paint())
  public/terrain/<id>/meta.json    size, width in meters, min/max height
  data/preview/<id>-*.jpg          previews to design the camera paths (not published)

Elevation: AWS Terrain Tiles (Terrarium encoding, public, SRTM/GMTED).
Imagery: Esri World Imagery (attribution in the page footer).

Usage: python -I scripts/fetch_terrain.py [chapter-id ...]
"""
import io
import json
import math
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# id: (lat, lon, zoom of the elevation tiles, tiles per side, imagery source)
# "s2" is the cloud-free Sentinel-2 mosaic (EOX); "esri" is sharper but has clouds and seams in places.
CHAPTERS = {
    "paine": (-50.99, -73.02, 12, 6, "esri"),
    "glaciar": (-50.49, -73.10, 12, 6, "s2"),
    "fitzroy": (-49.29, -73.03, 12, 6, "s2"),
    "lagos": (-41.13, -72.52, 12, 6, "s2"),
    "atacama": (-22.86, -68.00, 12, 6, "esri"),
}
IMAGERY = {
    "esri": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "s2": "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg",
}
MESH_SIZE = 512
TEXTURE_SIZE = 2048
UA = {"User-Agent": "glove-landing-demo/0.1 (terrain preview)"}


def tile_xy(lat: float, lon: float, z: int) -> tuple[float, float]:
    n = 2**z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def get(url: str) -> bytes:
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except Exception as e:  # retry, then fail loudly
            if attempt == 3:
                raise RuntimeError(f"{url}: {e}")
    raise RuntimeError(url)


def mosaic(urls: list[list[str]], decode) -> np.ndarray:
    flat = [(i, j, u) for i, row in enumerate(urls) for j, u in enumerate(row)]
    with ThreadPoolExecutor(8) as ex:
        tiles = list(ex.map(lambda t: (t[0], t[1], decode(get(t[2]))), flat))
    rows = len(urls)
    cols = len(urls[0])
    th, tw = tiles[0][2].shape[:2]
    out = np.zeros((rows * th, cols * tw) + tiles[0][2].shape[2:], dtype=tiles[0][2].dtype)
    for i, j, t in tiles:
        out[i * th:(i + 1) * th, j * tw:(j + 1) * tw] = t
    return out


def terrarium(data: bytes) -> np.ndarray:
    a = np.asarray(Image.open(io.BytesIO(data)).convert("RGB")).astype(np.float32)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768


def rgb(data: bytes) -> np.ndarray:
    return np.asarray(Image.open(io.BytesIO(data)).convert("RGB"))


def paint(img: np.ndarray, chapter: str) -> np.ndarray:
    """Turns the satellite photo into something closer to a painting: edge-preserving smoothing, a few
    brush-like strokes, warmer and richer colors. The shader adds light, snow and haze on top."""
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    try:
        bgr = cv2.xphoto.oilPainting(bgr, 5, 1)
    except Exception:
        for _ in range(2):
            bgr = cv2.bilateralFilter(bgr, 9, 40, 9)
    bgr = cv2.edgePreservingFilter(bgr, flags=cv2.RECURS_FILTER, sigma_s=40, sigma_r=0.35)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    sat = 1.35 if chapter != "atacama" else 1.2
    hsv[..., 1] = np.clip(hsv[..., 1] * sat, 0, 255)
    hsv[..., 2] = np.clip((hsv[..., 2] / 255) ** 0.85 * 255 * 1.05, 0, 255)
    bgr = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def hillshade(h: np.ndarray, cell: float) -> np.ndarray:
    gy, gx = np.gradient(h, cell)
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, alt = np.radians(315), np.radians(40)
    shade = np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az - aspect)
    return np.clip(shade * 255, 0, 255).astype(np.uint8)


def build(cid: str) -> None:
    lat, lon, z, n, source = CHAPTERS[cid]
    cx, cy = tile_xy(lat, lon, z)
    x0, y0 = int(cx) - n // 2, int(cy) - n // 2
    print(f"[{cid}] elevation z{z} {n}x{n} tiles")
    h_urls = [[f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x0 + j}/{y0 + i}.png" for j in range(n)] for i in range(n)]
    height = mosaic(h_urls, terrarium)
    zi = z + 1
    m = n * 2
    print(f"[{cid}] imagery z{zi} {m}x{m} tiles")
    i_urls = [[IMAGERY[source].format(z=zi, y=y0 * 2 + i, x=x0 * 2 + j) for j in range(m)] for i in range(m)]
    color = mosaic(i_urls, rgb)

    width_m = n * 40075016.686 * math.cos(math.radians(lat)) / 2**z
    h = cv2.resize(height, (MESH_SIZE, MESH_SIZE), interpolation=cv2.INTER_AREA)
    h = cv2.GaussianBlur(h, (3, 3), 0)
    h = np.clip(h, 0, 8000)
    tex = cv2.resize(color, (TEXTURE_SIZE, TEXTURE_SIZE), interpolation=cv2.INTER_AREA)

    out = os.path.join(ROOT, "public", "terrain", cid)
    os.makedirs(out, exist_ok=True)
    np.round(h).astype("<u2").tofile(os.path.join(out, "height.bin"))
    Image.fromarray(paint(tex, cid)).save(os.path.join(out, "color.jpg"), quality=86, optimize=True, progressive=True)
    def lon_of(x: float) -> float:
        return x / 2**z * 360 - 180

    def lat_of(y: float) -> float:
        return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / 2**z))))

    bounds = {"west": lon_of(x0), "east": lon_of(x0 + n), "north": lat_of(y0), "south": lat_of(y0 + n)}
    meta = {"id": cid, "imagery": source, "bounds": bounds, "size": MESH_SIZE, "widthMeters": round(width_m), "minHeight": float(h.min()), "maxHeight": float(h.max()), "lat": lat, "lon": lon}
    json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1)

    prev = os.path.join(ROOT, "data", "preview")
    os.makedirs(prev, exist_ok=True)
    shade = hillshade(h, width_m / MESH_SIZE)
    Image.fromarray(shade).save(os.path.join(prev, f"{cid}-shade.jpg"), quality=80)
    Image.fromarray(cv2.resize(tex, (768, 768))).save(os.path.join(prev, f"{cid}-raw.jpg"), quality=80)
    Image.open(os.path.join(out, "color.jpg")).resize((768, 768)).save(os.path.join(prev, f"{cid}-paint.jpg"), quality=80)
    print(f"[{cid}] {width_m / 1000:.1f} km wide, heights {h.min():.0f}-{h.max():.0f} m")


if __name__ == "__main__":
    for cid in sys.argv[1:] or list(CHAPTERS):
        build(cid)
