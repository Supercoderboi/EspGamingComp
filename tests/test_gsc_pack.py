import unittest

from tools.gsc_pack import MAX_SOURCE, MAGIC, pack, unpack


class GscPackTests(unittest.TestCase):
    def test_round_trip_repetitive_and_utf8_source(self):
        source = ('let player = { x: 10, y: 20 };\n' * 24 + 'drawText("héllo", 0, 0, WHITE);').encode()
        artifact = pack(source)
        self.assertTrue(artifact.startswith(MAGIC))
        self.assertLess(len(artifact), len(source))
        self.assertEqual(unpack(artifact), source)

    def test_round_trip_window_boundaries(self):
        source = ('αβγ0123456789\n' * 600).encode()
        self.assertEqual(unpack(pack(source)), source)

    def test_rejects_oversized_source(self):
        with self.assertRaises(ValueError):
            pack(b'x' * (MAX_SOURCE + 1))

    def test_rejects_invalid_back_reference(self):
        # GSC1, one output byte, then a match at distance one before any output.
        with self.assertRaises(ValueError):
            unpack(b'GSC1\x01\x00\x01\x00\x00')


if __name__ == '__main__':
    unittest.main()
