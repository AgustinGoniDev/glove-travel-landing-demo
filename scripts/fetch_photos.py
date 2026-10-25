"""Downloads the photos of the landing: Glove's own (glovetravel.com) and free-licensed ones from
Wikimedia Commons for every place Glove sells. Writes public/photos/<group>/<slug>.jpg (max 1800 px)
and public/photos/credits.json (author, license and source of each Commons photo).

Usage: python -I scripts/fetch_photos.py
"""
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "photos")
UA = {"User-Agent": "glove-landing-demo/0.1 (https://github.com/AgustinGoniDev; demo, credits kept)"}
MAX = 1800

GLOVE = {
    "patagonia-chile": "https://glovetravel.com/regiones/chilean-patagonia-20211012135812.jpg",
    "gran-patagonia": "https://glovetravel.com/regiones/2-gran-patagonia-20210824182923.jpg",
    "vik": "https://glovetravel.com/regiones/5-vik-20211013145009.jpg",
    "bahia-bustamante": "https://glovetravel.com/regiones/bahia-bustamante-lodge-36-20240519182108.jpeg",
    "buenos-aires": "https://glovetravel.com/regiones/caba-12-20240519180935.jpeg",
    "chile": "https://glovetravel.com/regiones/chile-20210824184409.jpg",
    "easter-island": "https://glovetravel.com/regiones/easter-islands-2-20211025124603.jpg",
    "chiloe": "https://glovetravel.com/regiones/excursiones-tierra-chiloe-7-20211007091756.jpg",
    "glaciarium": "https://glovetravel.com/regiones/glaciarium-add-on-20240519181632.jpg",
    "bariloche": "https://glovetravel.com/regiones/para-ingresar-en-bariloche-se-hxcrzxhf5-720x0-1-20211005145310.jpg",
    "purmamarca": "https://glovetravel.com/regiones/purmamarca-3-20211005144031.jpg",
    "tierra-del-fuego": "https://glovetravel.com/regiones/tierra-del-fuego-laguna-esmeralda-2-20240519183122.jpeg",
    "iguazu": "https://glovetravel.com/regiones/upper-circuit-3-20211005144531.jpg",
    "destinations-header": "https://glovetravel.com/images/destinations-header-4.jpg",
    "kayak-grey": "https://glovetravel.com/blog/1487103066kayaklagogrey-1-20240110150927.jpeg",
    "ibera": "https://glovetravel.com/actions/17-ibera-wetlands-marsh-deer-20250305114628.jpeg",
    "header": "https://glovetravel.com/glove/glove-header-3-20210728185631.jpg",
}

COMMONS = {
    "torres-del-paine": "Torres del Paine towers",
    "cuernos-del-paine": "Cuernos del Paine",
    "perito-moreno": "Perito Moreno Glacier",
    "fitz-roy": "Monte Fitz Roy",
    "laguna-de-los-tres": "Laguna de los Tres Fitz Roy",
    "licancabur": "Licancabur volcano",
    "valle-de-la-luna": "Valle de la Luna San Pedro de Atacama",
    "atacama-flamingos": "flamingos Laguna Chaxa",
    "atacama-stars": "Atacama Milky Way night sky",
    "osorno": "Volcán Osorno Llanquihue",
    "petrohue": "Saltos del Petrohué",
    "moai": "Ahu Tongariki moai",
    "iguazu": "Garganta del Diablo Iguazu",
    "mendoza-vineyard": "Mendoza vineyard Andes",
    "colchagua": "Valle de Colchagua viñedo",
    "chiloe": "Palafitos Castro Chiloé",
    "purmamarca": "Cerro de los Siete Colores Purmamarca",
    "condor": "Andean condor flying",
    "guanaco": "Guanaco Torres del Paine",
    "antarctica": "Antarctic Peninsula iceberg",
    "ushuaia": "Beagle Channel lighthouse",
    "marble-caves": "Capillas de Mármol",
    "valparaiso": "Valparaíso cerros",
    "aconcagua": "Aconcagua",
}
LICENSES = ("cc by", "cc-by", "cc0", "public domain", "pd", "cc by-sa", "cc-by-sa")


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return r.read()


def save(data: bytes, path: str) -> tuple[int, int]:
    im = Image.open(io.BytesIO(data)).convert("RGB")
    im.thumbnail((MAX, MAX))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, quality=84, optimize=True, progressive=True)
    return im.size


def strip(html: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def commons(slug: str, query: str, want: int = 2) -> list[dict]:
    api = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode({
        "action": "query", "format": "json", "generator": "search", "gsrsearch": f"filetype:bitmap {query}",
        "gsrnamespace": 6, "gsrlimit": 20, "prop": "imageinfo", "iiprop": "url|size|extmetadata", "iiurlwidth": MAX,
    })
    pages = json.loads(get(api)).get("query", {}).get("pages", {})
    ranked = sorted(pages.values(), key=lambda p: p.get("index", 99))
    out = []
    for p in ranked:
        info = (p.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        lic = strip(meta.get("LicenseShortName", {}).get("value", "")).lower()
        w, h = info.get("width", 0), info.get("height", 0)
        if w < 1600 or w < h * 1.2 or not any(lic.startswith(l) for l in LICENSES):
            continue
        n = len(out) + 1
        path = os.path.join(OUT, "commons", f"{slug}-{n}.jpg")
        try:
            size = save(get(info["thumburl"]), path)
        except Exception as e:
            print("  skip", p["title"], e)
            continue
        out.append({
            "file": f"photos/commons/{slug}-{n}.jpg", "topic": slug, "title": p["title"].removeprefix("File:"),
            "author": strip(meta.get("Artist", {}).get("value", ""))[:120], "license": strip(meta.get("LicenseShortName", {}).get("value", "")),
            "source": info.get("descriptionurl"), "size": size,
        })
        if len(out) >= want:
            break
    print(f"{slug}: {len(out)}")
    return out


def main() -> None:
    def glove(item):
        slug, url = item
        try:
            size = save(get(url), os.path.join(OUT, "glove", f"{slug}.jpg"))
            print("glove", slug, size)
        except Exception as e:
            print("glove FAIL", slug, e)

    with ThreadPoolExecutor(6) as ex:
        list(ex.map(glove, GLOVE.items()))
    credits = []
    for slug, q in COMMONS.items():
        try:
            credits += commons(slug, q)
        except Exception as e:
            print("commons FAIL", slug, e)
    json.dump(credits, open(os.path.join(OUT, "credits.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("total commons", len(credits))


if __name__ == "__main__":
    main()
