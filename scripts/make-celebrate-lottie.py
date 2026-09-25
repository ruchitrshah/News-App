"""Generates assets/lottie/celebrate.json — the end-of-news celebration.

A soft ring expands and fades while ~16 pieces of confetti (dots and small
rounded bars in the house palette) burst outward on a strong ease-out, drift
down a touch, spin, and fade. 1.4s at 60fps, meant to play once.

Hand-built (no downloaded asset): run `python3 scripts/make-celebrate-lottie.py`.
"""
import json
import math
import random

random.seed(7)  # deterministic output

FR, OP, W, H = 60, 84, 400, 400
CX, CY = W / 2, H / 2

# House palette: ink + the soft duotone accents (HobbyColors *.selected).
PALETTE = ["#111827", "#93C5FD", "#C4B5FD", "#F9A8D4", "#FCD34D", "#86EFAC", "#111827"]

EASE_OUT = {"o": {"x": [0.23], "y": [1]}, "i": {"x": [0.32], "y": [1]}}
LINEAR = {"o": {"x": [0.0], "y": [0.0]}, "i": {"x": [1.0], "y": [1.0]}}


def rgb(hexstr):
    h = hexstr.lstrip("#")
    return [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)] + [1]


def kf(t, s, ease=EASE_OUT):
    return {"t": t, "s": s if isinstance(s, list) else [s], **ease}


def anim(*frames):
    return {"a": 1, "k": list(frames)}


def static(v):
    return {"a": 0, "k": v}


def transform():
    return {
        "ty": "tr",
        "p": static([0, 0]),
        "a": static([0, 0]),
        "s": static([100, 100]),
        "r": static(0),
        "o": static(100),
        "sk": static(0),
        "sa": static(0),
    }


def layer(ind, name, shapes, ks, ip=0):
    return {
        "ddd": 0,
        "ind": ind,
        "ty": 4,
        "nm": name,
        "sr": 1,
        "ks": ks,
        "ao": 0,
        "shapes": [{"ty": "gr", "nm": name, "it": shapes + [transform()]}],
        "ip": ip,
        "op": OP,
        "st": 0,
        "bm": 0,
    }


layers = []

# ── Ring ─────────────────────────────────────────────────────────────────────
layers.append(
    layer(
        1,
        "ring",
        [
            {"ty": "el", "nm": "e", "p": static([0, 0]), "s": static([120, 120])},
            {"ty": "st", "nm": "s", "c": static(rgb("#111827")), "o": static(100), "w": static(2), "lc": 2, "lj": 2},
        ],
        {
            "o": anim(kf(0, 35), kf(40, 0)),
            "r": static(0),
            "p": static([CX, CY, 0]),
            "a": static([0, 0, 0]),
            "s": anim(kf(0, [60, 60, 100]), kf(40, [210, 210, 100])),
        },
    )
)

# ── Confetti ─────────────────────────────────────────────────────────────────
N = 16
for n in range(N):
    angle = (2 * math.pi * n / N) + random.uniform(-0.18, 0.18)
    dist = random.uniform(120, 170)
    delay = random.randint(0, 5)
    travel = random.randint(30, 40)
    ex = CX + math.cos(angle) * dist
    ey = CY + math.sin(angle) * dist
    fall = random.uniform(14, 30)  # a little gravity after the burst
    color = rgb(PALETTE[n % len(PALETTE)])

    if n % 3 == 0:  # small rounded bar
        shape = {"ty": "rc", "nm": "r", "p": static([0, 0]), "s": static([5, 12]), "r": static(2.5)}
    else:  # dot
        d = random.uniform(6, 10)
        shape = {"ty": "el", "nm": "e", "p": static([0, 0]), "s": static([d, d])}

    spin = random.choice([-1, 1]) * random.uniform(120, 260)
    layers.append(
        layer(
            n + 2,
            f"confetti-{n}",
            [shape, {"ty": "fl", "nm": "f", "c": static(color), "o": static(100), "r": 1}],
            {
                "o": anim(kf(0, 0, LINEAR), kf(delay, 100), kf(delay + travel - 4, 100), kf(OP - 4, 0)),
                "r": anim(kf(delay, 0), kf(OP, spin)),
                "p": anim(
                    kf(delay, [CX, CY, 0]),
                    kf(delay + travel, [ex, ey, 0], LINEAR),
                    kf(OP, [ex, ey + fall, 0]),
                ),
                "a": static([0, 0, 0]),
                "s": anim(kf(delay, [40, 40, 100]), kf(delay + 10, [110, 110, 100]), kf(OP, [70, 70, 100])),
            },
        )
    )

doc = {"v": "5.7.4", "fr": FR, "ip": 0, "op": OP, "w": W, "h": H, "nm": "celebrate", "ddd": 0, "assets": [], "layers": layers}

import os

os.makedirs("assets/lottie", exist_ok=True)
with open("assets/lottie/celebrate.json", "w") as f:
    json.dump(doc, f, separators=(",", ":"))
print("assets/lottie/celebrate.json —", len(layers), "layers")
