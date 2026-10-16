#!/usr/bin/env python3
"""Compare a PNG in the working tree to the same path at a git ref (default HEAD).

Stdlib only. Same-size pixel diff plus overlap/tail analysis when height differs.
"""
from __future__ import annotations

import argparse
import struct
import subprocess
import sys
import zlib
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

PNG_SIG = b"\x89PNG\r\n\x1a\n"
QUANT = 16
ROW_BANDS = 16


def repo_root() -> Path:
    out = subprocess.check_output(
        ["git", "rev-parse", "--show-toplevel"],
        text=True,
    ).strip()
    return Path(out)


def rel_to_repo(path: Path, root: Path) -> str:
    try:
        return path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        raise SystemExit(f"not under git root ({root}): {path}") from None


def git_png_bytes(root: Path, ref: str, relpath: str) -> bytes:
    try:
        return subprocess.check_output(
            ["git", "show", f"{ref}:{relpath}"],
            cwd=root,
        )
    except subprocess.CalledProcessError:
        raise SystemExit(f"git show {ref}:{relpath} failed") from None


def _paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def _unfilter(raw: bytes, width: int, height: int, bpp: int) -> bytes:
    stride = width * bpp
    out = bytearray(height * stride)
    prev = bytearray(stride)
    i = 0
    for y in range(height):
        ftype = raw[i]
        i += 1
        row = bytearray(raw[i : i + stride])
        i += stride
        if ftype == 1:
            for x in range(bpp, stride):
                row[x] = (row[x] + row[x - bpp]) & 0xFF
        elif ftype == 2:
            for x in range(stride):
                row[x] = (row[x] + prev[x]) & 0xFF
        elif ftype == 3:
            for x in range(stride):
                left = row[x - bpp] if x >= bpp else 0
                up = prev[x]
                row[x] = (row[x] + ((left + up) // 2)) & 0xFF
        elif ftype == 4:
            for x in range(stride):
                left = row[x - bpp] if x >= bpp else 0
                up = prev[x]
                up_left = prev[x - bpp] if x >= bpp else 0
                row[x] = (row[x] + _paeth(left, up, up_left)) & 0xFF
        out[y * stride : (y + 1) * stride] = row
        prev = row
    return bytes(out)


def decode_png(data: bytes) -> tuple[int, int, bytes]:
    if data[:8] != PNG_SIG:
        raise ValueError("not a PNG")
    pos = 8
    width = height = 0
    bit_depth = color_type = 0
    idat: list[bytes] = []
    while pos + 12 <= len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        ctype = data[pos + 4 : pos + 8]
        chunk = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if ctype == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(
                ">IIBBBBB",
                chunk[:13],
            )
        elif ctype == b"IDAT":
            idat.append(chunk)
        elif ctype == b"IEND":
            break
    if bit_depth != 8 or color_type not in (2, 6):
        raise ValueError(f"unsupported PNG (depth={bit_depth}, type={color_type})")
    bpp = 3 if color_type == 2 else 4
    raw = zlib.decompress(b"".join(idat))
    flat = _unfilter(raw, width, height, bpp)
    rgba = bytearray(width * height * 4)
    for y in range(height):
        for x in range(width):
            o = (y * width + x) * 4
            i = (y * width + x) * bpp
            rgba[o] = flat[i]
            rgba[o + 1] = flat[i + 1]
            rgba[o + 2] = flat[i + 2]
            rgba[o + 3] = flat[i + 3] if bpp == 4 else 255
    return width, height, bytes(rgba)


def crop_rows(pix: bytes, w: int, y0: int, h: int) -> bytes:
    return pix[y0 * w * 4 : (y0 + h) * w * 4]


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def encode_png_rgba(width: int, height: int, rgba: bytes) -> bytes:
    stride = width * 4
    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(rgba[y * stride : (y + 1) * stride])
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (
        PNG_SIG
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _png_chunk(b"IEND", b"")
    )


def heat_color(d: int) -> tuple[int, int, int]:
    t = min(255, d) / 255.0
    if t <= 0:
        return (0, 0, 0)
    if t < 0.25:
        s = t / 0.25
        return (0, int(60 + 195 * s), int(255 * s))
    if t < 0.5:
        s = (t - 0.25) / 0.25
        return (0, int(255 * (1 - 0.4 * s)), 255)
    if t < 0.75:
        s = (t - 0.5) / 0.25
        return (int(255 * s), 255, int(255 * (1 - s)))
    s = (t - 0.75) / 0.25
    return (255, int(255 * (1 - s)), 0)


def heatmap_path(root: Path, relpath: str) -> Path:
    p = Path(relpath)
    return root / ".cache" / "heatmap" / p.parent / p.name


def row_bytes(pix: bytes, w: int, y: int) -> bytes:
    start = y * w * 4
    return pix[start : start + w * 4]


def align_work_rows_to_ref(
    pix_a: bytes,
    w: int,
    h0: int,
    pix_b: bytes,
    h1: int,
) -> tuple[list[int | None], list[int], dict[str, int]]:
    """Map each working row → ref row (None = insert). deleted_ref rows are ref-only."""
    ref_rows = [row_bytes(pix_a, w, y) for y in range(h0)]
    work_rows = [row_bytes(pix_b, w, y) for y in range(h1)]
    sm = SequenceMatcher(None, ref_rows, work_rows, autojunk=False)
    work_to_ref: list[int | None] = [None] * h1
    deleted_ref: list[int] = []
    counts = {"equal": 0, "replace": 0, "insert": 0, "delete": 0}
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            counts["equal"] += j2 - j1
            for k in range(j2 - j1):
                work_to_ref[j1 + k] = i1 + k
        elif tag == "replace":
            n = min(i2 - i1, j2 - j1)
            counts["replace"] += n
            counts["insert"] += max(0, (j2 - j1) - n)
            counts["delete"] += max(0, (i2 - i1) - n)
            for k in range(n):
                work_to_ref[j1 + k] = i1 + k
            for k in range(n, j2 - j1):
                work_to_ref[j1 + k] = None
            for i in range(i1 + n, i2):
                deleted_ref.append(i)
        elif tag == "insert":
            counts["insert"] += j2 - j1
            for j in range(j1, j2):
                work_to_ref[j] = None
        elif tag == "delete":
            counts["delete"] += i2 - i1
            for i in range(i1, i2):
                deleted_ref.append(i)
    return work_to_ref, deleted_ref, counts


GUTTER = 5
# Unchanged matched pixels: dim RGB, fully opaque (no PNG transparency).
MATCH_DIM = 0.3
INSERT_BAR = (46, 204, 113)
DELETE_BAR = (192, 57, 123)
SEPARATOR_H = 8


def _blend(sr: int, sg: int, sb: int, tr: int, tg: int, tb: int, t: float) -> tuple[int, int, int]:
    return (
        int(sr * (1 - t) + tr * t),
        int(sg * (1 - t) + tg * t),
        int(sb * (1 - t) + tb * t),
    )


def paint_work_pixel(
    out: bytearray,
    o_out: int,
    pix_b: bytes,
    ob: int,
    d: int,
    tol: int,
    row_insert: bool,
    x: int,
) -> None:
    br, bg, bb = pix_b[ob], pix_b[ob + 1], pix_b[ob + 2]
    if row_insert:
        if x < GUTTER:
            out[o_out] = INSERT_BAR[0]
            out[o_out + 1] = INSERT_BAR[1]
            out[o_out + 2] = INSERT_BAR[2]
        else:
            r, g, b = _blend(br, bg, bb, 40, 200, 70, 0.55)
            out[o_out] = r
            out[o_out + 1] = g
            out[o_out + 2] = b
        out[o_out + 3] = 255
        return
    if x < GUTTER:
        if d <= tol:
            out[o_out] = int(br * MATCH_DIM)
            out[o_out + 1] = int(bg * MATCH_DIM)
            out[o_out + 2] = int(bb * MATCH_DIM)
            out[o_out + 3] = 255
            return
        else:
            hr, hg, hb = heat_color(d)
            r, g, b = _blend(br, bg, bb, hr, hg, hb, 0.65)
            out[o_out] = r
            out[o_out + 1] = g
            out[o_out + 2] = b
        out[o_out + 3] = 255
        return
    if d <= tol:
        out[o_out] = int(br * MATCH_DIM)
        out[o_out + 1] = int(bg * MATCH_DIM)
        out[o_out + 2] = int(bb * MATCH_DIM)
        out[o_out + 3] = 255
        return
    hr, hg, hb = heat_color(d)
    mix = min(1.0, 0.45 + d / 512.0)
    out[o_out] = int(br * (1 - mix) + hr * mix)
    out[o_out + 1] = int(bg * (1 - mix) + hg * mix)
    out[o_out + 2] = int(bb * (1 - mix) + hb * mix)
    out[o_out + 3] = 255


def paint_ref_deleted_pixel(
    out: bytearray,
    o_out: int,
    pix_a: bytes,
    oa: int,
    x: int,
) -> None:
    ar, ag, ab = pix_a[oa], pix_a[oa + 1], pix_a[oa + 2]
    if x < GUTTER:
        out[o_out] = DELETE_BAR[0]
        out[o_out + 1] = DELETE_BAR[1]
        out[o_out + 2] = DELETE_BAR[2]
    else:
        r, g, b = _blend(ar, ag, ab, 155, 89, 182, 0.5)
        out[o_out] = r
        out[o_out + 1] = g
        out[o_out + 2] = b
    out[o_out + 3] = 255


def build_heatmap_rgba_aligned(
    pix_a: bytes,
    pix_b: bytes,
    w: int,
    h0: int,
    h1: int,
    tol: int,
    work_to_ref: list[int | None],
    deleted_ref: list[int],
) -> tuple[bytes, int, int]:
    """Working image on top; optional ref-only deleted rows appended below."""
    h_del = len(deleted_ref)
    h_sep = SEPARATOR_H if h_del else 0
    h_out = h1 + h_sep + h_del
    out = bytearray(w * h_out * 4)
    for y in range(h1):
        ref_y = work_to_ref[y]
        row_insert = ref_y is None
        for x in range(w):
            o_out = (y * w + x) * 4
            ob = o_out
            d = 0
            if not row_insert:
                oa = (ref_y * w + x) * 4
                d = max(
                    abs(pix_a[oa] - pix_b[ob]),
                    abs(pix_a[oa + 1] - pix_b[ob + 1]),
                    abs(pix_a[oa + 2] - pix_b[ob + 2]),
                    abs(pix_a[oa + 3] - pix_b[ob + 3]),
                )
            paint_work_pixel(out, o_out, pix_b, ob, d, tol, row_insert, x)
    if h_del:
        base = h1
        for sy in range(h_sep):
            y = base + sy
            for x in range(w):
                o = (y * w + x) * 4
                v = 40 if (sy + x) % 2 == 0 else 28
                out[o : o + 3] = (v, v, v)
                out[o + 3] = 255
        base += h_sep
        for di, ref_y in enumerate(deleted_ref):
            y = base + di
            for x in range(w):
                o_out = (y * w + x) * 4
                oa = (ref_y * w + x) * 4
                paint_ref_deleted_pixel(out, o_out, pix_a, oa, x)
    return bytes(out), w, h_out


def build_heatmap_rgba_xy(
    pix_a: bytes,
    pix_b: bytes,
    w: int,
    h0: int,
    h1: int,
    tol: int,
) -> tuple[bytes, int, int]:
    """Same (x,y) compare — misleading when the page scroll layout shifts."""
    h_out = min(h0, h1)
    out = bytearray(w * h_out * 4)
    for y in range(h_out):
        for x in range(w):
            o_out = (y * w + x) * 4
            oa = o_out
            ob = o_out
            d = max(
                abs(pix_a[oa] - pix_b[ob]),
                abs(pix_a[oa + 1] - pix_b[ob + 1]),
                abs(pix_a[oa + 2] - pix_b[ob + 2]),
                abs(pix_a[oa + 3] - pix_b[ob + 3]),
            )
            paint_work_pixel(out, o_out, pix_b, ob, d, tol, False, x)
    return bytes(out), w, h_out


def write_heatmap(
    pix_a: bytes,
    pix_b: bytes,
    w: int,
    h0: int,
    h1: int,
    tol: int,
    dest: Path,
    mode: str,
) -> tuple[Path, dict[str, int] | None]:
    if mode == "xy":
        rgba, hw, hh = build_heatmap_rgba_xy(pix_a, pix_b, w, h0, h1, tol)
        counts = None
    else:
        work_to_ref, deleted_ref, counts = align_work_rows_to_ref(
            pix_a, w, h0, pix_b, h1,
        )
        rgba, hw, hh = build_heatmap_rgba_aligned(
            pix_a, pix_b, w, h0, h1, tol, work_to_ref, deleted_ref,
        )
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(encode_png_rgba(hw, hh, rgba))
    return dest, counts


def _luma(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def _bucket_hex(r: int, g: int, b: int) -> str:
    br = min(255, (r // QUANT) * QUANT + QUANT // 2)
    bg = min(255, (g // QUANT) * QUANT + QUANT // 2)
    bb = min(255, (b // QUANT) * QUANT + QUANT // 2)
    return f"#{br:02x}{bg:02x}{bb:02x}"


def image_metadata(pix: bytes, w: int, h: int, top_colors: int = 5) -> dict:
    n = w * h
    hist: Counter[str] = Counter()
    luma_sum = 0.0
    opaque = 0
    for i in range(n):
        o = i * 4
        r, g, b, a = pix[o], pix[o + 1], pix[o + 2], pix[o + 3]
        if a < 128:
            continue
        opaque += 1
        luma_sum += _luma(r, g, b)
        hist[_bucket_hex(r, g, b)] += 1
    denom = opaque or n
    mean_luma = luma_sum / denom if denom else 0.0
    total_count = sum(hist.values()) or 1
    colors = [
        (hex_c, 100.0 * count / total_count)
        for hex_c, count in hist.most_common(top_colors)
    ]
    return {
        "mean_luma": mean_luma,
        "opaque_pct": 100.0 * opaque / n if n else 0.0,
        "top_colors": colors,
    }


def print_metadata(label: str, meta: dict) -> None:
    print(f"  {label}: mean luma {meta['mean_luma']:.1f}/255, opaque {meta['opaque_pct']:.1f}%")
    parts = [f"{c} {p:.1f}%" for c, p in meta["top_colors"]]
    print(f"  {label} dominant: " + ", ".join(parts))


def diff_stats(
    a: bytes,
    b: bytes,
    w: int,
    h: int,
    tol: int,
) -> dict:
    grid_n = 8
    grid = [[0] * grid_n for _ in range(grid_n)]
    changed = 0
    max_delta = 0
    delta_sum = 0
    hist_delta = [0, 0, 0, 0, 0]
    row_counts = [0] * h
    col_counts = [0] * w
    bbox = [w, h, 0, 0]
    changed_a: Counter[str] = Counter()
    changed_b: Counter[str] = Counter()
    n = w * h
    for i in range(n):
        o = i * 4
        d = max(
            abs(a[o] - b[o]),
            abs(a[o + 1] - b[o + 1]),
            abs(a[o + 2] - b[o + 2]),
            abs(a[o + 3] - b[o + 3]),
        )
        if d > max_delta:
            max_delta = d
        if d <= tol:
            continue
        changed += 1
        delta_sum += d
        if d == 1:
            hist_delta[0] += 1
        elif d < 8:
            hist_delta[1] += 1
        elif d < 32:
            hist_delta[2] += 1
        elif d < 128:
            hist_delta[3] += 1
        else:
            hist_delta[4] += 1
        x = i % w
        y = i // w
        row_counts[y] += 1
        col_counts[x] += 1
        if bbox[0] > x:
            bbox[0] = x
        if bbox[1] > y:
            bbox[1] = y
        if bbox[2] < x:
            bbox[2] = x
        if bbox[3] < y:
            bbox[3] = y
        gx = min(grid_n - 1, x * grid_n // w)
        gy = min(grid_n - 1, y * grid_n // h)
        grid[gy][gx] += 1
        if a[o + 3] >= 128:
            changed_a[_bucket_hex(a[o], a[o + 1], a[o + 2])] += 1
        if b[o + 3] >= 128:
            changed_b[_bucket_hex(b[o], b[o + 1], b[o + 2])] += 1
    mean_delta = delta_sum / changed if changed else 0.0
    bbox_ok = changed > 0 and bbox[0] <= bbox[2]
    return {
        "changed": changed,
        "max_delta": max_delta,
        "mean_delta": mean_delta,
        "grid": grid,
        "hist_delta": hist_delta,
        "row_counts": row_counts,
        "col_counts": col_counts,
        "bbox": bbox if bbox_ok else None,
        "changed_colors_a": changed_a,
        "changed_colors_b": changed_b,
    }


def _top_from_counter(c: Counter[str], n: int, total: int) -> list[tuple[str, float]]:
    if total <= 0:
        return []
    return [(h, 100.0 * cnt / total) for h, cnt in c.most_common(n)]


def print_grid(grid: list[list[int]], total: int) -> None:
    cell = (total // 64) or 1
    print("8×8 grid (% of cell pixels changed, · = <1%):")
    for gy, row in enumerate(grid):
        parts: list[str] = []
        for gx, count in enumerate(row):
            cpct = 100.0 * count / cell
            parts.append(f"{cpct:4.0f}%" if cpct >= 1 else "   ·")
        print(f"  r{gy} " + " ".join(parts))


def print_hot_rows(row_counts: list[int], w: int, top: int = 5) -> None:
    indexed = [(y, 100.0 * c / w) for y, c in enumerate(row_counts) if c > 0]
    indexed.sort(key=lambda t: t[1], reverse=True)
    if not indexed:
        return
    bits = ", ".join(f"y={y} {pct:.0f}%" for y, pct in indexed[:top])
    print(f"hot rows (width-normalized): {bits}")


def print_hot_cols(col_counts: list[int], h: int, top: int = 5) -> None:
    indexed = [(x, 100.0 * c / h) for x, c in enumerate(col_counts) if c > 0]
    indexed.sort(key=lambda t: t[1], reverse=True)
    if not indexed:
        return
    bits = ", ".join(f"x={x} {pct:.0f}%" for x, pct in indexed[:top])
    print(f"hot cols (height-normalized): {bits}")


def print_row_bands(row_counts: list[int], w: int, h: int) -> None:
    """One-line vertical profile: % pixels changed per horizontal band."""
    bands = [0] * ROW_BANDS
    band_h = max(1, h // ROW_BANDS)
    for y, c in enumerate(row_counts):
        bi = min(ROW_BANDS - 1, y // band_h)
        bands[bi] += c
    cells = band_h * w
    chars = "·░▒▓█"
    line = []
    for bi, cnt in enumerate(bands):
        pct = 100.0 * cnt / cells if cells else 0.0
        idx = min(len(chars) - 1, int(pct / 20))
        line.append(chars[idx])
    pct_labels = " ".join(f"{bi * 100 // ROW_BANDS:>2}%" for bi in range(ROW_BANDS))
    print(f"vertical profile ({ROW_BANDS} bands, top→bottom): {''.join(line)}")
    print(f"  band tops: {pct_labels}")


def hottest_row(row_counts: list[int], w: int, min_pct: float = 30.0) -> int | None:
    if not w:
        return None
    best_y = 0
    best_pct = 0.0
    for y, c in enumerate(row_counts):
        pct = 100.0 * c / w
        if pct > best_pct:
            best_pct = pct
            best_y = y
    if best_pct < min_pct:
        return None
    return best_y


def first_heavy_row(row_counts: list[int], w: int, calm_pct: float = 5.0, heavy_pct: float = 25.0) -> int | None:
    calm_need = max(8, len(row_counts) // 20)
    calm_run = 0
    for y, c in enumerate(row_counts):
        pct = 100.0 * c / w if w else 0.0
        if pct < calm_pct:
            calm_run += 1
            continue
        if pct >= heavy_pct and calm_run >= calm_need:
            return y
        calm_run = 0
    return None


def print_diff_section(
    title: str,
    stats: dict,
    w: int,
    h: int,
    tol_label: str,
) -> bool:
    changed = stats["changed"]
    total = w * h
    pct = 100.0 * changed / total if total else 0.0
    print(f"\n--- {title} ({w}×{h}, tolerance {tol_label}) ---")
    print(
        f"diff: {changed}/{total} pixels ({pct:.2f}%), "
        f"max Δ {stats['max_delta']}, mean Δ on changed {stats['mean_delta']:.2f}",
    )
    if changed == 0:
        print("identical in this region")
        return False

    hd = stats["hist_delta"]
    print(
        "delta histogram: "
        f"Δ=1:{hd[0]}  2-7:{hd[1]}  8-31:{hd[2]}  32-127:{hd[3]}  128+:{hd[4]}",
    )
    bb = stats["bbox"]
    if bb is not None:
        bw = bb[2] - bb[0] + 1
        bh = bb[3] - bb[1] + 1
        print(
            f"changed bbox: x={bb[0]}..{bb[2]} y={bb[1]}..{bb[3]} "
            f"({bw}×{bh}, {100.0 * bw * bh / total:.1f}% of region)",
        )
    ca = _top_from_counter(stats["changed_colors_a"], 3, changed)
    cb = _top_from_counter(stats["changed_colors_b"], 3, changed)
    if ca:
        print(
            "colors on changed pixels — before: "
            + ", ".join(f"{c} {p:.0f}%" for c, p in ca),
        )
    if cb:
        print(
            "colors on changed pixels — after:  "
            + ", ".join(f"{c} {p:.0f}%" for c, p in cb),
        )
    y0 = first_heavy_row(stats["row_counts"], w)
    if y0 is not None:
        print(
            f"first heavy band after calm top: y≈{y0} "
            f"({100.0 * y0 / h:.0f}% from top) — insert/push-down often starts here",
        )
    print_row_bands(stats["row_counts"], w, h)
    print_hot_rows(stats["row_counts"], w)
    print_hot_cols(stats["col_counts"], h)
    print_grid(stats["grid"], total)
    return True


def print_hints(
    ref_label: str,
    h_ref: int,
    h_cur: int,
    overlap_stats: dict | None,
    w: int,
    h_overlap: int,
    tail_diff_pct: float | None,
    dh: int,
) -> None:
    lines: list[str] = []
    if dh != 0:
        taller = "working" if dh > 0 else ref_label
        lines.append(f"{taller} is {abs(dh)}px taller ({100.0 * abs(dh) / min(h_ref, h_cur):.1f}%).")
    if overlap_stats and overlap_stats["changed"] > 0:
        opct = 100.0 * overlap_stats["changed"] / (w * h_overlap)
        rows = overlap_stats["row_counts"]
        y_insert = first_heavy_row(rows, w)
        y_peak = hottest_row(rows, w)
        if opct > 1:
            msg = f"shared top {h_overlap}px: {opct:.1f}% pixels differ"
            if y_insert is not None:
                msg += (
                    f"; calm until ~y={y_insert} ({100.0 * y_insert / h_overlap:.0f}% from top), "
                    "then same (x,y) stops matching (insert or push-down in full-page shot)"
                )
            elif y_peak is not None:
                msg += (
                    f"; peak change at y={y_peak} ({100.0 * y_peak / h_overlap:.0f}% from top)"
                )
            lines.append(msg + ".")
    if tail_diff_pct is not None and dh > 0:
        if tail_diff_pct < 2.0:
            lines.append(
                f"working bottom {dh}px ≈ {ref_label} former bottom ({tail_diff_pct:.1f}% diff) "
                "— mostly page extension, little new paint.",
            )
        elif tail_diff_pct < 15.0:
            lines.append(
                f"working bottom {dh}px partly matches {ref_label} bottom ({tail_diff_pct:.1f}% diff).",
            )
        else:
            lines.append(
                f"working bottom {dh}px is largely new vs {ref_label} bottom ({tail_diff_pct:.1f}% diff).",
            )
    if lines:
        print("\n=== hints ===")
        for ln in lines:
            print(f"  • {ln}")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("image", type=Path, help="PNG path (under repo)")
    p.add_argument("--ref", default="HEAD", help="git ref for baseline (default HEAD)")
    p.add_argument(
        "--tolerance",
        type=int,
        default=0,
        help="per-channel delta to count as same (default 0)",
    )
    p.add_argument(
        "--no-overlap",
        action="store_true",
        help="on size mismatch, skip overlap/tail analysis",
    )
    p.add_argument(
        "--heatmap",
        nargs="?",
        const="",
        default="",
        metavar="PATH",
        help="write heatmap PNG (default: .cache/heatmap/<same path as input>); pass PATH to override",
    )
    p.add_argument(
        "--no-heatmap",
        action="store_true",
        help="skip heatmap image",
    )
    p.add_argument(
        "--heatmap-mode",
        choices=("rows", "xy"),
        default="rows",
        help="rows = git-like row alignment (default); xy = same (x,y) only",
    )
    args = p.parse_args()
    root = repo_root()
    relpath = rel_to_repo(args.image, root)
    current = args.image if args.image.is_absolute() else root / args.image
    if not current.is_file():
        raise SystemExit(f"missing file: {current}")

    raw_ref = git_png_bytes(root, args.ref, relpath)
    raw_cur = current.read_bytes()
    ref_label = args.ref
    print(
        f"{relpath}: file {len(raw_ref)} B ({ref_label}) vs {len(raw_cur)} B (working)",
    )

    w0, h0, pix_a = decode_png(raw_ref)
    w1, h1, pix_b = decode_png(raw_cur)

    if w0 != w1:
        raise SystemExit(
            f"width mismatch: {ref_label} {w0} vs working {w1} (not supported)",
        )

    w = w0
    tol_label = str(args.tolerance)
    any_diff = False
    overlap_stats: dict | None = None
    tail_diff_pct: float | None = None
    dh = h1 - h0

    meta_a = image_metadata(pix_a, w, h0)
    meta_b = image_metadata(pix_b, w, h1)
    print(f"dimensions: {ref_label} {w}×{h0}, working {w}×{h1}")
    print_metadata(ref_label, meta_a)
    print_metadata("working", meta_b)
    dl = meta_b["mean_luma"] - meta_a["mean_luma"]
    print(f"  Δ mean luma {dl:+.1f} (negative = darker)")

    if h0 == h1:
        stats = diff_stats(pix_a, pix_b, w, h0, args.tolerance)
        any_diff = print_diff_section("full image", stats, w, h0, tol_label)
        overlap_stats = stats
        h_overlap = h0
    else:
        print(f"\nheight mismatch: Δ {dh:+d} px")
        if args.no_overlap:
            print("(overlap analysis skipped; use default without --no-overlap)")
        else:
            h_overlap = min(h0, h1)
            pa = crop_rows(pix_a, w, 0, h_overlap)
            pb = crop_rows(pix_b, w, 0, h_overlap)
            overlap_stats = diff_stats(pa, pb, w, h_overlap, args.tolerance)
            any_diff = print_diff_section(
                f"overlap (top {h_overlap}px, same width)",
                overlap_stats,
                w,
                h_overlap,
                tol_label,
            )

            if dh > 0:
                tail = crop_rows(pix_b, w, h0, dh)
                print(f"\n--- working-only tail (rows {h0}..{h1 - 1}, {w}×{dh}) ---")
                print_metadata("tail", image_metadata(tail, w, dh))
                ref_bottom = crop_rows(pix_a, w, h0 - dh, dh) if h0 >= dh else None
                if ref_bottom is not None:
                    tail_stats = diff_stats(ref_bottom, tail, w, dh, args.tolerance)
                    ttotal = w * dh
                    tail_diff_pct = 100.0 * tail_stats["changed"] / ttotal if ttotal else 0.0
                    print(
                        f"tail vs {ref_label} bottom {dh}px: "
                        f"{tail_stats['changed']}/{ttotal} pixels ({tail_diff_pct:.2f}% diff)",
                    )
                    if tail_stats["changed"] > 0 and tail_diff_pct > 20:
                        print_diff_section(
                            f"tail vs {ref_label} bottom",
                            tail_stats,
                            w,
                            dh,
                            tol_label,
                        )
            elif dh < 0:
                extra = abs(dh)
                strip = crop_rows(pix_a, w, h1, extra)
                print(f"\n--- {ref_label}-only strip (rows {h1}..{h0 - 1}, {w}×{extra}) ---")
                print_metadata(f"{ref_label} strip", image_metadata(strip, w, extra))
                cur_bottom = crop_rows(pix_b, w, h1 - extra, extra) if h1 >= extra else None
                if cur_bottom is not None:
                    tail_stats = diff_stats(strip, cur_bottom, w, extra, args.tolerance)
                    ttotal = w * extra
                    tail_diff_pct = 100.0 * tail_stats["changed"] / ttotal if ttotal else 0.0
                    print(
                        f"{ref_label} strip vs working bottom {extra}px: "
                        f"{tail_stats['changed']}/{ttotal} ({tail_diff_pct:.2f}% diff)",
                    )

        print_hints(ref_label, h0, h1, overlap_stats, w, min(h0, h1), tail_diff_pct, dh)

    if not args.no_heatmap:
        hm_dest = (
            Path(args.heatmap)
            if args.heatmap
            else heatmap_path(root, relpath)
        )
        if not hm_dest.is_absolute():
            hm_dest = root / hm_dest
        written, row_counts = write_heatmap(
            pix_a,
            pix_b,
            w,
            h0,
            h1,
            args.tolerance,
            hm_dest,
            args.heatmap_mode,
        )
        print(f"\nheatmap ({args.heatmap_mode}): {written.relative_to(root)}")
        if row_counts is not None:
            print(
                "  row alignment: "
                f"{row_counts['equal']} equal, {row_counts['replace']} replaced, "
                f"{row_counts['insert']} inserted, {row_counts['delete']} deleted (ref-only)",
            )
        if args.heatmap_mode == "rows":
            print(
                "  top = working: unchanged = grayed out; heat = in-place edit; "
                "green bar/ tint = new row",
            )
            print(
                "  bottom strip (if any) = ref-only removed rows (magenta bar / purple wash)",
            )
        else:
            print("  dim = match at same (x,y); color = Δ (misleading if layout shifted)")

    if any_diff or dh != 0:
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except ValueError as e:
        print(f"compare-image: {e}", file=sys.stderr)
        sys.exit(1)
