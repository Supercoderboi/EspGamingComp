import json
import tempfile
import unittest
from pathlib import Path

from tools.build_game_site import build
from tools.gsc_pack import unpack


class BuildGameSiteTests(unittest.TestCase):
    def test_outputs_packed_games_and_matching_catalog_paths(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            games = root / "games"
            (games / "arcade").mkdir(parents=True)
            source = b'function init() {}\nfunction draw() {}\n'
            (games / "arcade" / "my_game.gs").write_bytes(source)

            catalog = build(games, root / "site")
            catalog_file = json.loads((root / "site" / "games.json").read_text(encoding="utf-8"))
            self.assertEqual(catalog_file, catalog)
            self.assertEqual(catalog[0]["file"], "games/arcade/my_game.gsc")
            packed_file = root / "site" / catalog[0]["file"]
            self.assertEqual(unpack(packed_file.read_bytes()), source)

    def test_rejects_empty_game_directory(self):
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(ValueError):
                build(Path(temporary) / "games", Path(temporary) / "site")


if __name__ == "__main__":
    unittest.main()
