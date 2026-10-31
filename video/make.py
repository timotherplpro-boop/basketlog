#!/usr/bin/env python3
"""Vidéos TikTok / Reels Basketlog à partir des matchs NBA du jour.

Usage : python3 video/make.py --day jour.json --out sortie/ [--formats choc,favori,serre,programme] [--check]
Le fichier du jour vient de https://basketlog-app.com/api/videos?d=AAAAMMJJ (voir README.md).
"""
import argparse
import functools
import json
import multiprocessing as mp
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
sys.path.insert(0, HERE)
import sound  # noqa: E402
import voice  # noqa: E402
from voice import BRAND, agree, fr_num, spoken  # noqa: E402

FPS = 30
SHOW = {"UTAH": "UTA"}  # sigles affichés
SING = {"Jazz", "Thunder", "Magic", "Heat"}  # « le Thunder », mais « les Spurs »


def les(short):
    return f"le {short}" if short in SING else f"les {short}"

# Intérêt d'une équipe pour le public français (vitrine, joueurs français, gros marchés).
POP = {"LAL": 10, "GS": 9, "BOS": 8, "SA": 9, "NY": 7, "OKC": 7, "DEN": 6, "CLE": 6, "MIA": 6, "DAL": 6, "PHI": 6, "HOU": 6,
       "ATL": 6, "WSH": 5, "MIL": 5, "MIN": 5, "PHX": 5, "LAC": 5, "CHI": 5, "BKN": 4, "DET": 4, "ORL": 4, "IND": 4, "MEM": 4,
       "NO": 4, "POR": 4, "CHA": 4, "TOR": 3, "SAC": 3, "UTAH": 3}


# ---------- données ----------
def num(s):
    m = re.search(r"-?\d+(?:[.,]\d+)?", str(s or ""))
    return float(m.group(0).replace(",", ".")) if m else 0.0


def wl(rec):
    m = re.match(r"(\d+)-(\d+)", str(rec or ""))
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def parse(g):
    t = re.sub(r"^Pronostic\s+", "", g.get("title") or "")
    shortA, shortH = (t.split(" – ") + [g["away"]["abbr"], g["home"]["abbr"]])[:2]
    pA, pH = round(num(g["probs"][0]["v"])), round(num(g["probs"][1]["v"]))
    projA, projH = (int(x) for x in re.findall(r"\d+", g.get("proj") or "0-0")[:2])
    res = g.get("resume") or ""
    streak = {}
    m = re.search(r"séries en cours : ([^)]+)\)", res)
    if m:
        for part in m.group(1).split(","):
            mm = re.match(r"\s*(.+?) ([VD])(\d+)\s*$", part)
            if mm:
                streak[mm.group(1)] = (mm.group(2), int(mm.group(3)))
    hr = re.search(r"les (.+?) sont à (\d+-\d+) à domicile et les (.+?) à (\d+-\d+) à l'extérieur", res)
    b2b = set()
    m = re.search(r"Fatigue : (.+?) (?:a|ont) joué la veille", res)
    if m:
        for name in (shortA, shortH):
            if name in m.group(1):
                b2b.add(name)
    out = {"raw": g, "id": g["id"], "d": g.get("d"), "time": (g.get("tag") or "").split("·")[-1].strip(),
           "venue": (g.get("venue") or "").split("·")[0].strip(), "conf": g.get("conf") or "", "pA": pA, "pH": pH,
           "projA": projA, "projH": projH}
    for side, short in (("a", shortA), ("h", shortH)):
        tm = g["away" if side == "a" else "home"]
        absent = []
        for blk in g.get("injuries") or []:
            if blk.get("abbr") == tm["abbr"]:
                for r in blk.get("rows") or []:
                    if (r.get("status") or "").startswith("Absent"):
                        absent.append({"name": r["name"], "pts": num((r.get("info") or "").split("·")[-1]) if "pts" in (r.get("info") or "") else 0})
        absent.sort(key=lambda r: -r["pts"])
        form = next((f["label"] for f in g.get("form") or [] if f.get("abbr") == tm["abbr"]), "")
        out[side] = {"abbr": tm["abbr"], "short": short, "name": tm["name"], "rec": tm["record"], "absent": absent,
                     "streak": streak.get(short), "b2b": short in b2b, "form": re.sub(r"^\W+\s*", "", form).strip(),
                     "split": (hr.group(2) if side == "h" else hr.group(4)) if hr else None}
    return out


def facts(g, side):
    """Faits marquants d'une équipe : (score, ligne 1, ligne 2, phrase de la voix off)."""
    t = g[side]; A = t["abbr"]; T = spoken(A); em = f"<em>{A}</em>"
    w, l = wl(t["rec"]); out = []
    ab = t["absent"]; big = [r for r in ab if r["pts"] >= 10]
    if len(ab) >= 3 and len(big) >= 2:
        out.append((9, f"{em} privé de {len(ab)} joueurs", f"dont {big[0]['name']} et {big[1]['name']}",
                    f"{T} {agree(A, 'est privé', 'sont privés')} de {fr_num(len(ab))} joueurs."))
    elif big and big[0]["pts"] >= 15:
        out.append((7, f"{em} sans {big[0]['name'].split(' ')[-1]}", f"{big[0]['name']} : {str(big[0]['pts']).replace('.', ',')} pts par match",
                    f"{T} {agree(A, 'doit', 'doivent')} faire sans un joueur à plus de {fr_num(int(big[0]['pts']))} points par match."))
    if w >= 3 and l == 0:
        out.append((8, f"{em} invaincu", f"{w} victoires en {w} matchs", f"{T} n'{agree(A, 'a', 'ont')} pas encore perdu cette saison."))
    if w == 0 and l >= 3:
        out.append((8, f"{em} : 0 victoire", f"{l} défaites en {l} matchs", f"{T} n'{agree(A, 'a', 'ont')} toujours pas gagné cette saison."))
    st = t["streak"]
    if st and st[1] >= 3 and not (w == 0 or l == 0):
        word = "victoires" if st[0] == "V" else "défaites"
        out.append((6, f"{em} : {st[1]} {word} de suite", f"bilan {t['rec']}", f"{T} {agree(A, 'reste', 'restent')} sur {fr_num(st[1])} {word} de suite."))
    sw, sl = wl(t["split"])
    if t["split"] and sl == 0 and sw >= 2:
        where = "à domicile" if side == "h" else "à l'extérieur"
        out.append((5, f"{em} : {t['rec']}", f"et invaincu {where} ({t['split']})", f"{T} n'{agree(A, 'a', 'ont')} pas encore perdu {where} cette saison."))
    if t["b2b"]:
        out.append((4, f"{em} a joué hier", "deuxième match en deux soirs", f"{T} {agree(A, 'joue son', 'jouent leur')} deuxième match en deux soirs."))
    f = t["form"].lower()
    if f:
        adj = {"irrégulier": agree(A, "irrégulier", "irréguliers")}.get(f, f)
        out.append((2, f"{em} : {t['rec']}", t["form"].lower(), f"{T} {agree(A, 'est', 'sont')} {adj}."))
    else:
        out.append((1, f"{em} : {t['rec']}", "bilan de la saison", f"{T} : {fr_num(w)} victoires, {fr_num(l)} défaites."))
    return sorted(out, key=lambda x: -x[0])


def interest(g):
    return POP.get(g["a"]["abbr"], 3) + POP.get(g["h"]["abbr"], 3) + 6 * (1 - abs(g["pH"] - 50) / 50) + 0.4 * (wl(g["a"]["rec"])[0] + wl(g["h"]["rec"])[0])


def fav_side(g):
    return "h" if g["pH"] >= g["pA"] else "a"


# ---------- construction de la vidéo ----------
class Video:
    def __init__(self):
        self.t = 0.0
        self.segs = []
        self.voice = []  # (début absolu, audio)

    def add(self, seg, chunks, lead=0.25, tail=0.35, min_dur=0.0):
        audio, starts, durs = voice.say(chunks) if chunks else (None, [], [])
        vdur = starts[-1] + durs[-1] if chunks else 0.0
        seg["t0"] = round(self.t, 3)
        dur = max(min_dur, lead + vdur + tail)
        seg["t1"] = round(self.t + dur, 3)
        if chunks:
            self.voice.append((self.t + lead, audio))
        self.segs.append(seg)
        self.t += dur
        return [lead + s for s in starts], durs

    def track(self):
        n = int((self.t + 0.5) * voice.SR)
        out = np.zeros(n, dtype=np.float32)
        for t0, a in self.voice:
            i = int(t0 * voice.SR); j = min(n, i + len(a)); out[i:j] += a[:j - i]
        return out


def word_at(sentence, word, start, dur):
    i = sentence.lower().find(word.lower())
    return start + dur * max(0, i) / max(1, len(sentence))


CTA_RESULT = "Analyses NBA et EuroLeague, match par match"
DISC = "Probabilités estimées par le modèle Basketlog. Pas un conseil de pari."


def cta(v, title, ask, ask2, say_ask, say_brand):
    s = {"type": "cta", "title": title, "word": "basketlog", "result": CTA_RESULT, "ask": ask, "ask2": ask2, "disc": DISC}
    rel, durs = v.add(s, [say_brand, say_ask], lead=0.2, tail=1.5, min_dur=4.6)
    s["typeA"] = rel[0] + durs[0] * 0.45; s["typeB"] = rel[0] + durs[0] * 0.98
    s["resultAt"] = rel[0] + durs[0] + 0.05; s["tapAt"] = s["resultAt"] + 0.8
    s["askAt"] = rel[1] - 0.05; s["ask2At"] = rel[1] + 0.3; s["logoAt"] = s["t1"] - s["t0"] - 1.25


def hero_caps(c1, c2, rel, durs, seg_len, hl1=None, hl2=None):
    return [{"at": max(0.3, rel[0] - 0.05), "until": rel[1] - 0.02, "l1": c1[1], "l2": c1[2], "hl": hl1},
            {"at": rel[1] - 0.02, "until": seg_len + 0.05, "l1": c2[1], "l2": c2[2], "hl": hl2}]


def fmt_choc(g, day):
    v = Video(); A, H = g["a"], g["h"]; F = g[fav_side(g)]; D = g["h" if fav_side(g) == "a" else "a"]
    s = {"type": "hook", "kind": "vs", "chip": f"NBA · Cette nuit · {g['time']}", "b1": A["short"], "b2": H["short"],
         "rec1": f"{A['abbr']} · {A['rec']}", "rec2": f"{H['abbr']} · {H['rec']}", "sub": "Le modèle <em>Basketlog</em> a tranché"}
    rel, _ = v.add(s, [f"{spoken(A['abbr'])} contre {spoken(H['abbr'])}, cette nuit.", f"Le modèle {BRAND} a déjà tranché."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    c1, c2 = facts(g, "a")[0], facts(g, "h")[0]
    s = {"type": "phone", "page": "match"}
    rel, durs = v.add(s, [c1[3], c2[3]], lead=0.3, tail=0.2, min_dur=4.5)
    s["caps"] = hero_caps(c1, c2, rel, durs, s["t1"] - s["t0"], "away", "home")
    line = "Forme, absences, fatigue, scénarios : le modèle passe tout au crible."
    s = {"type": "phone", "page": "match", "mode": "scroll", "scrollDur": 2.8}
    rel, durs = v.add(s, [line], lead=0.1, tail=0.2, min_dur=3.6)
    s["pills"] = {"title": "Le modèle <em>analyse</em>", "items": [{"at": word_at(line, w, rel[0], durs[0]), "text": w} for w in ("Forme", "Absences", "Fatigue", "Scénarios")],
                  "hotAt": word_at(line, "le modèle", rel[0], durs[0])}
    s = {"type": "phone", "page": "list", "hlRow": g["id"], "caps": []}
    rel, durs = v.add(s, ["Et il fait ça pour chaque match NBA, tous les soirs."], lead=0.15, tail=0.25, min_dur=3.6)
    s["caps"] = [{"at": 0.15, "until": s["t1"] - s["t0"] + 0.1, "l1": "Chaque match <em>NBA</em>", "l2": "+ EuroLeague · tous les soirs"}]
    pf = max(g["pA"], g["pH"])
    s = {"type": "verdict", "chip": "Verdict du modèle", "team": F["short"], "pct": pf,
         "bar": {"a": {"abbr": A["abbr"], "p": g["pA"]}, "h": {"abbr": H["abbr"], "p": g["pH"]}},
         "score": {"la": F["abbr"], "a": g["projH"] if F is H else g["projA"], "b": g["projA"] if F is H else g["projH"], "lb": D["abbr"]}, "conf": g["conf"].lower()}
    fa, fb = (s["score"]["a"], s["score"]["b"])
    rel, durs = v.add(s, ["Verdict :", f"{spoken(F['abbr'])} {agree(F['abbr'], 'favori', 'favoris')} à {fr_num(pf)} pour cent.", f"Score projeté : {fr_num(fa)}, {fr_num(fb)}."], lead=0.25, tail=0.35)
    s.update(chipAt=max(0.1, rel[0] - 0.1), teamAt=rel[1] + 0.05, countA=rel[1] + 0.45, countB=rel[1] + durs[1] * 0.8, scoreAt=rel[2] - 0.05, confAt=rel[2] + durs[2] + 0.1)
    cta(v, "Le reste de l'analyse<br>est sur <em>Basketlog</em>", "Et toi, tu mets qui gagnant ?", "Dis-le en commentaire",
        "Et toi, tu mets qui gagnant ?", f"Le reste de l'analyse est sur {BRAND}, va voir.")
    return v, f"{A['short']} – {H['short']} cette nuit ({g['time']}) : le modèle Basketlog donne {les(F['short'])} à {pf} %. Et toi, tu mets qui gagnant ?"


def fmt_favori(g, day):
    v = Video(); fs = fav_side(g); F = g[fs]; D = g["h" if fs == "a" else "a"]; pf = max(g["pA"], g["pH"])
    s = {"type": "hook", "kind": "title", "chip": "NBA · Cette nuit", "b1": "Le plus gros", "b2": "favori", "sub": "selon le modèle <em>Basketlog</em>"}
    rel, _ = v.add(s, ["Le plus gros favori de la nuit en NBA ?", f"Le modèle {BRAND} a la réponse."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    c1 = (0, f"<em>{F['abbr']}</em> vs {D['abbr']}", f"{g['time']} · {g['venue']}", f"{spoken(F['abbr'])} contre {spoken(D['abbr'])}, cette nuit.")
    pool = facts(g, fs) + [x for x in facts(g, "h" if fs == "a" else "a") if x[0] >= 6]
    c2 = sorted(pool, key=lambda x: -x[0])[0]
    s = {"type": "phone", "page": "match"}
    rel, durs = v.add(s, [c1[3], c2[3]], lead=0.3, tail=0.25, min_dur=4.2)
    s["caps"] = hero_caps(c1, c2, rel, durs, s["t1"] - s["t0"], "home" if fs == "h" else "away", "home" if c2 in facts(g, "h") else "away")
    s = {"type": "verdict", "chip": "Le favori du modèle", "team": F["short"], "pct": pf,
         "bar": {"a": {"abbr": g["a"]["abbr"], "p": g["pA"]}, "h": {"abbr": g["h"]["abbr"], "p": g["pH"]}},
         "score": {"la": F["abbr"], "a": g["projH"] if fs == "h" else g["projA"], "b": g["projA"] if fs == "h" else g["projH"], "lb": D["abbr"]}, "conf": g["conf"].lower()}
    rel, durs = v.add(s, [f"Le modèle donne {spoken(F['abbr'])} {agree(F['abbr'], 'gagnant', 'gagnants')} à {fr_num(pf)} pour cent.",
                          f"Score projeté : {fr_num(s['score']['a'])}, {fr_num(s['score']['b'])}."], lead=0.25, tail=0.3)
    s.update(chipAt=0.1, teamAt=rel[0] + 0.25, countA=rel[0] + durs[0] * 0.45, countB=rel[0] + durs[0] * 0.92, scoreAt=rel[1] - 0.05, confAt=rel[1] + durs[1] + 0.1)
    s = {"type": "twist", "chip": "Mais attention", "line1": D["short"], "pct": 100 - pf, "line2": "de chances de victoire selon le modèle"}
    rel, durs = v.add(s, ["Mais attention :", f"{spoken(D['abbr'])} {agree(D['abbr'], 'garde', 'gardent')} {fr_num(100 - pf)} pour cent de chances.", "Surprise possible ?"], lead=0.25, tail=0.3)
    s.update(chipAt=max(0.1, rel[0] - 0.1), bigAt=max(0.2, rel[1] - 0.95))  # le chiffre tombe juste avant la phrase qui l'annonce
    cta(v, "Toute l'analyse<br>est sur <em>Basketlog</em>", "Favori solide ou match piège ?", "Dis-le en commentaire",
        "Favori solide ou match piège ? Dis-le en commentaire.", f"Toute l'analyse est sur {BRAND}, va voir.")
    return v, f"Le plus gros favori de la nuit en NBA : {les(F['short'])} à {pf} % contre {les(D['short'])}. Favori solide ou match piège ?"


def fmt_serre(g, day):
    v = Video(); A, H = g["a"], g["h"]
    s = {"type": "hook", "kind": "title", "chip": "NBA · Cette nuit", "b1": "Le match", "b2": "le plus serré", "sub": "selon le modèle <em>Basketlog</em>"}
    rel, _ = v.add(s, ["Le match le plus serré de la nuit en NBA ?", f"Le modèle {BRAND} a la réponse."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    c1 = (0, f"{A['abbr']} <em>@</em> {H['abbr']}", f"{g['time']} · {g['venue']}", f"{spoken(A['abbr'])} contre {spoken(H['abbr'])}.")
    c2 = sorted(facts(g, "a") + facts(g, "h"), key=lambda x: -x[0])[0]
    s = {"type": "phone", "page": "match"}
    rel, durs = v.add(s, [c1[3], c2[3]], lead=0.3, tail=0.25, min_dur=4.0)
    s["caps"] = hero_caps(c1, c2, rel, durs, s["t1"] - s["t0"], None, "away" if c2 in facts(g, "a") else "home")
    s = {"type": "split", "chip": "Probabilités du modèle", "a": {"abbr": A["abbr"], "p": g["pA"]}, "h": {"abbr": H["abbr"], "p": g["pH"]},
         "score": {"la": A["abbr"], "a": g["projA"], "b": g["projH"], "lb": H["abbr"]}, "note": f"Confiance du modèle : <b>{g['conf'].lower()}</b>"}
    rel, durs = v.add(s, [f"{fr_num(g['pA'])} pour cent contre {fr_num(g['pH'])}.", f"Score projeté : {fr_num(g['projA'])}, {fr_num(g['projH'])}.", "Ça peut basculer des deux côtés."], lead=0.25, tail=0.35)
    s.update(chipAt=0.1, splitAt=rel[0], scoreAt=rel[1] - 0.05, noteAt=rel[2] - 0.05)
    cta(v, "Toute l'analyse<br>est sur <em>Basketlog</em>", "Et toi, tu vois qui gagner ?", "Ton pronostic en commentaire",
        "Et toi, tu vois qui gagner ?", f"Toute l'analyse est sur {BRAND}, va voir.")
    return v, f"Le match le plus serré de la nuit en NBA : {A['short']} – {H['short']}, {g['pA']} % contre {g['pH']} % selon le modèle Basketlog. Et toi, tu vois qui gagner ?"


def fmt_programme(games, day):
    v = Video(); n = len(games)
    s = {"type": "hook", "kind": "title", "chip": "NBA · Cette nuit", "b1": f"{n} matchs", "b2": "au programme", "sub": "Les favoris du modèle <em>Basketlog</em>"}
    rel, _ = v.add(s, [f"{fr_num(n).capitalize()} matchs NBA cette nuit.", f"Le modèle {BRAND} a choisi ses favoris."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    order = {r: i for i, r in enumerate(x["id"] for x in games)}
    cards = []
    for x in sorted(games, key=lambda x: order[x["id"]])[:8]:
        fs = fav_side(x)
        cards.append({"id": x["id"], "time": x["time"], "a": SHOW.get(x["a"]["abbr"], x["a"]["abbr"]), "h": SHOW.get(x["h"]["abbr"], x["h"]["abbr"]), "fav": fs, "p": f"{SHOW.get(x[fs]['abbr'], x[fs]['abbr'])} {max(x['pA'], x['pH'])} %"})
    fav = max(games, key=lambda x: max(x["pA"], x["pH"])); close = min(games, key=lambda x: abs(x["pH"] - 50))
    F = fav[fav_side(fav)]
    step = 0.16; cards_at = 0.45; lead = cards_at + step * len(cards) + 0.35
    s = {"type": "program", "chip": "Heures de Paris", "title": "Les favoris", "cards": cards, "cardsAt": cards_at, "cardStep": step}
    rel, durs = v.add(s, [f"Le plus gros favori : {spoken(F['abbr'])}, à {fr_num(max(fav['pA'], fav['pH']))} pour cent.",
                          f"Le plus serré : {spoken(close['a']['abbr'])} contre {spoken(close['h']['abbr'])}."], lead=lead, tail=0.5)
    s["marks"] = [{"id": fav["id"], "at": rel[0], "label": "Plus gros favori"}, {"id": close["id"], "at": rel[1], "label": "Le plus serré"}]
    cta(v, "Toutes les analyses<br>sont sur <em>Basketlog</em>", "Ton pronostic pour cette nuit ?", "Dis-le en commentaire",
        "Et toi, ton pronostic pour cette nuit ?", f"Toutes les analyses sont sur {BRAND}, va voir.")
    return v, f"{n} matchs NBA cette nuit : les favoris du modèle Basketlog. Le plus gros favori : {les(F['short'])} ({max(fav['pA'], fav['pH'])} %). Ton pronostic ?"


def cues_for(segs):
    c = []
    for i, s in enumerate(segs):
        t0 = s["t0"]
        if s["type"] == "hook":
            c += [("impact", t0, {"g": 1.0}), ("impact", t0 + 0.30, {"g": 0.75, "big": False})]
        elif i:
            prev = segs[i - 1]
            if s["type"] == "phone" and prev["type"] == "hook":
                c.append(("whoosh", t0 - 0.3, {"d": 0.55, "f0": 250, "f1": 4000, "g": 1.0}))
            elif s["type"] == "phone" and s.get("mode") == "scroll":
                c.append(("whoosh", t0 - 0.25, {"d": 0.6, "f0": 400, "f1": 6000, "g": 0.35}))
                c.append(("riser", t0 + 0.2, {"d": 2.6, "g": 0.11}))
            elif s["type"] == "phone" and s.get("page") == "list":
                c.append(("whoosh", t0 - 0.12, {"d": 0.4, "f0": 600, "f1": 5000, "g": 0.6}))
            elif prev["type"] == "phone":
                c.append(("whoosh", t0 + 0.08, {"d": 0.55, "f0": 3500, "f1": 200, "g": 0.5}))
            else:
                c.append(("whoosh", t0 - 0.1, {"d": 0.5, "f0": 300, "f1": 4500, "g": 0.8}))
        for p in (s.get("pills") or {}).get("items", []):
            c.append(("pop", t0 + p["at"], {"f": 820, "g": 0.2}))
        if s.get("pills"):
            c.append(("tick", t0 + s["pills"]["hotAt"], {"f": 1900, "g": 0.32}))
        # montées (« riser ») discrètes : elles tombent pendant que la voix annonce le chiffre
        if s["type"] == "verdict":
            c += [("impact", t0 + s["teamAt"], {"g": 0.45, "big": False}), ("riser", t0 + s["countA"], {"d": max(0.3, s["countB"] - s["countA"]), "g": 0.12}),
                  ("impact", t0 + s["countB"], {"g": 0.7})]
        if s["type"] == "split":
            c += [("riser", t0 + s["splitAt"], {"d": 1.0, "g": 0.11}), ("impact", t0 + s["splitAt"] + 1.0, {"g": 0.7})]
        if s["type"] == "twist":
            c += [("riser", t0 + s["bigAt"], {"d": 0.8, "g": 0.11}), ("impact", t0 + s["bigAt"] + 0.8, {"g": 0.5})]
        if s["type"] == "program":
            c += [("pop", t0 + s["cardsAt"] + k * s["cardStep"], {"f": 760, "g": 0.15}) for k in range(len(s["cards"]))]
            c += [("tick", t0 + m["at"], {"f": 1700, "g": 0.3}) for m in s["marks"]]
        if s["type"] == "cta":
            n = len(s["word"])
            c += [("key", t0 + s["typeA"] + k * (s["typeB"] - s["typeA"]) / n, {"g": 0.06}) for k in range(n)]  # discret : ne couvre pas la voix
            c += [("pop", t0 + s["tapAt"], {"f": 620, "g": 0.4}), ("impact", t0 + s["logoAt"], {"g": 0.8})]
    return c


def music_for(segs, dur):
    mutes = []
    for s in segs:
        if s["type"] == "verdict":
            mutes.append((s["t0"] - 0.02, s["t0"] + s["countB"]))
        elif s["type"] == "split":
            mutes.append((s["t0"] - 0.02, s["t0"] + s["splitAt"] + 1.0))
        elif s["type"] == "twist":
            mutes.append((s["t0"] - 0.02, s["t0"] + s["bigAt"] + 0.8))
    c = [s for s in segs if s["type"] == "cta"]
    return {"mutes": mutes, "stop": c[0]["t0"] + c[0]["logoAt"] if c else dur, "bells_until": segs[0]["t1"], "bells_from": c[0]["t0"] if c else None}


# ---------- rendu ----------
def make_site(tmp):
    site = os.path.join(tmp, "site")
    os.makedirs(os.path.join(site, "fonts"), exist_ok=True)
    for f in ("stage.html", "phone.js", "phone.css"):
        shutil.copy(os.path.join(HERE, "engine", f), site)
    shutil.copy(os.path.join(REPO, "app", "globals.css"), site)
    nm = os.environ.get("BL_FONTS_DIR", os.path.join(REPO, "node_modules", "@fontsource"))
    for f in ("inter", "jetbrains-mono", "tilt-warp"):
        os.symlink(os.path.join(nm, f), os.path.join(site, "fonts", f))
    return site


def serve(site):
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=site))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def open_page(p, url):
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 540, "height": 960}, device_scale_factor=2)
    pg.goto(url)
    pg.wait_for_load_state("networkidle")
    info = pg.evaluate("async () => await init()")
    for t in (0.5, 3, 6, 9, 12, 15, 20):
        pg.evaluate("t => render(t)", t)
    pg.evaluate("() => new Promise(r => setTimeout(r, 300))")
    return b, pg, info


def render_part(args):
    url, f0, f1, out = args
    from playwright.sync_api import sync_playwright
    tmp = out.replace(".mp4", ".tmp.mp4")
    with sync_playwright() as p:
        b, pg, _ = open_page(p, url)
        ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
                               "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-pix_fmt", "yuv420p", "-r", str(FPS), tmp], stdin=subprocess.PIPE)
        for fi in range(f0, f1):
            pg.evaluate("t => { render(t); return new Promise(r => requestAnimationFrame(r)); }", fi / FPS)
            ff.stdin.write(pg.screenshot(type="jpeg", quality=92))
        ff.stdin.close()
        rc = ff.wait()
        b.close()
    if rc == 0:
        os.replace(tmp, out)
    return rc


def render_video(site, port, dur, outdir, check=None):
    url = f"http://127.0.0.1:{port}/stage.html"
    if check:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            b, pg, info = open_page(p, url + "?guides=1")
            for t in check:
                pg.evaluate("t => render(t)", t)
                pg.screenshot(path=os.path.join(outdir, f"check_{t:05.2f}.jpg"), type="jpeg", quality=80)
            b.close()
        return None
    frames = int(round(dur * FPS))
    mid = frames // 2
    parts = [(url, 0, mid, os.path.join(outdir, "p0.mp4")), (url, mid, frames, os.path.join(outdir, "p1.mp4"))]
    with mp.get_context("spawn").Pool(2) as pool:
        rcs = pool.map(render_part, parts)
    if any(rcs):
        raise RuntimeError(f"rendu en échec : {rcs}")
    lst = os.path.join(outdir, "parts.txt")
    with open(lst, "w") as f:
        for p in parts:
            f.write(f"file '{p[3]}'\n")
    video = os.path.join(outdir, "video.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video], check=True)
    return video


def build_one(v, game, day, fmt, outdir, tag, check=None, seed=11):
    dur = round(v.t, 3)
    tmp = tempfile.mkdtemp(prefix=f"bl-{fmt}-")
    site = make_site(tmp)
    data = {"end": dur, "game": game["raw"] if game else None, "day": day, "segs": v.segs}
    with open(os.path.join(site, "data.js"), "w") as f:
        f.write("window.VIDEO = " + json.dumps(data, ensure_ascii=False) + ";")
    srv = serve(site)
    try:
        if check is not None:
            render_video(site, srv.server_port, dur, outdir, check=check)
            return None
        t0 = time.time()
        video = render_video(site, srv.server_port, dur, tmp)
        print(f"  rendu {fmt} : {dur:.1f} s de vidéo en {time.time() - t0:.0f} s", flush=True)
    finally:
        srv.shutdown()
    wv, wn = os.path.join(tmp, "mix_voix.wav"), os.path.join(tmp, "mix_sans_voix.wav")
    sound.build(dur, v.track(), cues_for(v.segs), music_for(v.segs, dur), wv, wn, tmp, seed=seed)
    outs = []
    for wav, suffix in ((wv, "voix"), (wn, "sans-voix")):
        out = os.path.join(outdir, f"{tag}-{suffix}.mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                        "-shortest", "-movflags", "+faststart", out + ".tmp.mp4"], check=True)
        os.replace(out + ".tmp.mp4", out)
        outs.append(out)
    shutil.rmtree(tmp, ignore_errors=True)
    return outs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--day", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--formats", default="choc,favori,serre,programme")
    ap.add_argument("--exclude", default="", help="identifiants de matchs à ne pas reprendre en « choc » (déjà faits)")
    ap.add_argument("--check", action="store_true", help="quelques images fixes par vidéo, sans rendu complet")
    a = ap.parse_args()
    day = json.load(open(a.day))
    # Seulement les matchs à venir (un match déjà commencé n'a plus d'intérêt pour une vidéo de pronostic)
    games = [parse(g) for g in day.get("games") or [] if g.get("state", "pre") == "pre"]
    if not games:
        print("Aucun match ce jour-là : pas de vidéo.")
        return
    d = day.get("d") or games[0]["d"]
    date = f"{d[:4]}-{d[4:6]}-{d[6:]}"
    outdir = os.path.join(a.out, date)
    os.makedirs(outdir, exist_ok=True)
    fav = max(games, key=lambda x: max(x["pA"], x["pH"]))
    close = min(games, key=lambda x: abs(x["pH"] - 50))
    excl = set(filter(None, a.exclude.split(",")))
    pool = [x for x in games if x["id"] not in excl and (len(games) < 3 or x["id"] not in (fav["id"], close["id"]))] or games
    choc = max(pool, key=interest)
    plan = []
    for i, f in enumerate([f for f in a.formats.split(",") if f]):
        if f == "choc":
            plan.append((f, choc))
        elif f == "favori" and len(games) >= 2:
            plan.append((f, fav))
        elif f == "serre" and len(games) >= 3 and close["id"] != fav["id"]:
            plan.append((f, close))
        elif f == "programme" and len(games) >= 3:
            plan.append((f, None))
    summary = []
    for k, (f, g) in enumerate(plan, 1):
        if f == "programme":
            v, caption = fmt_programme(games, day)
            tag = f"{k}-programme"
        else:
            v, caption = {"choc": fmt_choc, "favori": fmt_favori, "serre": fmt_serre}[f](g, day)
            tag = f"{k}-{f}-{g['a']['abbr']}-{g['h']['abbr']}"
        print(f"{tag} : {v.t:.1f} s", flush=True)
        if a.check:
            sub = os.path.join(outdir, "check", tag)
            os.makedirs(sub, exist_ok=True)
            marks = sorted({round(s["t0"] + x, 2) for s in v.segs for x in (0.9, (s["t1"] - s["t0"]) * 0.8)})
            build_one(v, g, day, f, sub, tag, check=marks)
            continue
        outs = build_one(v, g, day, f, outdir, tag, seed=11 + k)
        summary.append({"format": f, "files": [os.path.basename(o) for o in outs], "duration": round(v.t, 1), "caption": caption})
    if not a.check:
        with open(os.path.join(outdir, "legendes.txt"), "w") as fh:
            for s in summary:
                fh.write(f"{s['files'][0]}\n{s['caption']}\n#NBA #basket #basketball #pronostic #Basketlog\n\n")
        json.dump(summary, open(os.path.join(outdir, "videos.json"), "w"), ensure_ascii=False, indent=1)
        print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
