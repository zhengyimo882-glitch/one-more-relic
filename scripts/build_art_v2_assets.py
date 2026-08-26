from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artifacts" / "art-v2-source"
OUTPUT = ROOT / "public" / "assets" / "art-v2"


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True)


def clean_character_fringe(image: Image.Image) -> Image.Image:
    image = image.copy().convert("RGBA")
    alpha = image.getchannel("A")
    expanded_empty = ImageOps.invert(alpha).filter(ImageFilter.MaxFilter(3))
    pixels = image.load()
    edge = expanded_empty.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            saturated_fringe = max(r, g, b) - min(r, g, b) > 105
            if a and edge[x, y] > 0 and saturated_fringe and (r > 125 or g > 125):
                pixels[x, y] = (r, g, b, max(0, a - 180))
    return image


def resize_sheet(source: str, output: str) -> Image.Image:
    image = Image.open(SOURCE / source).convert("RGBA")
    image = image.resize((512, 512), Image.Resampling.NEAREST)
    image = clean_character_fringe(image)
    save_png(image, OUTPUT / "characters" / output)
    return image


def portrait_from_cell(sheet: Image.Image, output: str) -> None:
    cell = sheet.crop((0, 0, 128, 128))
    alpha_bbox = cell.getchannel("A").getbbox()
    if alpha_bbox is None:
        raise RuntimeError(f"No visible portrait pixels for {output}")
    left, top, right, bottom = alpha_bbox
    bottom = min(bottom, top + int((bottom - top) * 0.72))
    crop = cell.crop((left, top, right, bottom))
    canvas = Image.new("RGBA", (192, 192))
    scale = min(158 / crop.width, 174 / crop.height)
    crop = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.NEAREST,
    )
    canvas.alpha_composite(crop, ((192 - crop.width) // 2, 192 - crop.height - 4))
    save_png(canvas, OUTPUT / "portraits" / output)


def chroma_extract(source: str) -> Image.Image:
    image = Image.open(SOURCE / source).convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            green_strength = g - max(r, b)
            if g > 150 and green_strength > 48:
                alpha = 0
            elif g > 92 and green_strength > 28:
                alpha = max(0, min(255, int(255 * (48 - green_strength) / 20)))
            else:
                alpha = 255
            if alpha < 255 and g > max(r, b):
                g = max(r, b)
            pixels[x, y] = (r, g, b, alpha)
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise RuntimeError(f"Chroma extraction removed all pixels in {source}")
    return image.crop(bbox)


def fit_alpha(source: Image.Image, size: tuple[int, int], margin: int, nearest: bool) -> Image.Image:
    canvas = Image.new("RGBA", size)
    target = source.copy()
    target.thumbnail(
        (size[0] - margin * 2, size[1] - margin * 2),
        Image.Resampling.NEAREST if nearest else Image.Resampling.LANCZOS,
    )
    x = (size[0] - target.width) // 2
    y = (size[1] - target.height) // 2
    canvas.alpha_composite(target, (x, y))
    return canvas


def artifact_tiers(asset_id: str, source: str) -> None:
    cutout = chroma_extract(source)
    save_png(cutout, SOURCE / f"{asset_id}-alpha.png")
    save_png(
        fit_alpha(cutout, (64, 64), 5, True),
        OUTPUT / "artifacts" / "world" / f"{asset_id}-v2-world.png",
    )
    save_png(
        fit_alpha(cutout, (96, 96), 7, True),
        OUTPUT / "artifacts" / "inventory" / f"{asset_id}-v2-inventory.png",
    )
    save_png(
        fit_alpha(cutout, (640, 480), 34, False),
        OUTPUT / "artifacts" / "inspection" / f"{asset_id}-v2-inspection.png",
    )


def create_character_shadow(sheet: Image.Image) -> None:
    idle = sheet.crop((0, 0, 128, 128))
    alpha = idle.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("Hero shadow source has no alpha")
    silhouette = alpha.crop(bbox).resize((48, 10), Image.Resampling.LANCZOS)
    silhouette = silhouette.filter(ImageFilter.GaussianBlur(1.1))
    shadow = Image.new("RGBA", (64, 24))
    colored = Image.new("RGBA", silhouette.size, (7, 9, 7, 0))
    colored.putalpha(silhouette.point(lambda value: int(value * 0.58)))
    shadow.alpha_composite(colored, (8, 8))
    save_png(shadow, OUTPUT / "effects" / "character-ground-shadow-v2.png")


def ui_panel(source: str, output: str) -> None:
    image = Image.open(SOURCE / source).convert("RGBA")
    image = image.resize((512, 512), Image.Resampling.LANCZOS)
    save_png(image, OUTPUT / "ui" / output)


def grade_cellar() -> None:
    source = ROOT / "public" / "assets" / "generated" / "tomb_cellar_v1" / "hidden_cellar_room.png"
    image = Image.open(source).convert("RGB")
    # Bring the cellar to the main tomb's texel scale, then apply a restrained cold-cyan grade.
    low = image.resize((627, 627), Image.Resampling.LANCZOS)
    image = low.resize(image.size, Image.Resampling.NEAREST)
    image = ImageEnhance.Contrast(image).enhance(0.88)
    image = ImageEnhance.Color(image).enhance(0.72)
    overlay = Image.new("RGB", image.size, (66, 103, 106))
    image = Image.blend(image, overlay, 0.13)
    save_png(image.convert("RGBA"), OUTPUT / "scenes" / "hidden-cellar-room-v2.png")


def main() -> None:
    hero = resize_sheet("hero-sheet-alpha.png", "protagonist-v2-sheet.png")
    shopkeeper = resize_sheet("shopkeeper-sheet-alpha.png", "shopkeeper-v2-sheet.png")
    portrait_from_cell(hero, "protagonist-v2-portrait.png")
    portrait_from_cell(shopkeeper, "shopkeeper-v2-portrait.png")
    create_character_shadow(hero)

    artifact_tiers("geomancers-compass", "geomancers-compass-master.png")
    artifact_tiers("myriad-character-atlas", "myriad-character-atlas-master.png")
    artifact_tiers("burial-vessel", "burial-vessel-master.png")
    artifact_tiers("bronze-mirror", "bronze-mirror-master.png")

    ui_panel("dark-brass-panel-master.png", "dark-brass-panel-v2.png")
    ui_panel("old-paper-panel-master.png", "old-paper-panel-v2.png")
    grade_cellar()

    for path in sorted(OUTPUT.rglob("*.png")):
        with Image.open(path) as image:
            alpha = image.getextrema()[-1] if image.mode == "RGBA" else None
            print(f"{path.relative_to(ROOT)}\t{image.mode}\t{image.size}\talpha={alpha}")


if __name__ == "__main__":
    main()
