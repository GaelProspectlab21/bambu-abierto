"""Baja las fotos de referencia de Free Exercise DB (dominio público, Unlicense) a public/ejercicios.

Cada ejercicio de Bambú apunta a uno de la base. "similar" explica en qué cambia la versión casera.
Uso: python -X utf8 scripts/bajar_imagenes_ejercicios.py
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises"
OUT = Path(__file__).resolve().parents[1] / "public" / "ejercicios"
MAP: dict[str, tuple[str, str]] = {
    "pushup-wall": ("Incline_Push-Up", "Igual, pero con las manos en la pared: más vertical y más fácil."),
    "pushup-incline": ("Incline_Push-Up", ""),
    "pushup-knee": ("Pushups", "Igual, pero con las rodillas apoyadas en el piso."),
    "pushup": ("Pushups", ""),
    "pushup-parallettes": ("Close-Grip_Push-Up_off_of_a_Dumbbell", "Con mini paralelas en vez de mancuernas: bajas más que las manos."),
    "pushup-diamond": ("Push-Ups_-_Close_Triceps_Position", ""),
    "pushup-decline": ("Push-Ups_With_Feet_Elevated", ""),
    "pushup-backpack": ("Pushups", "Igual, con la mochila bien apretada en la espalda."),
    "row-backpack-1arm": ("One-Arm_Dumbbell_Row", "Con la mochila en vez de mancuerna y la mano en una silla."),
    "row-backpack": ("Bent_Over_Two-Dumbbell_Row", "Con la mochila agarrada de las dos asas."),
    "row-towel-door": ("Suspended_Row", "Con una toalla en las manijas de una puerta bien cerrada."),
    "row-table": ("Inverted_Row", "Bajo una mesa muy firme en vez de una barra."),
    "pullup-negative": ("Pullups", "Solo la bajada, lo más lento que puedas."),
    "pullup": ("Pullups", ""),
    "curl-backpack": ("Dumbbell_Bicep_Curl", "Con la mochila agarrada de las asas."),
    "neck-curl": ("Lying_Face_Up_Plate_Neck_Resistance", "Empieza sin peso; luego libros con una toalla."),
    "neck-extension": ("Lying_Face_Down_Plate_Neck_Resistance", "Empieza sin peso; luego libros con una toalla."),
    "squat": ("Bodyweight_Squat", ""),
    "squat-backpack": ("Goblet_Squat", "Con la mochila abrazada contra el pecho."),
    "lunge": ("Dumbbell_Rear_Lunge", "Sin peso, o con la mochila."),
    "split-squat": ("Split_Squats", "Búlgara: el pie de atrás arriba de una silla."),
    "split-squat-backpack": ("Split_Squat_with_Dumbbells", "Búlgara con la mochila y el pie de atrás en una silla."),
    "glute-bridge": ("Butt_Lift_Bridge", ""),
    "single-bridge": ("Single_Leg_Glute_Bridge", ""),
    "rdl-backpack": ("Stiff-Legged_Dumbbell_Deadlift", "Con la mochila pegada a las piernas."),
    "calf-raise": ("Standing_Dumbbell_Calf_Raise", "Sin peso, en el borde de un escalón."),
    "calf-raise-single": ("Standing_Dumbbell_Calf_Raise", "A una pierna, apoyado en la pared."),
    "plank": ("Plank", ""),
    "dead-bug": ("Dead_Bug", ""),
    "wrist-curl": ("Seated_Dumbbell_Palms-Up_Wrist_Curl", "Con un libro o la mochila."),
    "wrist-extension": ("Seated_Dumbbell_Palms-Down_Wrist_Curl", "Con un libro o la mochila, palma abajo."),
    "backpack-hold": ("Farmers_Walk", "Con la mochila en una mano."),
    "book-pinch": ("Plate_Pinch", "Con un libro grueso en vez de discos."),
    "wrist-roller": ("Wrist_Roller", "Palo de escoba, cuerda y botella de agua."),
}
log = logging.getLogger("imagenes")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
def fetch(url: str) -> bytes:
    response = requests.get(url, headers={"User-Agent": "curl/8"}, timeout=30)
    response.raise_for_status()
    if not response.content.startswith(b"\xff\xd8"):
        raise ValueError(f"No es JPEG: {url}")
    return response.content


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    OUT.mkdir(parents=True, exist_ok=True)
    index: dict[str, dict] = {}
    total = 0
    for ours, (theirs, similar) in MAP.items():
        for frame in (0, 1):
            data = fetch(f"{BASE}/{theirs}/{frame}.jpg")
            (OUT / f"{ours}-{frame}.jpg").write_bytes(data)
            total += len(data)
        index[ours] = {"source": theirs, **({"similar": similar} if similar else {})}
    (OUT / "indice.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    log.info("%d ejercicios, %d fotos, %.1f MB", len(index), len(index) * 2, total / 1e6)


if __name__ == "__main__":
    main()
