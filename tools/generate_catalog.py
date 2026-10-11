
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GAMES_DIR = ROOT / "games"
CATALOG_FILE = ROOT / "games.json"

def read_metadata(path):
    metadata = {}

    with path.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.lstrip().startswith("//"):
                break

            match = re.match(
                r"\s*//\s*@([\w-]+)\s*:\s*(.*?)\s*$",
                line
            )

            if match:
                metadata[match.group(1)] = match.group(2)

    game_id = re.sub(
        r"[^a-z0-9-]+", "-",
        path.stem.lower()
    ).strip("-")

    return {
        "id": metadata.get("id", game_id),
        "name": metadata.get("name", path.stem.title()),
        "description": metadata.get(
            "description", "GameScript game."
        ),
        "engine": metadata.get("engine", "GameScript"),
        "version": metadata.get("version", "1.0.0"),
        "file": path.relative_to(ROOT).as_posix(),
        "format": "gs"
    }

def main():
    games = sorted(
        (read_metadata(path)
         for path in GAMES_DIR.rglob("*.gs")),
        key=lambda game: game["id"]
    )

    ids = [game["id"] for game in games]
    if len(ids) != len(set(ids)):
        raise SystemExit("Error: duplicate game IDs found.")

    catalog = {
        "schema_version": 1,
        "catalog_name": "ESP GameOS Games",
        "game_count": len(games),
        "games": games
    }

    CATALOG_FILE.write_text(
        json.dumps(catalog, indent=2) + "\n",
        encoding="utf-8"
    )

    print(f"Generated games.json with {len(games)} games.")

if __name__ == "__main__":
    main()
