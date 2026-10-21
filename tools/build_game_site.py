#!/usr/bin/env python3
"""Build a GitHub Pages directory containing packed GameScript and games.json."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

try:  # Script execution from tools/ and import during unit tests.
    from .gsc_pack import pack, unpack
except ImportError:
    from gsc_pack import pack, unpack


def game_id(path: Path) -> str:
    value = re.sub(r"[^a-z0-9_-]+", "_", path.stem.lower()).strip("_")
    if not value:
        raise ValueError(f"cannot derive a game id from {path}")
    return value


def build(source_dir: Path, output_dir: Path) -> list[dict[str, str]]:
    sources = sorted(source_dir.rglob("*.gs"))
    if not sources:
        raise ValueError(f"no .gs games found under {source_dir}")

    output_games = output_dir / "games"
    output_games.mkdir(parents=True, exist_ok=True)
    catalog = []
    seen_ids = set()
    for source in sources:
        relative = source.relative_to(source_dir).with_suffix(".gsc")
        identifier = game_id(source)
        if identifier in seen_ids:
            raise ValueError(f"duplicate game id {identifier!r}; game filenames must be unique")
        seen_ids.add(identifier)

        raw = source.read_bytes()
        packed = pack(raw)
        if unpack(packed) != raw:
            raise ValueError(f"GSC1 round-trip failed for {source}")
        target = output_games / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(packed)
        catalog.append({
            "id": identifier,
            "name": source.stem.replace("_", " ").replace("-", " ").title(),
            "file": (Path("games") / relative).as_posix(),
        })
        print(f"{source} -> {target}: {len(raw)} -> {len(packed)} bytes")

    (output_dir / "games.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    return catalog


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="directory containing .gs games")
    parser.add_argument("output", type=Path, help="Pages-ready output directory")
    args = parser.parse_args()
    catalog = build(args.source, args.output)
    print(f"Wrote {len(catalog)} games to {args.output / 'games.json'}")


if __name__ == "__main__":
    main()
