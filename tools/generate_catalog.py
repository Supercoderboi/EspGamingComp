#!/usr/bin/env python3
import os
import json
import re
import sys

GAMES_DIR = "games"
CATALOG_FILE = "games.json"

def parse_metadata(file_path):
    metadata = {}
    pattern = re.compile(r"^\s*//\s*@(\w+):\s*(.+)$")
    
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            match = pattern.match(line)
            if match:
                key, val = match.group(1).strip().lower(), match.group(2).strip()
                metadata[key] = val
            elif line.strip() and not line.strip().startswith("//"):
                break
    return metadata

def build_catalog():
    if not os.path.exists(GAMES_DIR):
        print(f"Error: Directory '{GAMES_DIR}' not found.", file=sys.stderr)
        sys.exit(1)

    games = []
    seen_ids = set()

    for root, _, files in os.walk(GAMES_DIR):
        for file in sorted(files):
            if file.endswith(".gs"):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ".").replace("\\", "/")
                meta = parse_metadata(full_path)
                
                game_id = meta.get("id", os.path.splitext(file)[0].lower())
                
                if not re.match(r"^[a-z0-9_\-]+$", game_id):
                    print(f"Error: Invalid game ID '{game_id}' in {rel_path}", file=sys.stderr)
                    sys.exit(1)
                    
                if game_id in seen_ids:
                    print(f"Error: Duplicate game ID '{game_id}' found in {rel_path}", file=sys.stderr)
                    sys.exit(1)
                
                seen_ids.add(game_id)

                game_entry = {
                    "id": game_id,
                    "name": meta.get("name", game_id.capitalize()),
                    "description": meta.get("description", "No description provided."),
                    "engine": meta.get("engine", "GameScript"),
                    "version": meta.get("version", "1.0.0"),
                    "file": rel_path,
                    "format": "gs"
                }
                games.append(game_entry)

    games.sort(key=lambda x: x["id"])

    catalog = {
        "schema_version": 1,
        "catalog_name": "ESP GameOS Games",
        "game_count": len(games),
        "games": games
    }

    new_content = json.dumps(catalog, indent=2) + "\n"

    if os.path.exists(CATALOG_FILE):
        with open(CATALOG_FILE, "r", encoding="utf-8") as f:
            if f.read() == new_content:
                print("Catalog is already up to date.")
                return

    with open(CATALOG_FILE, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"Successfully generated {CATALOG_FILE} with {len(games)} games.")

if __name__ == "__main__":
    build_catalog()
