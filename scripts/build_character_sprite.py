from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CELL_SIZE = 256
COLUMNS = 3
ROWS = 2

NEW_CHARACTERS = [
    "bogo-gorilla.png",
    "bitonic-girl.png",
    "circle-girl.png",
    "bead-girl.png",
    "tournament-girl.png",
    "tree-girl.png",
]


def main() -> None:
    character_dir = ROOT / "assets" / "characters"
    png_output = ROOT / "assets" / "sort-characters-new-source.png"
    webp_output = ROOT / "public" / "sort-characters-new.webp"

    canvas = Image.new(
        "RGB",
        (COLUMNS * CELL_SIZE, ROWS * CELL_SIZE),
        "#f5f0e5",
    )

    for icon_index, filename in enumerate(NEW_CHARACTERS):
        column = icon_index % COLUMNS
        row = icon_index // COLUMNS
        with Image.open(character_dir / filename) as image:
            tile = ImageOps.fit(
                image.convert("RGB"),
                (CELL_SIZE, CELL_SIZE),
                Image.Resampling.LANCZOS,
                centering=(0.5, 0.5),
            )
        canvas.paste(tile, (column * CELL_SIZE, row * CELL_SIZE))

    canvas.save(png_output, optimize=True)
    canvas.save(webp_output, "WEBP", quality=88, method=6)
    print(f"wrote {png_output.relative_to(ROOT)} {canvas.size}")
    print(f"wrote {webp_output.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
