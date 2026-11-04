#!/usr/bin/env python3
"""The picture ledger in short: what has been spent, what is reserved by running batches, what is left before the
$75 stop, and the measured tokens (docs/es/PICTURES.md "The ledger").

  python3 tools/es-pictures/ledger.py            totals by kind of picture, model, quality and batch
  python3 tools/es-pictures/ledger.py --rows     every request line
  python3 tools/es-pictures/ledger.py --price 2048x1152 high 2     the estimate for one picture with 2 references
"""
from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

sys.dont_write_bytecode = True  # no __pycache__ in the repository
sys.path.insert(0, str(Path(__file__).resolve().parent))
import espics as E  # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", action="store_true")
    ap.add_argument("--price", nargs=3, metavar=("SIZE", "QUALITY", "REFS"))
    ap.add_argument("--model", default="gpt-image-2.5-sunburst")
    a = ap.parse_args()
    if a.price:
        size, quality, refs = a.price[0], a.price[1], int(a.price[2])
        out = E.output_tokens(a.model, size, quality)
        ref_t = E.measured_ref_tokens()
        text = 900  # a typical full prompt (style + town + scene + rules) is 700–1,000 tokens
        for batch in (False, True):
            usd = E.tokens_cost(a.model, batch, text, refs * ref_t, out)
            print(f"{a.model} {size} {quality}, {refs} reference(s) ({ref_t} tokens each), ~{text} prompt tokens: "
                  f"${usd:.4f}{' (batch)' if batch else ''}")
        return
    rows = E.read_ledger()
    t = E.ledger_totals(rows)
    req = [r for r in rows if r.get("kind") == "request"]
    groups = defaultdict(lambda: [0, 0, 0.0])
    for r in req:
        kind = (r.get("id") or "").split("/")[0]
        k = (kind, r.get("model"), r.get("size"), r.get("quality"), "batch" if r.get("batch") else "regular", r.get("status"))
        g = groups[k]
        g[0] += 1
        g[2] += r.get("cost_usd", 0.0)
        g[1] += 1 if r.get("status") == "ok" else 0
    print(f"ledger: {E.LEDGER}")
    for k, (n, ok, usd) in sorted(groups.items(), key=lambda kv: str(kv[0])):
        print(f"  {k[0]:<8} {k[1]:<24} {k[2]:<10} {k[3]:<7} {k[4]:<7} {k[5]:<12} {n:>4} requests  ${usd:.4f}")
    if a.rows:
        for r in req:
            print(f"  {r['ts']}  {r.get('id'):<34} {r.get('status'):<11} ${r.get('cost_usd', 0):.4f}  {r.get('tokens')}")
    per_ref = E.measured_ref_tokens()
    print(f"spent ${t['spent']:.4f}; open batch reservations ${t['open_reservations']:.4f}; committed "
          f"${t['committed']:.4f}; left before the ${E.STOP_USD:.2f} stop ${E.STOP_USD - t['committed']:.4f} "
          f"(the owner approved ${E.APPROVED_USD:.2f})")
    print(f"image input tokens per reference picture, as measured (+10%): {per_ref}")


if __name__ == "__main__":
    main()
