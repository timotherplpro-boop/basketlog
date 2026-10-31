"""Voix off française de synthèse (Piper « tom », via sherpa-onnx) : nombres en lettres, noms d'équipes
écrits pour être bien prononcés, une phrase après l'autre pour connaître l'instant exact de chacune."""
import os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VOICE = os.environ.get("BL_VOICE_DIR", os.path.join(HERE, ".cache", "vits-piper-fr_FR-tom-medium"))
SR = 44100
SPEED = 1.1
GAP = 0.12  # silence entre deux phrases d'une même réplique

# Noms d'équipes à l'oral (orthographe testée pour que la voix française les prononce correctement).
SPOKEN = {
    "ATL": "Atlanta", "BOS": "Boston", "BKN": "Brooklyn", "CHA": "Charlotte", "CHI": "Chicago",
    "CLE": "Clivlande", "DAL": "Dallasse", "DEN": "Dènnveur", "DET": "Détroit", "GS": "Golden State",
    "HOU": "Youstonne", "IND": "Indiana", "LAC": "les Clippeurs", "LAL": "les Léïkeurs", "MEM": "Memmfisse",
    "MIA": "Maïami", "MIL": "Milwaukee", "MIN": "Minnessota", "NO": "La Nouvelle-Orléans", "NY": "Niou York",
    "OKC": "Oklahoma City", "ORL": "Orlando", "PHI": "Philadelphie", "PHX": "Phoenix", "POR": "Portland",
    "SAC": "Sakraménnto", "SA": "San Antonio", "TOR": "Toronto", "UTAH": "Youtah", "WSH": "Washington",
}
BRAND = "Baskète logue"  # « Basketlog » prononcé correctement


def spoken(abbr):
    return SPOKEN.get(abbr, abbr)


def plural(abbr):
    return spoken(abbr).startswith("les ")


def agree(abbr, sing, plur):
    return plur if plural(abbr) else sing


_U = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
      "treize", "quatorze", "quinze", "seize"]
_T = {2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante"}


def fr_num(n):
    """Entier en lettres (orthographe 1990, avec traits d'union), de 0 à 999."""
    n = int(n)
    if n < 0:
        return "moins " + fr_num(-n)
    if n <= 16:
        return _U[n]
    if n < 20:
        return "dix-" + _U[n - 10]
    if n < 100:
        t, u = divmod(n, 10)
        if t in (7, 9):
            base = "soixante" if t == 7 else "quatre-vingt"
            r = n - (60 if t == 7 else 80)
            if r == 11 and t == 7:
                return "soixante-et-onze"
            return f"{base}-{fr_num(r)}"
        if t == 8:
            return "quatre-vingts" if u == 0 else f"quatre-vingt-{_U[u]}"
        if u == 0:
            return _T[t]
        if u == 1:
            return f"{_T[t]}-et-un"
        return f"{_T[t]}-{_U[u]}"
    c, r = divmod(n, 100)
    head = "cent" if c == 1 else f"{_U[c]}-cents" if r == 0 else f"{_U[c]}-cent"
    return head if r == 0 else f"{head}-{fr_num(r)}"


_tts = None


def _engine():
    global _tts
    if _tts is None:
        import sherpa_onnx
        d = VOICE
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{d}/fr_FR-tom-medium.onnx", lexicon="", tokens=f"{d}/tokens.txt", data_dir=f"{d}/espeak-ng-data",
                                                  noise_scale=0.4, noise_scale_w=0.6),  # diction plus régulière
                num_threads=2),
            max_num_sentences=2)
        _tts = sherpa_onnx.OfflineTts(cfg)
    return _tts


def _resample(x, sr):
    if sr == SR:
        return x
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(SR, sr)
    return resample_poly(x, SR // g, sr // g).astype(np.float32)


def say(chunks):
    """chunks : liste de phrases. Renvoie (audio float32 à 44,1 kHz, débuts de chaque phrase en s, durées)."""
    tts = _engine()
    parts, starts, durs, t = [], [], [], 0.0
    gap = np.zeros(int(GAP * SR), dtype=np.float32)
    for i, text in enumerate(chunks):
        a = tts.generate(text, sid=0, speed=SPEED)
        x = _resample(np.asarray(a.samples, dtype=np.float32), a.sample_rate)
        # coupe les silences de début et de fin pour un enchaînement serré
        e = np.abs(x)
        idx = np.where(e > 0.01 * (e.max() + 1e-9))[0]
        if len(idx):
            x = x[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.06 * SR)]
        if i:
            parts.append(gap)
            t += GAP
        starts.append(t)
        durs.append(len(x) / SR)
        parts.append(x)
        t += len(x) / SR
    return (np.concatenate(parts) if parts else np.zeros(1, dtype=np.float32)), starts, durs
