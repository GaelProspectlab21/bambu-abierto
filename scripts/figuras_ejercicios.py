"""Dibujos técnicos de los ejercicios que no tienen foto libre confiable.

No es IA: cada pose sale de puntos y ángulos escritos aquí, con cinemática inversa de dos
segmentos (brazo y pierna). Así la técnica es exactamente la que dicen las indicaciones de
exercises.ts. Salida: public/ejercicios/<id>-0.svg (inicio) y <id>-1.svg (final).

Uso: python -X utf8 scripts/figuras_ejercicios.py
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

OUT = Path(__file__).resolve().parent.parent / "public" / "ejercicios"
W, H = 600, 400
FLOOR = 340
# Largos de segmento en px (proporciones de un adolescente).
TORSO, NECK, HEAD_R = 104, 12, 21
UPPER_ARM, FOREARM = 60, 54
THIGH, SHIN, FOOT = 84, 80, 24

NEAR, FAR, SKIN = "#1f5a45", "#8db9a3", "#1f5a45"
PROP, PROP_DARK, WOOD = "#c3cec7", "#9fb0a6", "#d8c7a3"
ARROW = "#c38d1e"

Point = tuple[float, float]
# Puntos dibujados del ejercicio en curso: sirven para encuadrar la figura (mismo marco en inicio y final).
SEEN: list[Point] = []


def polar(origin: Point, length: float, deg: float) -> Point:
    """Ángulo absoluto en grados: 0 a la derecha, 90 hacia abajo (eje y del SVG)."""
    rad = math.radians(deg)
    return origin[0] + length * math.cos(rad), origin[1] + length * math.sin(rad)


def ik(root: Point, target: Point, l1: float, l2: float, bend: int) -> tuple[Point, Point]:
    """Articulación media (codo o rodilla) y punto final. bend = 1 o -1 elige hacia dónde dobla."""
    dx, dy = target[0] - root[0], target[1] - root[1]
    dist = math.hypot(dx, dy)
    base = math.atan2(dy, dx)
    if dist >= l1 + l2 - 0.01:
        mid = polar(root, l1, math.degrees(base))
        return mid, polar(mid, l2, math.degrees(base))
    cos_a = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
    a = math.acos(max(-1.0, min(1.0, cos_a)))
    mid = polar(root, l1, math.degrees(base + bend * a))
    return mid, target


def reach_check(a: Point, b: Point, length: float, what: str) -> None:
    dist = math.hypot(b[0] - a[0], b[1] - a[1])
    if dist > length + 0.5:
        raise ValueError(f"{what}: hace falta {dist:.1f} px y el segmento mide {length}")


def hip_from(shoulder: Point, foot: Point, leg: float = THIGH + SHIN, up: bool = True) -> Point:
    """La cadera que queda a un torso del hombro y a `leg` del tobillo (círculos que se cruzan)."""
    dx, dy = foot[0] - shoulder[0], foot[1] - shoulder[1]
    d = math.hypot(dx, dy)
    a = (TORSO ** 2 - leg ** 2 + d ** 2) / (2 * d)
    h = math.sqrt(max(0.0, TORSO ** 2 - a ** 2))
    ux, uy = dx / d, dy / d
    px, py = (uy, -ux) if up else (-uy, ux)
    base = (shoulder[0] + a * ux, shoulder[1] + a * uy)
    cand = [(base[0] + h * px, base[1] + h * py), (base[0] - h * px, base[1] - h * py)]
    return min(cand, key=lambda c: c[1]) if up else max(cand, key=lambda c: c[1])


@dataclass
class Pose:
    shoulder: Point
    hand: Point
    foot: Point
    hip: Point | None = None  # si falta, se resuelve con la pierna estirada
    elbow_bend: int = 1
    knee_bend: int = -1
    head: float | None = None  # ángulo del cuello; por omisión sigue al torso
    toe: float = 0  # ángulo del pie
    far_hand: Point | None = None
    far_foot: Point | None = None
    far_knee_bend: int | None = None
    props: list[str] = field(default_factory=list)
    arrows: list[str] = field(default_factory=list)


def along(origin: Point, length: float, deg: float) -> Point:
    return polar(origin, length, deg)


def limb(points: list[Point], color: str, width: float) -> str:
    d = "M" + " L".join(f"{x:.1f} {y:.1f}" for x, y in points)
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" '
            'stroke-linecap="round" stroke-linejoin="round"/>')


def figure(p: Pose, name: str) -> str:
    shoulder = p.shoulder
    hip = p.hip or hip_from(shoulder, p.foot)
    if abs(math.hypot(shoulder[0] - hip[0], shoulder[1] - hip[1]) - TORSO) > 1:
        raise ValueError(f"{name}: el torso no mide {TORSO}")
    torso = math.degrees(math.atan2(shoulder[1] - hip[1], shoulder[0] - hip[0]))
    angle = p.head if p.head is not None else torso
    neck = polar(shoulder, NECK, angle)
    head = polar(neck, HEAD_R, angle)
    for hand in (p.hand, p.far_hand or p.hand):
        reach_check(shoulder, hand, UPPER_ARM + FOREARM, f"{name} brazo")
    for foot in (p.foot, p.far_foot or p.foot):
        reach_check(hip, foot, THIGH + SHIN, f"{name} pierna")
    parts: list[str] = []
    for hand, foot, color, width, knee in (
        (p.far_hand or p.hand, p.far_foot or p.foot, FAR, 15, p.far_knee_bend or p.knee_bend),
        (p.hand, p.foot, NEAR, 17, p.knee_bend),
    ):
        knee_pt, ankle = ik(hip, foot, THIGH, SHIN, knee)
        toe = polar(ankle, FOOT, p.toe)
        parts.append(limb([hip, knee_pt, ankle, toe], color, width))
        if color == FAR:
            elbow, wrist = ik(shoulder, hand, UPPER_ARM, FOREARM, p.elbow_bend)
            parts.append(limb([shoulder, elbow, wrist], color, 13))
    parts.append(limb([hip, shoulder], SKIN, 28))
    parts.append(limb([shoulder, neck], SKIN, 12))
    parts.append(f'<circle cx="{head[0]:.1f}" cy="{head[1]:.1f}" r="{HEAD_R}" fill="{SKIN}"/>')
    elbow, wrist = ik(shoulder, p.hand, UPPER_ARM, FOREARM, p.elbow_bend)
    parts.append(limb([shoulder, elbow, wrist], NEAR, 15))
    SEEN.extend([hip, shoulder, elbow, wrist, p.foot, (head[0] - HEAD_R, head[1] - HEAD_R), (head[0] + HEAD_R, head[1] + HEAD_R)])
    SEEN.extend([ik(hip, f, THIGH, SHIN, p.knee_bend)[0] for f in (p.foot, p.far_foot or p.foot)])
    return "\n".join(parts)


def chair(x: float, seat: float = 230, width: float = 110) -> str:
    SEEN.extend([(x, seat - 120), (x + width, FLOOR)])
    return (f'<rect x="{x}" y="{seat}" width="{width}" height="14" rx="4" fill="{WOOD}"/>'
            f'<path d="M{x + 8} {seat + 14} V{FLOOR} M{x + width - 8} {seat + 14} V{FLOOR}" stroke="{WOOD}" stroke-width="8" stroke-linecap="round"/>'
            f'<path d="M{x + width - 8} {seat} V{seat - 120}" stroke="{WOOD}" stroke-width="8" stroke-linecap="round"/>')


def bench(x: float, top: float, width: float) -> str:
    return (f'<rect x="{x}" y="{top}" width="{width}" height="{FLOOR - top}" rx="8" fill="{PROP}"/>'
            f'<rect x="{x}" y="{top}" width="{width}" height="12" rx="6" fill="{PROP_DARK}"/>')


def parallette(x: float, h: float = 30) -> str:
    SEEN.extend([(x - 26, FLOOR - h - 6), (x + 26, FLOOR)])
    return (f'<path d="M{x - 26} {FLOOR} L{x - 18} {FLOOR - h} H{x + 18} L{x + 26} {FLOOR}" fill="none" '
            f'stroke="{PROP_DARK}" stroke-width="7" stroke-linejoin="round"/>'
            f'<rect x="{x - 22}" y="{FLOOR - h - 6}" width="44" height="10" rx="5" fill="#7d8f85"/>')


def arrow(x1: float, y1: float, x2: float, y2: float) -> str:
    SEEN.extend([(x1, y1), (x2, y2)])
    ang = math.atan2(y2 - y1, x2 - x1)
    a1 = polar((x2, y2), 14, math.degrees(ang) + 150)
    a2 = polar((x2, y2), 14, math.degrees(ang) - 150)
    return (f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{ARROW}" stroke-width="5" stroke-dasharray="9 7" stroke-linecap="round"/>'
            f'<path d="M{a1[0]:.1f} {a1[1]:.1f} L{x2} {y2} L{a2[0]:.1f} {a2[1]:.1f}" fill="none" stroke="{ARROW}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>')


def frame_of(points: list[Point]) -> tuple[float, float, float, float]:
    """Marco 3:2 que envuelve la figura con aire, sin acercarse tanto que se vea gigante."""
    pad = 34
    x0, x1 = min(x for x, _ in points) - pad, max(x for x, _ in points) + pad
    y0, y1 = min(y for _, y in points) - pad, max(max(y for _, y in points), FLOOR) + pad * 0.6
    w, h = max(x1 - x0, 380.0), max(y1 - y0, 380 / 1.5)
    if w / h > 1.5:
        h = w / 1.5
    else:
        w = h * 1.5
    return (x0 + x1) / 2 - w / 2, y1 - h, w, h


def svg(body: str, label: str, box: tuple[float, float, float, float]) -> str:
    x, y, w, h = (round(v, 1) for v in box)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x} {y} {w} {h}" role="img" aria-label="{label}">\n'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#eef2ef"/>\n'
            f'<path d="M{x} {FLOOR + 2} H{x + w}" stroke="#cdd8d1" stroke-width="4"/>\n{body}\n</svg>\n')


def seat(x: float, top: float, width: float) -> str:
    """Banco o silla con patas: deja ver la pierna de abajo en el Copenhagen."""
    SEEN.extend([(x, top), (x + width, FLOOR)])
    return (f'<rect x="{x}" y="{top}" width="{width}" height="14" rx="5" fill="{WOOD}"/>'
            f'<path d="M{x + 10} {top + 14} V{FLOOR} M{x + width - 10} {top + 14} V{FLOOR}" stroke="{WOOD}" stroke-width="8" stroke-linecap="round"/>')


def towel(x: float, width: float) -> str:
    """Toalla doblada en el piso, bajo la cadera y las piernas."""
    SEEN.extend([(x, FLOOR - 10), (x + width, FLOOR)])
    return f'<rect x="{x}" y="{FLOOR - 6}" width="{width}" height="9" rx="4" fill="#d9a066"/>'


def poses() -> dict[str, Callable[[], tuple[Pose, Pose]]]:
    """Cada ejercicio se arma al pedirlo, así SEEN guarda solo sus puntos y sus muebles."""
    g = FLOOR - 10  # muñecas y tobillos apoyados
    pike_hand, pike_foot = (200, g), (349, g)
    el_hand, el_foot = (220, g), (430, 220)
    par_hand = (222, FLOOR - 42)
    knee_pad = f'<rect x="270" y="{FLOOR - 8}" width="70" height="10" rx="5" fill="{PROP}"/>'
    strap = f'<rect x="186" y="{FLOOR - 32}" width="58" height="20" rx="8" fill="{PROP_DARK}"/>'
    return {
        # V invertida; al bajar, codos hacia atrás y cabeza adelante de las manos (triángulo).
        "pike": lambda: (
            Pose(shoulder=along(pike_hand, 114, -70), hand=pike_hand, foot=pike_foot, head=112, toe=150),
            Pose(shoulder=(190, 283), hand=pike_hand, foot=pike_foot, head=140, toe=150, elbow_bend=1,
                 arrows=[arrow(120, 200, 120, 290)]),
        ),
        "pike-elevated": lambda: (
            Pose(shoulder=along(el_hand, 114, -80), hand=el_hand, foot=el_foot, head=105, toe=190, props=[chair(400, 230)]),
            Pose(shoulder=(205, 288), hand=el_hand, foot=el_foot, head=128, toe=190, elbow_bend=1,
                 props=[chair(400, 230)], arrows=[arrow(140, 190, 140, 290)]),
        ),
        "pike-parallettes": lambda: (
            Pose(shoulder=along(par_hand, 114, -80), hand=par_hand, foot=el_foot, head=105, toe=190,
                 props=[chair(400, 230), parallette(222, 34)]),
            Pose(shoulder=(204, 262), hand=par_hand, foot=el_foot, head=125, toe=190, elbow_bend=1,
                 props=[chair(400, 230), parallette(222, 34)], arrows=[arrow(140, 180, 140, 290)]),
        ),
        # De pie sobre la toalla, codos a 90 grados pegados al cuerpo; jala sin mover los codos.
        "curl-towel": lambda: (
            Pose(shoulder=(300, 64), hip=(300, 168), hand=(354, 124), foot=(300, g), far_foot=(312, g), elbow_bend=1,
                 head=-90, toe=0, props=[f'<path d="M318 {FLOOR - 2} Q350 250 354 128" fill="none" stroke="#b9895a" stroke-width="7"/>']),
            Pose(shoulder=(300, 64), hip=(300, 168), hand=(354, 124), foot=(300, g), far_foot=(312, g), elbow_bend=1,
                 head=-90, toe=0, props=[f'<path d="M318 {FLOOR - 2} L354 128" fill="none" stroke="#b9895a" stroke-width="7"/>'],
                 arrows=[arrow(410, 160, 410, 90)]),
        ),
        # Primero la versión fácil (rodillas dobladas, brazos a los lados), luego el plátano completo.
        "hollow": lambda: (
            Pose(shoulder=along((330, FLOOR - 16), 104, 190), hip=(330, FLOOR - 16), hand=along(along((330, FLOOR - 16), 104, 190), 112, -6), foot=(440, 246),
                 head=200, toe=0, knee_bend=-1),
            Pose(shoulder=along((330, FLOOR - 16), 104, 192), hip=(330, FLOOR - 16), hand=along(along((330, FLOOR - 16), 104, 192), 112, 196),
                 foot=along((330, FLOOR - 16), 163.5, -9), head=198, toe=-9, knee_bend=1,
                 arrows=[arrow(500, FLOOR - 4, 500, 290)]),
        ),
        # Sentado entre las paralelas; brazos rectos empujando, rodillas al pecho, cadera arriba.
        "tuck-lsit": lambda: (
            Pose(shoulder=along((300, FLOOR - 16), 104, -86), hip=(300, FLOOR - 16), hand=(312, FLOOR - 40),
                 foot=(458, g), knee_bend=-1, elbow_bend=-1, head=-88, toe=-60, props=[parallette(312, 34)]),
            Pose(shoulder=(306, 290 - 104), hip=(300, 290), hand=(312, FLOOR - 40), foot=(360, 296),
                 knee_bend=-1, head=-90, toe=-30, props=[parallette(312, 34)], arrows=[arrow(250, 330, 250, 282)]),
        ),
        # Copenhagen corto: antebrazo en el piso, pierna de arriba sobre el banco; sube la cadera
        # hasta que la pierna de abajo toque el banco por debajo.
        "copenhagen": lambda: (
            Pose(shoulder=(180, 262), hip=along((180, 262), 104, 14), hand=(124, FLOOR - 12), foot=(432, 234),
                 far_foot=(430, g), elbow_bend=1, knee_bend=1, far_knee_bend=1, toe=0, props=[seat(340, 240, 150)]),
            Pose(shoulder=(180, 262), hip=along((180, 262), 104, -5.6), hand=(124, FLOOR - 12), foot=(432, 234),
                 far_foot=(424, 270), elbow_bend=1, knee_bend=1, far_knee_bend=1, toe=0, props=[seat(340, 240, 150)],
                 arrows=[arrow(285, 320, 285, 268)]),
        ),
        # Dominada en el piso: boca abajo sobre una toalla, manos fijas al frente; jalas y te deslizas hacia ellas.
        "floor-towel-pull": lambda: (
            Pose(shoulder=along((372, FLOOR - 14), 104, 183), hip=(372, FLOOR - 14), hand=(154.6, g), foot=(535.8, FLOOR - 12), head=196, toe=10,
                 knee_bend=-1, elbow_bend=1, props=[towel(330, 170)]),
            Pose(shoulder=along((244, FLOOR - 14), 104, 183), hip=(244, FLOOR - 14), hand=(154.6, g), foot=(407.8, FLOOR - 12), head=196, toe=10,
                 knee_bend=-1, elbow_bend=-1, props=[towel(202, 170)], arrows=[arrow(430, 250, 340, 250)]),
        ),
        # Nórdico: de rodillas con los tobillos sujetos; bajas con el cuerpo recto y lento, y frenas con las manos.
        "nordic": lambda: (
            Pose(shoulder=(300, 128), hip=(300, 232), hand=(338, 196), foot=(222, FLOOR - 14), knee_bend=-1,
                 elbow_bend=-1, head=-90, toe=180, props=[knee_pad, strap]),
            Pose(shoulder=along(along((300, FLOOR - 22), 84, -42), 104, -42), hip=along((300, FLOOR - 22), 84, -42),
                 hand=(470, 268), foot=(222, FLOOR - 14), knee_bend=-1, elbow_bend=1, head=-40, toe=180,
                 props=[knee_pad, strap], arrows=[arrow(420, 96, 500, 176)]),
        ),
    }


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, build in poses().items():
        SEEN.clear()
        start, end = build()
        labels = [f"{name} {'inicio' if i == 0 else 'final'}" for i in (0, 1)]
        bodies = ["\n".join([*pose.props, figure(pose, label), *pose.arrows]) for pose, label in zip((start, end), labels)]
        box = frame_of(SEEN)
        for i, (body, label) in enumerate(zip(bodies, labels)):
            path = OUT / f"{name}-{i}.svg"
            path.write_text(svg(body, label, box), encoding="utf-8")
            logging.info("escrito %s", path.name)

if __name__ == "__main__":
    main()
