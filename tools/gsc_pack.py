#!/usr/bin/env python3
"""Pack GameScript source into the bounded GSC1 transport format.

GSC1 is a compact transport artifact, not native code and not VM bytecode.
The ESP32 expands it to LittleFS and runs the regular GameScript interpreter.
"""

from __future__ import annotations

import argparse
from pathlib import Path

MAGIC = b"GSC1"
MAX_SOURCE = 12 * 1024
WINDOW = 512
MIN_MATCH = 3
MAX_MATCH = 18


def pack(source: bytes) -> bytes:
    if not source or len(source) > MAX_SOURCE:
        raise ValueError(f"source must be between 1 and {MAX_SOURCE} bytes")
    source.decode("utf-8")
    payload = bytearray()
    pos = 0
    while pos < len(source):
        control_at = len(payload)
        payload.append(0)
        control = 0
        for bit in range(8):
            if pos >= len(source):
                break
            best_len = 0
            best_dist = 0
            start = max(0, pos - WINDOW)
            # Recent candidates first keeps this bounded and favors short offsets.
            for candidate in range(pos - 1, start - 1, -1):
                if source[candidate:candidate + MIN_MATCH] != source[pos:pos + MIN_MATCH]:
                    continue
                length = MIN_MATCH
                while length < MAX_MATCH and pos + length < len(source):
                    if source[candidate + (length % (pos - candidate))] != source[pos + length]:
                        break
                    length += 1
                if length > best_len:
                    best_len = length
                    best_dist = pos - candidate
                    if length == MAX_MATCH:
                        break
            if best_len >= MIN_MATCH:
                control |= 1 << bit
                packed_distance = best_dist - 1  # 9 bits; range 0..511
                payload.append(packed_distance & 0xFF)
                payload.append(((packed_distance >> 8) & 1) | ((best_len - MIN_MATCH) << 1))
                end = pos + best_len
                # Index every newly available 3-byte sequence for future matches.
                pos = end
            else:
                payload.append(source[pos])
                pos += 1
        payload[control_at] = control
    return MAGIC + len(source).to_bytes(2, "little") + payload


def unpack(data: bytes) -> bytes:
    if len(data) < 6 or data[:4] != MAGIC:
        raise ValueError("invalid GSC1 header")
    expected = int.from_bytes(data[4:6], "little")
    if expected == 0 or expected > MAX_SOURCE:
        raise ValueError("invalid GSC1 source length")
    output = bytearray()
    pos = 6
    while len(output) < expected:
        if pos >= len(data):
            raise ValueError("truncated GSC1 control byte")
        control = data[pos]
        pos += 1
        for bit in range(8):
            if len(output) >= expected:
                break
            if control & (1 << bit):
                if pos + 2 > len(data):
                    raise ValueError("truncated GSC1 match")
                low, high = data[pos], data[pos + 1]
                pos += 2
                distance = (low | ((high & 1) << 8)) + 1
                length = (high >> 1) + MIN_MATCH
                if distance > len(output) or len(output) + length > expected:
                    raise ValueError("invalid GSC1 match bounds")
                for _ in range(length):
                    output.append(output[-distance])
            else:
                if pos >= len(data):
                    raise ValueError("truncated GSC1 literal")
                output.append(data[pos])
                pos += 1
    if pos != len(data):
        raise ValueError("unexpected trailing GSC1 data")
    output.decode("utf-8")
    return bytes(output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="a .gs file or directory containing .gs files")
    parser.add_argument("output", type=Path, help="output .gsc file or destination directory")
    args = parser.parse_args()
    sources = sorted(args.source.rglob("*.gs")) if args.source.is_dir() else [args.source]
    if not sources:
        raise SystemExit(f"no .gs files found under {args.source}")
    args.output.mkdir(parents=True, exist_ok=True) if args.source.is_dir() else args.output.parent.mkdir(parents=True, exist_ok=True)
    for path in sources:
        relative = path.relative_to(args.source) if args.source.is_dir() else Path(path.name)
        target = (args.output / relative).with_suffix(".gsc") if args.source.is_dir() else args.output
        artifact = pack(path.read_bytes())
        if unpack(artifact) != path.read_bytes():
            raise SystemExit(f"internal round-trip check failed: {path}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(artifact)
        print(f"{path} -> {target}: {path.stat().st_size} -> {len(artifact)} bytes")


if __name__ == "__main__":
    main()
