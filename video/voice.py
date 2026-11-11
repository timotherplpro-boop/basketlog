"""Voix off anglaise (américaine) de synthèse (Piper « ryan », via sherpa-onnx) : noms d'équipes écrits pour être
bien prononcés, une phrase après l'autre pour connaître l'instant exact de chacune. Public visé : les États-Unis."""
import os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = "en_US-ryan-medium"
VOICE = os.environ.get("BL_VOICE_DIR", os.path.join(HERE, ".cache", f"vits-piper-{MODEL}"))
SR = 44100
SPEED = 1.08
GAP = 0.12  # silence entre deux phrases d'une même réplique

# Noms d'équipes à l'oral (comme les commentateurs américains : la ville, sauf les deux équipes de L.A.).
SPOKEN = {
    "ATL": "Atlanta", "BOS": "Boston", "BKN": "Brooklyn", "CHA": "Charlotte", "CHI": "Chicago",
    "CLE": "Cleveland", "DAL": "Dallas", "DEN": "Denver", "DET": "Detroit", "GS": "Golden State",
    "HOU": "Houston", "IND": "Indiana", "LAC": "the Clippers", "LAL": "the Lakers", "MEM": "Memphis",
    "MIA": "Miami", "MIL": "Milwaukee", "MIN": "Minnesota", "NO": "New Orleans", "NY": "New York",
    "OKC": "OKC", "ORL": "Orlando", "PHI": "Philly", "PHX": "Phoenix", "POR": "Portland",
    "SAC": "Sacramento", "SA": "San Antonio", "TOR": "Toronto", "UTAH": "Utah", "WSH": "Washington",
}
BRAND = "Basket log"  # « Basketlog » prononcé en deux mots, comme il faut


def spoken(abbr):
    return SPOKEN.get(abbr, abbr)


def plural(abbr):
    return spoken(abbr).startswith("the ")


def agree(abbr, sing, plur):
    """Accord du verbe : « Houston is », mais « the Lakers are »."""
    return plur if plural(abbr) else sing


def an(n):
    """Article devant un nombre dit à voix haute : « a 63 percent », mais « an 85 percent », « an 11 »."""
    n = int(n)
    return "an" if n in (8, 11, 18) or 80 <= n <= 89 or 800 <= n <= 899 else "a"


def cap(s):
    return s[:1].upper() + s[1:]


_tts = None


def _engine():
    global _tts
    if _tts is None:
        import sherpa_onnx
        d = VOICE
        cfg = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                vits=sherpa_onnx.OfflineTtsVitsModelConfig(model=f"{d}/{MODEL}.onnx", lexicon="", tokens=f"{d}/tokens.txt", data_dir=f"{d}/espeak-ng-data",
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
