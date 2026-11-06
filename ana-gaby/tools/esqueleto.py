#!/usr/bin/env python3
"""Esqueleto de un texto rasterizado → trazos ordenados para que el betún lo "escriba".

Uso: python3 tools/esqueleto.py entrada.png salida.json --em 520 --base_x 40 --base_y 600
- Binariza, adelgaza (skimage.morphology.skeletonize) y arma un grafo de píxeles (8 vecinos).
- Recorre los caminos entre extremos y cruces; quita ramitas cortas (remates de las serifas).
- Une caminos en los cruces siguiendo la continuación más recta (trazos largos, como a mano).
- Simplifica (Douglas-Peucker) y suaviza (Chaikin). Ordena de izquierda a derecha.
Salida en unidades de em: x a la derecha, y hacia arriba, origen en la línea base al inicio del texto.
"""
import json
import math
import sys

import numpy as np
from PIL import Image
from skimage.morphology import skeletonize

args = sys.argv[1:]
ENT, SAL = args[0], args[1]
opt = {args[i][2:]: float(args[i + 1]) for i in range(2, len(args), 2)}
EM, BX, BY = opt['em'], opt['base_x'], opt['base_y']

g = np.asarray(Image.open(ENT).convert('L')) > 128
esq = skeletonize(g)
H, W = esq.shape
pix = set(zip(*np.nonzero(esq)))
VEC = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def vecinos(p):
    return [(p[0] + d[0], p[1] + d[1]) for d in VEC if (p[0] + d[0], p[1] + d[1]) in pix]


grado = {p: len(vecinos(p)) for p in pix}
nodos = {p for p, d in grado.items() if d != 2}

# Caminos entre nodos (y ciclos sin nodos).
visto = set()
caminos = []
for n in nodos:
    for v in vecinos(n):
        if (n, v) in visto:
            continue
        cam = [n, v]
        visto.add((n, v)); visto.add((v, n))
        prev, cur = n, v
        while cur not in nodos:
            sig = [q for q in vecinos(cur) if q != prev and (cur, q) not in visto]
            if not sig:
                break
            q = sig[0]
            visto.add((cur, q)); visto.add((q, cur))
            prev, cur = cur, q
            cam.append(cur)
        caminos.append(cam)
resto = pix - {p for c in caminos for p in c}
while resto:  # anillos sin extremos (o, e cerradas)
    p0 = resto.pop()
    cam = [p0]
    prev, cur = None, p0
    while True:
        sig = [q for q in vecinos(cur) if q != prev and q in resto]
        if not sig:
            break
        prev, cur = cur, sig[0]
        resto.discard(cur)
        cam.append(cur)
    cam.append(p0)
    caminos.append(cam)

largo = lambda c: sum(math.dist(c[i], c[i + 1]) for i in range(len(c) - 1))
# Ramitas: caminos cortos que terminan en un extremo (grado 1) y salen de un cruce.
MIN = EM * 0.07
caminos = [c for c in caminos if not (largo(c) < MIN and (grado[c[0]] == 1 or grado[c[-1]] == 1) and (grado[c[0]] >= 3 or grado[c[-1]] >= 3))]

# Unir en los cruces: en cada nodo de grado ≥ 3, empareja los caminos que siguen más recto.
def direccion(c, desde_inicio):
    k = min(len(c) - 1, 12)
    a, b = (c[0], c[k]) if desde_inicio else (c[-1], c[-1 - k])
    return (b[0] - a[0], b[1] - a[1])

cambio = True
while cambio:
    cambio = False
    extremos = {}
    for i, c in enumerate(caminos):
        if c[0] != c[-1]:
            extremos.setdefault(c[0], []).append((i, True))
            extremos.setdefault(c[-1], []).append((i, False))
    for nodo, lst in extremos.items():
        if len(lst) < 2:
            continue
        mejor = None
        for a in range(len(lst)):
            for b in range(a + 1, len(lst)):
                (i, si), (j, sj) = lst[a], lst[b]
                if i == j:
                    continue
                da, db = direccion(caminos[i], si), direccion(caminos[j], sj)
                na, nb = math.hypot(*da) or 1, math.hypot(*db) or 1
                cos = (da[0] * db[0] + da[1] * db[1]) / (na * nb)  # rectas: salen en sentidos opuestos → cos ≈ −1
                if mejor is None or cos < mejor[0]:
                    mejor = (cos, i, si, j, sj)
        if mejor and mejor[0] < -0.55:
            _, i, si, j, sj = mejor
            ci = caminos[i] if not si else caminos[i][::-1]   # ci termina en el nodo
            cj = caminos[j] if sj else caminos[j][::-1]       # cj empieza en el nodo
            caminos[i] = ci + cj[1:]
            caminos.pop(j)
            cambio = True
            break


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a
    n = np.linalg.norm(ab) or 1
    d = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / n for p in pts[1:-1]]
    i = int(np.argmax(d)) + 1
    if d[i - 1] > eps:
        return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]


def chaikin(pts, it=2):
    for _ in range(it):
        nuevo = [pts[0]]
        for i in range(len(pts) - 1):
            p, q = np.array(pts[i]), np.array(pts[i + 1])
            nuevo += [tuple(0.75 * p + 0.25 * q), tuple(0.25 * p + 0.75 * q)]
        nuevo.append(pts[-1])
        pts = nuevo
    return pts


trazos = []
for c in caminos:
    if largo(c) < EM * 0.025:
        continue
    pts = [(p[1], p[0]) for p in c]  # (x, y) en px de la imagen
    if math.dist(pts[0], pts[-1]) < 2.5 and len(pts) > 8:
        # Anillo (o, e cerradas): empieza arriba y gira a la izquierda, como se escribe a mano. Douglas-Peucker
        # sobre un camino cerrado (inicio = fin) lo reduce a un punto: se simplifica por mitades.
        anillo = pts[:-1]
        k0 = min(range(len(anillo)), key=lambda i: anillo[i][1] - 0.3 * anillo[i][0])
        anillo = anillo[k0:] + anillo[:k0]
        if anillo[min(4, len(anillo) - 1)][0] > anillo[0][0]:
            anillo = [anillo[0]] + anillo[1:][::-1]
        anillo.append(anillo[0])
        m = len(anillo) // 2
        pts = chaikin(rdp(anillo[:m + 1], 1.2)[:-1] + rdp(anillo[m:], 1.2), 2)
    else:
        pts = chaikin(rdp(pts, 1.2), 2)
        if pts[0][0] > pts[-1][0]:  # de izquierda a derecha, como se escribe
            pts = pts[::-1]
    em = [[round((x - BX) / EM, 4), round((BY - y) / EM, 4)] for x, y in pts]
    trazos.append(em)
trazos.sort(key=lambda t: min(p[0] for p in t))
json.dump({'em_px': EM, 'trazos': trazos}, open(SAL, 'w'))
print(f'{len(trazos)} trazos, {sum(len(t) for t in trazos)} puntos')
