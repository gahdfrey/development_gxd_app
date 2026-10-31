"""Outline strings set in Geist (the app's font) as SVG path data, with kerning and tracking.

Usage: python outline.py <geist.woff2> <out.json>
Writes {key: {"spans": [d, ...], "width": w, "capHeight": c}} at font size 100, baseline y=0, x from 0.
"""
import json
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SIZE = 100

# key: (text, weight, tracking in em, span boundaries)
STRINGS = {
    "wordmark": ("CareVault", 700, -0.02, [4]),
    "powered": ("Powered by", 500, 0.0, []),
    "tagline": ("The EHR built for the way clinicians think", 500, -0.01, []),
    "domain": ("carevault.com.ng", 500, 0.0, []),
}


def pair_kerning(font):
    """Collect horizontal pair adjustments (XAdvance) from GPOS PairPos lookups."""
    kern = {}
    gpos = font["GPOS"].table if "GPOS" in font else None
    if not gpos:
        return kern
    for lookup in gpos.LookupList.Lookup:
        subtables = lookup.SubTable
        if lookup.LookupType == 9:  # extension
            subtables = [s.ExtSubTable for s in subtables]
        for st in subtables:
            if getattr(st, "LookupType", 2) != 2 and lookup.LookupType != 9:
                continue
            if not hasattr(st, "Format") or not hasattr(st, "Coverage"):
                continue
            covered = st.Coverage.glyphs
            if st.Format == 1:
                for g1, pairset in zip(covered, st.PairSet):
                    for rec in pairset.PairValueRecord:
                        v = getattr(rec.Value1, "XAdvance", 0) if rec.Value1 else 0
                        kern.setdefault((g1, rec.SecondGlyph), v)
            elif st.Format == 2:
                cls1 = st.ClassDef1.classDefs
                cls2 = st.ClassDef2.classDefs
                for g1 in covered:
                    c1 = cls1.get(g1, 0)
                    row = st.Class1Record[c1]
                    for g2, c2 in cls2.items():
                        val = row.Class2Record[c2].Value1
                        v = getattr(val, "XAdvance", 0) if val else 0
                        if v:
                            kern.setdefault((g1, g2), v)
    return kern


def main(src, out):
    base = TTFont(src)
    result = {}
    for key, (text, weight, tracking, breaks) in STRINGS.items():
        font = instantiateVariableFont(TTFont(src), {"wght": weight})
        upm = font["head"].unitsPerEm
        scale = SIZE / upm
        cmap = font.getBestCmap()
        glyphs = font.getGlyphSet()
        hmtx = font["hmtx"]
        kern = pair_kerning(font)
        names = [cmap[ord(ch)] for ch in text]

        spans, current, x = [], [], 0.0
        bpen = BoundsPen(glyphs)
        bounds = set(breaks)
        for i, name in enumerate(names):
            if i in bounds:
                spans.append(" ".join(current))
                current = []
            pen = SVGPathPen(glyphs)
            glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
            glyphs[name].draw(TransformPen(bpen, (scale, 0, 0, -scale, x, 0)))
            d = pen.getCommands()
            if d:
                current.append(d)
            x += hmtx[name][0] * scale
            if i + 1 < len(names):
                x += kern.get((name, names[i + 1]), 0) * scale + tracking * SIZE
        spans.append(" ".join(current))
        result[key] = {
            "spans": spans,
            "width": round(x, 3),
            "bounds": bpen.bounds,
            "capHeight": font["OS/2"].sCapHeight * scale,
            "xHeight": font["OS/2"].sxHeight * scale,
        }
    with open(out, "w") as fh:
        json.dump(result, fh)
    print({k: (v["width"], v["capHeight"]) for k, v in result.items()})


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
