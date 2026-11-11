#!/usr/bin/env python3
"""Vidéos TikTok / Reels Basketlog à partir des matchs NBA du jour, en anglais (public américain, heures de New York).

Usage : python3 video/make.py --day jour.json --out sortie/ [--formats choc,favori,serre,programme] [--check]
Quand le plus gros favori de la nuit est en confiance « Très élevée » (88 % et plus), la vidéo « favori » devient « sur » :
elle passe en premier et montre le bilan réel de ce niveau (champ sureRecord du fichier du jour).
Le fichier du jour vient de https://basketlog-app.com/api/videos?d=AAAAMMJJ&lang=en (voir README.md).
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
from voice import BRAND, agree, an, cap, spoken  # noqa: E402

FPS = 30
SHOW = {"UTAH": "UTA"}  # sigles affichés


def the(short):
    return f"the {short}"

# Intérêt d'une équipe pour le public américain (gros marchés, stars, équipes en vue).
POP = {"LAL": 10, "GS": 9, "BOS": 9, "NY": 9, "OKC": 7, "SA": 7, "DEN": 7, "PHI": 7, "MIA": 7, "DAL": 7, "CHI": 7, "CLE": 6,
       "MIL": 6, "PHX": 6, "LAC": 6, "MIN": 6, "HOU": 6, "ATL": 5, "BKN": 5, "DET": 5, "ORL": 5, "IND": 5, "MEM": 5, "NO": 5,
       "SAC": 4, "POR": 4, "CHA": 4, "WSH": 4, "TOR": 4, "UTAH": 4}


# ---------- données ----------
def num(s):
    m = re.search(r"-?\d+(?:[.,]\d+)?", str(s or ""))
    return float(m.group(0).replace(",", ".")) if m else 0.0


def wl(rec):
    m = re.match(r"(\d+)-(\d+)", str(rec or ""))
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def parse(g):
    t = re.sub(r"\s+prediction$", "", g.get("title") or "")
    shortA, shortH = (re.split(r" vs | – ", t) + [g["away"]["abbr"], g["home"]["abbr"]])[:2]
    pA, pH = round(num(g["probs"][0]["v"])), round(num(g["probs"][1]["v"]))
    projA, projH = (int(x) for x in re.findall(r"\d+", g.get("proj") or "0-0")[:2])
    fx = g.get("facts") or {}  # séries, bilans domicile/extérieur, back-to-back (champ « facts » de /api/videos)
    out = {"raw": g, "id": g["id"], "d": g.get("d"), "time": (g.get("tag") or "").split("·")[-1].strip(),
           "venue": (g.get("venue") or "").split("·")[0].strip(), "conf": g.get("conf") or "", "pA": pA, "pH": pH,
           "projA": projA, "projH": projH, "sure": bool(g.get("sure"))}
    for side, short in (("a", shortA), ("h", shortH)):
        tm = g["away" if side == "a" else "home"]
        f = fx.get("away" if side == "a" else "home") or {}
        absent = []
        for blk in g.get("injuries") or []:
            if blk.get("abbr") == tm["abbr"]:
                for r in blk.get("rows") or []:
                    if (r.get("status") or "") in ("Out", "Absent"):
                        absent.append({"name": r["name"], "pts": num((r.get("info") or "").split("·")[-1]) if "pts" in (r.get("info") or "") else 0})
        absent.sort(key=lambda r: -r["pts"])
        form = next((x["label"] for x in g.get("form") or [] if x.get("abbr") == tm["abbr"]), "")
        st = re.match(r"([WL])(\d+)$", str(f.get("streak") or ""))
        out[side] = {"abbr": tm["abbr"], "short": short, "name": tm["name"], "rec": tm["record"], "absent": absent,
                     "streak": (st.group(1), int(st.group(2))) if st else None, "b2b": bool(f.get("b2b")),
                     "form": re.sub(r"^\W+\s*", "", form).strip(), "split": f.get("split")}
    return out


def facts(g, side):
    """Faits marquants d'une équipe : (score, ligne 1, ligne 2, phrase de la voix off)."""
    t = g[side]; A = t["abbr"]; T = spoken(A); em = f"<em>{A}</em>"
    w, l = wl(t["rec"]); out = []
    ab = t["absent"]; big = [r for r in ab if r["pts"] >= 10]
    if len(ab) >= 3 and len(big) >= 2:
        out.append((9, f"{em} missing {len(ab)} players", f"including {big[0]['name']} and {big[1]['name']}",
                    f"{cap(T)} {agree(A, 'is', 'are')} missing {len(ab)} players."))
    elif big and big[0]["pts"] >= 15:
        out.append((7, f"{em} without {big[0]['name'].split(' ')[-1]}", f"{big[0]['name']}: {big[0]['pts']:g} PPG",
                    f"{cap(T)} {agree(A, 'has', 'have')} to play without a {int(big[0]['pts'])}-point scorer."))
    if w >= 3 and l == 0:
        out.append((8, f"{em} unbeaten", f"{w}-0 this season", f"{cap(T)} {agree(A, 'is', 'are')} still unbeaten this season."))
    if w == 0 and l >= 3:
        out.append((8, f"{em}: still winless", f"0-{l} this season", f"{cap(T)} {agree(A, 'is', 'are')} still looking for a first win."))
    st = t["streak"]
    if st and st[1] >= 3 and not (w == 0 or l == 0):
        word = "wins" if st[0] == "W" else "losses"
        out.append((6, f"{em}: {st[1]} straight {word}", f"record {t['rec']}", f"{cap(T)} {agree(A, 'has', 'have')} {st[1]} straight {word}."))
    sw, sl = wl(t["split"])
    if t["split"] and sl == 0 and sw >= 2:
        where = "at home" if side == "h" else "on the road"
        out.append((5, f"{em}: {t['rec']}", f"unbeaten {where} ({t['split']})", f"{cap(T)} {agree(A, 'has', 'have')}n't lost {where} yet."))
    if t["b2b"]:
        out.append((4, f"{em} played last night", "second game in two nights", f"{cap(T)} {agree(A, 'is', 'are')} on the second night of a back-to-back."))
    f = t["form"].lower()
    if f and not f.startswith("no games"):
        out.append((2, f"{em}: {t['rec']}", f, f"{cap(T)} {agree(A, 'is', 'are')} {f}."))
    else:
        out.append((1, f"{em}: {t['rec']}", "season record", f"{cap(T)}: {w} wins, {l} losses."))
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


CTA_RESULT = "NBA and EuroLeague analysis, game by game"
DISC = "Probabilities estimated by the Basketlog model. Not betting advice."
TAGS = "#NBA #basketball #NBApicks #NBAtonight #Basketlog"


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
    s = {"type": "hook", "kind": "vs", "chip": f"NBA · Tonight · {g['time']}", "b1": A["short"], "b2": H["short"],
         "rec1": f"{A['abbr']} · {A['rec']}", "rec2": f"{H['abbr']} · {H['rec']}", "sub": "The <em>Basketlog</em> model has a pick"}
    rel, _ = v.add(s, [f"{cap(spoken(A['abbr']))} at {spoken(H['abbr'])}, tonight.", f"The {BRAND} model already has a pick."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    c1, c2 = facts(g, "a")[0], facts(g, "h")[0]
    s = {"type": "phone", "page": "match"}
    rel, durs = v.add(s, [c1[3], c2[3]], lead=0.3, tail=0.2, min_dur=4.5)
    s["caps"] = hero_caps(c1, c2, rel, durs, s["t1"] - s["t0"], "away", "home")
    line = "Form, injuries, fatigue, scenarios: the model checks it all."
    s = {"type": "phone", "page": "match", "mode": "scroll", "scrollDur": 2.8}
    rel, durs = v.add(s, [line], lead=0.1, tail=0.2, min_dur=3.6)
    s["pills"] = {"title": "The model <em>checks</em>", "items": [{"at": word_at(line, w, rel[0], durs[0]), "text": w} for w in ("Form", "Injuries", "Fatigue", "Scenarios")],
                  "hotAt": word_at(line, "the model", rel[0], durs[0])}
    s = {"type": "phone", "page": "list", "hlRow": g["id"], "caps": []}
    rel, durs = v.add(s, ["And it does that for every NBA game, every night."], lead=0.15, tail=0.25, min_dur=3.6)
    s["caps"] = [{"at": 0.15, "until": s["t1"] - s["t0"] + 0.1, "l1": "Every <em>NBA</em> game", "l2": "+ EuroLeague · every night"}]
    pf = max(g["pA"], g["pH"])
    s = {"type": "verdict", "chip": "The model's pick", "team": F["short"], "pct": pf,
         "bar": {"a": {"abbr": A["abbr"], "p": g["pA"]}, "h": {"abbr": H["abbr"], "p": g["pH"]}},
         "score": {"la": F["abbr"], "a": g["projH"] if F is H else g["projA"], "b": g["projA"] if F is H else g["projH"], "lb": D["abbr"]}, "conf": g["conf"].lower()}
    fa, fb = (s["score"]["a"], s["score"]["b"])
    rel, durs = v.add(s, ["The pick:", f"{cap(spoken(F['abbr']))}, with {an(pf)} {pf} percent chance to win.", f"Projected score: {fa} to {fb}."], lead=0.25, tail=0.35)
    s.update(chipAt=max(0.1, rel[0] - 0.1), teamAt=rel[1] + 0.05, countA=rel[1] + 0.45, countB=rel[1] + durs[1] * 0.8, scoreAt=rel[2] - 0.05, confAt=rel[2] + durs[2] + 0.1)
    cta(v, "The full breakdown<br>is on <em>Basketlog</em>", "Who's winning this one?", "Drop your pick in the comments",
        "Who's winning this one? Drop your pick in the comments.", f"The full breakdown is on {BRAND}. Go check it out.")
    return v, f"{A['short']} at {H['short']} tonight ({g['time']} ET): the Basketlog model gives {the(F['short'])} {an(pf)} {pf}% chance to win. Who's winning this one?"


def fmt_favori(g, day):
    v = Video(); fs = fav_side(g); F = g[fs]; D = g["h" if fs == "a" else "a"]; pf = max(g["pA"], g["pH"])
    s = {"type": "hook", "kind": "title", "chip": "NBA · Tonight", "b1": "The biggest", "b2": "favorite", "sub": "according to the <em>Basketlog</em> model"}
    rel, _ = v.add(s, ["Who's the biggest NBA favorite tonight?", f"The {BRAND} model has the answer."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    c1 = (0, f"<em>{F['abbr']}</em> vs {D['abbr']}", f"{g['time']} · {g['venue']}", f"{cap(spoken(F['abbr']))} versus {spoken(D['abbr'])}, tonight.")
    pool = facts(g, fs) + [x for x in facts(g, "h" if fs == "a" else "a") if x[0] >= 6]
    c2 = sorted(pool, key=lambda x: -x[0])[0]
    s = {"type": "phone", "page": "match"}
    rel, durs = v.add(s, [c1[3], c2[3]], lead=0.3, tail=0.25, min_dur=4.2)
    s["caps"] = hero_caps(c1, c2, rel, durs, s["t1"] - s["t0"], "home" if fs == "h" else "away", "home" if c2 in facts(g, "h") else "away")
    s = {"type": "verdict", "chip": "The model's favorite", "team": F["short"], "pct": pf,
         "bar": {"a": {"abbr": g["a"]["abbr"], "p": g["pA"]}, "h": {"abbr": g["h"]["abbr"], "p": g["pH"]}},
         "score": {"la": F["abbr"], "a": g["projH"] if fs == "h" else g["projA"], "b": g["projA"] if fs == "h" else g["projH"], "lb": D["abbr"]}, "conf": g["conf"].lower()}
    rel, durs = v.add(s, [f"The model gives {spoken(F['abbr'])} {an(pf)} {pf} percent chance to win.",
                          f"Projected score: {s['score']['a']} to {s['score']['b']}."], lead=0.25, tail=0.3)
    s.update(chipAt=0.1, teamAt=rel[0] + 0.25, countA=rel[0] + durs[0] * 0.45, countB=rel[0] + durs[0] * 0.92, scoreAt=rel[1] - 0.05, confAt=rel[1] + durs[1] + 0.1)
    s = {"type": "twist", "chip": "But watch out", "line1": D["short"], "pct": 100 - pf, "line2": "chance to win, according to the model"}
    rel, durs = v.add(s, ["But watch out:", f"{cap(spoken(D['abbr']))} still {agree(D['abbr'], 'has', 'have')} {an(100 - pf)} {100 - pf} percent chance.", "Upset alert?"], lead=0.25, tail=0.3)
    s.update(chipAt=max(0.1, rel[0] - 0.1), bigAt=max(0.2, rel[1] - 0.95))  # le chiffre tombe juste avant la phrase qui l'annonce
    cta(v, "The full breakdown<br>is on <em>Basketlog</em>", "Lock or trap game?", "Tell us in the comments",
        "Lock or trap game? Tell us in the comments.", f"The full breakdown is on {BRAND}. Go check it out.")
    return v, f"Tonight's biggest NBA favorite: {the(F['short'])} at {pf}% against {the(D['short'])}. Lock or trap game?"


def fmt_sur(g, day, rec=None):
    """Confiance très élevée (favori à 88 % et plus) : le pronostic le plus sûr de la nuit, puis le bilan réel de ce niveau."""
    v = Video(); fs = fav_side(g); F = g[fs]; D = g["h" if fs == "a" else "a"]; pf = max(g["pA"], g["pH"])
    s = {"type": "hook", "kind": "title", "chip": "NBA · Tonight", "b1": "Very high", "b2": "confidence", "sub": "according to the <em>Basketlog</em> model"}
    rel, _ = v.add(s, ["Tonight's safest NBA pick?", f"Very high confidence from the {BRAND} model."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    c1 = (0, f"<em>{F['abbr']}</em> vs {D['abbr']}", f"{g['time']} · {g['venue']}", f"{cap(spoken(F['abbr']))} versus {spoken(D['abbr'])}, tonight.")
    pool = facts(g, fs) + [x for x in facts(g, "h" if fs == "a" else "a") if x[0] >= 6]
    c2 = sorted(pool, key=lambda x: -x[0])[0]
    s = {"type": "phone", "page": "match"}
    rel, durs = v.add(s, [c1[3], c2[3]], lead=0.3, tail=0.25, min_dur=4.2)
    s["caps"] = hero_caps(c1, c2, rel, durs, s["t1"] - s["t0"], "home" if fs == "h" else "away", "home" if c2 in facts(g, "h") else "away")
    s = {"type": "verdict", "chip": "The model's favorite", "team": F["short"], "pct": pf,
         "bar": {"a": {"abbr": g["a"]["abbr"], "p": g["pA"]}, "h": {"abbr": g["h"]["abbr"], "p": g["pH"]}},
         "score": {"la": F["abbr"], "a": g["projH"] if fs == "h" else g["projA"], "b": g["projA"] if fs == "h" else g["projH"], "lb": D["abbr"]}, "conf": "very high"}
    rel, durs = v.add(s, [f"The model gives {spoken(F['abbr'])} {an(pf)} {pf} percent chance to win.",
                          f"Projected score: {s['score']['a']} to {s['score']['b']}."], lead=0.25, tail=0.3)
    s.update(chipAt=0.1, teamAt=rel[0] + 0.25, countA=rel[0] + durs[0] * 0.45, countB=rel[0] + durs[0] * 0.92, scoreAt=rel[1] - 0.05, confAt=rel[1] + durs[1] + 0.1)
    tail = ""
    if rec and rec.get("n", 0) >= 20:
        # Bilan réel de ce niveau (le même que la carte « Confiance très élevée » de basketlog-app.com/app/bilan)
        ok, n = int(rec["ok"]), int(rec["n"]); rate = round(100 * ok / n)
        s = {"type": "twist", "chip": "The model's record", "line1": f"{ok} of {n}", "pct": rate,
             "line2": f"correct picks at very high confidence<br>NBA · record since {rec.get('since') or 'last season'}"}
        rel, durs = v.add(s, ["And at this confidence level?", f"The model has been right {ok} times out of {n} since last season."], lead=0.25, tail=0.45)
        s.update(chipAt=max(0.1, rel[0] - 0.1), bigAt=max(0.2, rel[1] - 0.95))
        tail = f" At this confidence level, the model has been right {ok} times out of {n} since last season ({rate}%)."
    cta(v, "The full breakdown<br>is on <em>Basketlog</em>", "Lock or trap game?", "Tell us in the comments",
        "Lock or trap game? Tell us in the comments.", f"The full breakdown is on {BRAND}. Go check it out.")
    return v, f"Very high confidence tonight in the NBA: the Basketlog model gives {the(F['short'])} {an(pf)} {pf}% chance against {the(D['short'])}.{tail} Lock or trap game?"


def fmt_serre(g, day):
    v = Video(); A, H = g["a"], g["h"]
    s = {"type": "hook", "kind": "title", "chip": "NBA · Tonight", "b1": "The closest", "b2": "game", "sub": "according to the <em>Basketlog</em> model"}
    rel, _ = v.add(s, ["Tonight's closest NBA game?", f"The {BRAND} model has the answer."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    c1 = (0, f"{A['abbr']} <em>@</em> {H['abbr']}", f"{g['time']} · {g['venue']}", f"{cap(spoken(A['abbr']))} at {spoken(H['abbr'])}.")
    c2 = sorted(facts(g, "a") + facts(g, "h"), key=lambda x: -x[0])[0]
    s = {"type": "phone", "page": "match"}
    rel, durs = v.add(s, [c1[3], c2[3]], lead=0.3, tail=0.25, min_dur=4.0)
    s["caps"] = hero_caps(c1, c2, rel, durs, s["t1"] - s["t0"], None, "away" if c2 in facts(g, "a") else "home")
    s = {"type": "split", "chip": "Model probabilities", "a": {"abbr": A["abbr"], "p": g["pA"]}, "h": {"abbr": H["abbr"], "p": g["pH"]},
         "score": {"la": A["abbr"], "a": g["projA"], "b": g["projH"], "lb": H["abbr"]}, "note": f"Model confidence: <b>{g['conf'].lower()}</b>"}
    rel, durs = v.add(s, [f"{g['pA']} percent to {g['pH']}.", f"Projected score: {g['projA']} to {g['projH']}.", "This one could go either way."], lead=0.25, tail=0.35)
    s.update(chipAt=0.1, splitAt=rel[0], scoreAt=rel[1] - 0.05, noteAt=rel[2] - 0.05)
    cta(v, "The full breakdown<br>is on <em>Basketlog</em>", "Who takes this one?", "Drop your pick in the comments",
        "Who takes this one? Drop your pick in the comments.", f"The full breakdown is on {BRAND}. Go check it out.")
    return v, f"Tonight's closest NBA game: {A['short']} at {H['short']}, {g['pA']}% to {g['pH']}% according to the Basketlog model. Who takes this one?"


def fmt_programme(games, day):
    v = Video(); n = len(games)
    s = {"type": "hook", "kind": "title", "chip": "NBA · Tonight", "b1": f"{n} games", "b2": "on the slate", "sub": "The <em>Basketlog</em> model's favorites"}
    rel, _ = v.add(s, [f"{n} NBA games tonight.", f"The {BRAND} model picked its favorites."], lead=0.1, tail=0.25)
    s["subAt"] = rel[1] - 0.05
    order = {r: i for i, r in enumerate(x["id"] for x in games)}
    cards = []
    for x in sorted(games, key=lambda x: order[x["id"]])[:8]:
        fs = fav_side(x)
        cards.append({"id": x["id"], "time": x["time"], "a": SHOW.get(x["a"]["abbr"], x["a"]["abbr"]), "h": SHOW.get(x["h"]["abbr"], x["h"]["abbr"]), "fav": fs, "p": f"{SHOW.get(x[fs]['abbr'], x[fs]['abbr'])} {max(x['pA'], x['pH'])}%"})
    fav = max(games, key=lambda x: max(x["pA"], x["pH"])); close = min(games, key=lambda x: abs(x["pH"] - 50))
    F = fav[fav_side(fav)]
    step = 0.16; cards_at = 0.45; lead = cards_at + step * len(cards) + 0.35
    s = {"type": "program", "chip": "Times ET", "title": "The favorites", "cards": cards, "cardsAt": cards_at, "cardStep": step}
    first = "Very high confidence" if fav["sure"] else "Biggest favorite"
    rel, durs = v.add(s, [f"{first}: {spoken(F['abbr'])}, at {max(fav['pA'], fav['pH'])} percent.",
                          f"Closest game: {spoken(close['a']['abbr'])} at {spoken(close['h']['abbr'])}."], lead=lead, tail=0.5)
    shown = {c["id"] for c in cards}
    sure = [x["id"] for x in games if x["sure"] and x["id"] in shown] if fav["sure"] else []
    s["marks"] = [{"id": i, "at": rel[0], "label": "Very high confidence"} for i in sure] or [{"id": fav["id"], "at": rel[0], "label": "Biggest favorite"}]
    s["marks"].append({"id": close["id"], "at": rel[1], "label": "Closest game"})
    cta(v, "Every breakdown<br>is on <em>Basketlog</em>", "Your picks for tonight?", "Drop them in the comments",
        "What are your picks for tonight? Drop them in the comments.", f"Every breakdown is on {BRAND}. Go check it out.")
    return v, f"{n} NBA games tonight: the Basketlog model's favorites. {first}: {the(F['short'])} ({max(fav['pA'], fav['pH'])}%). What are your picks?"


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
    # Vidéos en anglais (public américain) : le fichier du jour doit venir de /api/videos?lang=en
    if day.get("lang") != "en":
        sys.exit("Fichier du jour pas en anglais : le prendre sur https://basketlog-app.com/api/videos?d=AAAAMMJJ&lang=en")
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
    rec = day.get("sureRecord")  # bilan réel du niveau « Très élevée » (NBA), calculé par le site
    plan = []
    for i, f in enumerate([f for f in a.formats.split(",") if f]):
        if f == "choc":
            plan.append((f, choc))
        elif f in ("favori", "sur") and len(games) >= 2 and not any(x[0] in ("favori", "sur") for x in plan):
            if fav["sure"]:
                plan.append(("sur", fav))
            elif f == "favori":
                plan.append((f, fav))
        elif f == "serre" and len(games) >= 3 and close["id"] != fav["id"]:
            plan.append((f, close))
        elif f == "programme" and len(games) >= 3:
            plan.append((f, None))
    plan.sort(key=lambda x: x[0] != "sur")  # confiance très élevée : la vidéo à poster en premier
    summary = []
    for k, (f, g) in enumerate(plan, 1):
        if f == "programme":
            v, caption = fmt_programme(games, day)
            tag = f"{k}-programme"
        else:
            v, caption = fmt_sur(g, day, rec) if f == "sur" else {"choc": fmt_choc, "favori": fmt_favori, "serre": fmt_serre}[f](g, day)
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
                fh.write(f"{s['files'][0]}\n{s['caption']}\n{TAGS}\n\n")
        json.dump(summary, open(os.path.join(outdir, "videos.json"), "w"), ensure_ascii=False, indent=1)
        print(json.dumps(summary, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
