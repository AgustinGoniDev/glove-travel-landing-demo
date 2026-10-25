"""Downloads real elevation and satellite imagery for each chapter of the flight and writes, per chapter:

  public/terrain/<id>/height.bin    Uint16 heights in meters (MESH x MESH, row-major, north at row 0)
  public/terrain/<id>/normal.jpg    world-space normals (x east, y up, z south) with the chapter's
                                    vertical exaggeration, from the full-resolution elevation
  public/terrain/<id>/color.jpg     satellite image, 4096 px, lightly painted
  public/terrain/<id>/color-2k.jpg  the same at 2048 px, for phones
  public/terrain/<id>/meta.json     size, width in meters, heights, bounds, exaggeration, landmarks
  data/preview/<id>-*.jpg           previews with landmark positions (not published)

Elevation: AWS Terrain Tiles (Terrarium encoding, public: SRTM, GMTED, ETOPO).
Imagery: Esri World Imagery or the Sentinel-2 cloudless mosaic by EOX (attribution in the page footer).

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

# id: center, elevation zoom, elevation tiles per side, imagery source, vertical exaggeration and the
# landmarks used to write the camera paths (their map position is printed and saved in meta.json).
CHAPTERS = {
    "chalten": dict(lat=-49.29, lon=-73.03, z=13, n=12, src="s2", exag=1.35, marks={
        "FitzRoy": (-49.2714, -73.0431), "CerroTorre": (-49.2928, -73.0983), "LagunaTres": (-49.2670, -73.0060),
        "Chalten": (-49.331, -72.886), "LagunaTorre": (-49.310, -73.065)}),
    "glaciar": dict(lat=-50.49, lon=-73.10, z=13, n=12, src="s2", exag=1.35, marks={
        "MorenoFront": (-50.474, -73.040), "MorenoUpper": (-50.540, -73.170), "Mirador": (-50.468, -73.025)}),
    "paine": dict(lat=-50.99, lon=-73.02, z=13, n=12, src="esri", exag=1.35, marks={
        "Torres": (-50.9420, -72.9675), "Cuernos": (-51.0050, -73.0300), "PaineGrande": (-50.9990, -73.0870),
        "Pehoe": (-51.075, -73.050), "Nordenskjold": (-51.035, -72.930), "GreyFront": (-51.010, -73.210)}),
    "lagos": dict(lat=-41.13, lon=-72.52, z=13, n=12, src="s2", exag=1.35, marks={
        "Osorno": (-41.1047, -72.4931), "Petrohue": (-41.140, -72.400), "Ensenada": (-41.21, -72.54)}),
    "rapanui": dict(lat=-27.125, lon=-109.345, z=13, n=8, src="esri", exag=2.2, marks={
        "RanoKau": (-27.186, -109.435), "Hangaroa": (-27.150, -109.425), "Terevaka": (-27.085, -109.380),
        "RanoRaraku": (-27.122, -109.290), "Tongariki": (-27.126, -109.277), "Anakena": (-27.073, -109.323)}),
    "atacama": dict(lat=-22.86, lon=-68.00, z=13, n=12, src="esri", exag=1.35, marks={
        "Licancabur": (-22.8333, -67.8833), "SanPedro": (-22.911, -68.200), "Sairecabur": (-22.730, -67.890)}),
}
IMAGERY = {
    "esri": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    "s2": "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg",
}
MESH = 768
NORMALS = 2048
TEXTURE = 4096
UA = {"User-Agent": "glove-landing-demo/0.2 (terrain preview)"}


def tile_xy(lat: float, lon: float, z: int) -> tuple[float, float]:
    n = 2**z
    return (lon + 180) / 360 * n, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n


def get(url: str) -> bytes:
    for attempt in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                return r.read()
        except Exception as e:
            if attempt == 4:
                raise RuntimeError(f"{url}: {e}")
    raise RuntimeError(url)


def mosaic(urls: list[list[str]], decode) -> np.ndarray:
    flat = [(i, j, u) for i, row in enumerate(urls) for j, u in enumerate(row)]
    with ThreadPoolExecutor(12) as ex:
        tiles = list(ex.map(lambda t: (t[0], t[1], decode(get(t[2]))), flat))
    th, tw = tiles[0][2].shape[:2]
    out = np.zeros((len(urls) * th, len(urls[0]) * tw) + tiles[0][2].shape[2:], dtype=tiles[0][2].dtype)
    for i, j, t in tiles:
        out[i * th:(i + 1) * th, j * tw:(j + 1) * tw] = t
    return out


def terrarium(data: bytes) -> np.ndarray:
    a = np.asarray(Image.open(io.BytesIO(data)).convert("RGB")).astype(np.float32)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768


def rgb(data: bytes) -> np.ndarray:
    return np.asarray(Image.open(io.BytesIO(data)).convert("RGB"))


def paint(img: np.ndarray, cid: str) -> np.ndarray:
    """A light painted finish that keeps the detail: soft edge-preserving smoothing, richer color and a
    touch of local contrast. The brush strokes are added by the shader and the post filter."""
    bgr = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    bgr = cv2.edgePreservingFilter(bgr, flags=cv2.RECURS_FILTER, sigma_s=10, sigma_r=0.18)
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(16, 16)).apply(l)
    bgr = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * (1.15 if cid == "atacama" else 1.28), 0, 255)
    bgr = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
    blur = cv2.GaussianBlur(bgr, (0, 0), 2.0)
    bgr = cv2.addWeighted(bgr, 1.35, blur, -0.35, 0)
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)


def normals(h: np.ndarray, cell: float, exag: float, size: int) -> np.ndarray:
    hs = cv2.GaussianBlur(h, (0, 0), 1.2)
    gz, gx = np.gradient(hs, cell)
    n = np.dstack((-gx * exag, np.ones_like(hs), -gz * exag))
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    img = ((n * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)
    return cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)


def hillshade(h: np.ndarray, cell: float) -> np.ndarray:
    gy, gx = np.gradient(h, cell)
    slope = np.pi / 2 - np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, alt = np.radians(315), np.radians(40)
    shade = np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az - aspect)
    return np.clip(shade * 255, 0, 255).astype(np.uint8)


def build(cid: str) -> None:
    c = CHAPTERS[cid]
    z, n = c["z"], c["n"]
    cx, cy = tile_xy(c["lat"], c["lon"], z)
    x0, y0 = int(cx) - n // 2, int(cy) - n // 2
    print(f"[{cid}] elevation z{z} {n}x{n}", flush=True)
    height = mosaic([[f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x0 + j}/{y0 + i}.png" for j in range(n)] for i in range(n)], terrarium)
    height = np.clip(height, 0, 8000)
    # Remove the odd spike of the elevation tiles: anything far from its neighborhood takes its median.
    for _ in range(3):
        med = cv2.medianBlur(height.astype(np.float32), 5)
        spikes = np.abs(height - med) > 250
        height[spikes] = med[spikes]
    zi, m = z + 1, n * 2
    print(f"[{cid}] imagery {c['src']} z{zi} {m}x{m}", flush=True)
    color = mosaic([[IMAGERY[c["src"]].format(z=zi, y=y0 * 2 + i, x=x0 * 2 + j) for j in range(m)] for i in range(m)], rgb)

    width_m = n * 40075016.686 * math.cos(math.radians(c["lat"])) / 2**z
    full_cell = width_m / height.shape[0]
    mesh = cv2.resize(cv2.GaussianBlur(height, (0, 0), 0.8), (MESH, MESH), interpolation=cv2.INTER_AREA)
    med = cv2.medianBlur(mesh.astype(np.float32), 5)
    spikes = np.abs(mesh - med) > 400
    mesh[spikes] = med[spikes]

    def lon_of(x: float) -> float:
        return x / 2**z * 360 - 180

    def lat_of(y: float) -> float:
        return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / 2**z))))

    out = os.path.join(ROOT, "public", "terrain", cid)
    os.makedirs(out, exist_ok=True)
    np.round(mesh).astype("<u2").tofile(os.path.join(out, "height.bin"))
    Image.fromarray(normals(height, full_cell, c["exag"], NORMALS)).save(os.path.join(out, "normal.jpg"), quality=92)
    painted = paint(cv2.resize(color, (TEXTURE, TEXTURE), interpolation=cv2.INTER_AREA), cid)
    Image.fromarray(painted).save(os.path.join(out, "color.jpg"), quality=82, optimize=True, progressive=True)
    Image.fromarray(cv2.resize(painted, (2048, 2048), interpolation=cv2.INTER_AREA)).save(os.path.join(out, "color-2k.jpg"), quality=84, optimize=True, progressive=True)

    marks = {}
    for name, (la, lo) in c["marks"].items():
        mx, my = tile_xy(la, lo, z)
        u, v = (mx - x0) / n, (my - y0) / n
        hh = float(mesh[min(MESH - 1, max(0, int(v * MESH))), min(MESH - 1, max(0, int(u * MESH)))])
        marks[name] = [round(u, 3), round(v, 3), round(hh)]
    meta = {
        "id": cid, "imagery": c["src"], "size": MESH, "widthMeters": round(width_m), "exaggeration": c["exag"],
        "minHeight": float(mesh.min()), "maxHeight": float(mesh.max()), "lat": c["lat"], "lon": c["lon"],
        "bounds": {"west": lon_of(x0), "east": lon_of(x0 + n), "north": lat_of(y0), "south": lat_of(y0 + n)},
        "landmarks": marks,
    }
    json.dump(meta, open(os.path.join(out, "meta.json"), "w"), indent=1)

    prev = os.path.join(ROOT, "data", "preview")
    os.makedirs(prev, exist_ok=True)
    shade = cv2.cvtColor(cv2.resize(hillshade(mesh, width_m / MESH), (768, 768)), cv2.COLOR_GRAY2RGB)
    for g in range(1, 10):
        p = int(g * 76.8)
        cv2.line(shade, (p, 0), (p, 768), (0, 160, 255), 1)
        cv2.line(shade, (0, p), (768, p), (0, 160, 255), 1)
    for name, (u, v, hh) in marks.items():
        cv2.circle(shade, (int(u * 768), int(v * 768)), 6, (255, 0, 0), 2)
        cv2.putText(shade, f"{name} {hh}m", (int(u * 768) + 8, int(v * 768)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 0, 0), 1)
    Image.fromarray(shade).save(os.path.join(prev, f"{cid}-shade.jpg"), quality=82)
    Image.fromarray(cv2.resize(painted, (768, 768))).save(os.path.join(prev, f"{cid}-paint.jpg"), quality=82)
    print(f"[{cid}] {width_m / 1000:.1f} km, {mesh.min():.0f}-{mesh.max():.0f} m, marks {marks}", flush=True)


if __name__ == "__main__":
    for cid in sys.argv[1:] or list(CHAPTERS):
        build(cid)
