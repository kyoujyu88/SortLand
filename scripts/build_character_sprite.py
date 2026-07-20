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

EXTRA_CHARACTERS = [
    "library-girl.png",
    "patience-girl.png",
    "dualpivot-girl.png",
    "smooth-girl.png",
    "sleep-girl.png",
    "flash-girl.png",
    "americanflag-girl.png",
    "mergeinsertion-girl.png",
    "slow-girl.png",
]


def build_sheet(characters: list[str], columns: int, rows: int, basename: str) -> None:
    character_dir = ROOT / "assets" / "characters"
    png_output = ROOT / "assets" / f"{basename}-source.png"
    webp_output = ROOT / "public" / f"{basename}.webp"

    canvas = Image.new(
        "RGB",
        (columns * CELL_SIZE, rows * CELL_SIZE),
        "#f5f0e5",
    )

    for icon_index, filename in enumerate(characters):
        column = icon_index % columns
        row = icon_index // columns
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


def main() -> None:
    build_sheet(NEW_CHARACTERS, COLUMNS, ROWS, "sort-characters-new")
    build_sheet(EXTRA_CHARACTERS, 3, 3, "sort-characters-extra")


if __name__ == "__main__":
    main()
