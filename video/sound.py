"""Musique et bruitages générés (aucun son sous droits) et mixage avec la voix off, normalisé pour TikTok (-14 LUFS)."""
import subprocess
import numpy as np
import soundfile as sf
from scipy import signal

SR = 44100


def _tt(n):
    return np.arange(n) / SR


class Mixer:
    def __init__(self, dur, seed=11):
        self.N = int(SR * dur)
        self.dur = dur
        self.rng = np.random.default_rng(seed)
        self.seed = seed
        n = int(1.6 * SR)
        t = _tt(n)
        x = self.rng.standard_normal(n) * np.exp(-t * 3.2)
        x = self.lp(x, 6000)
        self.IR = x / np.sqrt(np.sum(x ** 2))

    # filtres
    def bp(self, x, lo, hi, o=2):
        b, a = signal.butter(o, [lo / (SR / 2), hi / (SR / 2)], "band"); return signal.lfilter(b, a, x)

    def hp(self, x, f, o=2):
        b, a = signal.butter(o, f / (SR / 2), "high"); return signal.lfilter(b, a, x)

    def lp(self, x, f, o=2):
        b, a = signal.butter(o, f / (SR / 2), "low"); return signal.lfilter(b, a, x)

    def verb(self, x, mix=0.25):
        w = signal.fftconvolve(x, self.IR)[:len(x)]; return (1 - mix) * x + mix * w * 2.0

    def place(self, buf, x, t0, g=1.0):
        i = int(round(t0 * SR))
        if i < 0:
            x = x[-i:]; i = 0
        if i >= len(buf):
            return
        j = min(len(buf), i + len(x)); buf[i:j] += g * x[:j - i]

    # batterie
    def kick(self):
        n = int(0.45 * SR); t = _tt(n); f = 46 + 115 * np.exp(-t * 32); ph = 2 * np.pi * np.cumsum(f) / SR
        body = np.sin(ph) * np.exp(-t * 6.5); click = self.hp(self.rng.standard_normal(n), 2500) * np.exp(-t * 260) * 0.3
        return np.tanh(1.7 * (body + click)) * 0.85

    def b808(self, freq, dur):
        n = int((dur + 0.2) * SR); t = _tt(n); f = freq * (1 + 0.8 * np.exp(-t * 45)); ph = 2 * np.pi * np.cumsum(f) / SR
        env = np.minimum(1, t / 0.004) * np.exp(-t * 1.4) * np.clip(1 - (t - dur) / 0.1, 0, 1)
        return np.tanh(2.6 * np.sin(ph) * env) / np.tanh(2.6)

    def clap(self):
        n = int(0.4 * SR); t = _tt(n); env = np.zeros(n)
        for d in (0, 0.011, 0.023):
            env = np.maximum(env, np.exp(-np.maximum(t - d, 0) * 170) * (t >= d))
        env = np.maximum(env, np.exp(-t * 20) * 0.3)
        return self.bp(self.rng.standard_normal(n), 900, 5500) * env * 0.85

    def hat(self, v=1.0, op=False):
        n = int((0.28 if op else 0.07) * SR); t = _tt(n)
        return v * self.hp(self.rng.standard_normal(n), 7500, 4) * np.exp(-t * (13 if op else 85)) * 0.45

    # synthés
    def pad(self, freqs, dur, cutoff=1100):
        n = int((dur + 0.7) * SR); t = _tt(n); x = np.zeros(n)
        for fr in freqs:
            for d in (-0.0065, 0, 0.006):
                x += 2 * ((t * fr * (1 + d)) % 1.0) - 1
        x = self.lp(x / (len(freqs) * 3), cutoff, 2)
        return x * np.minimum(1, t / 0.3) * np.clip(1 - (t - dur) / 0.7, 0, 1)

    def bell(self, freq, v=1.0):
        n = int(0.9 * SR); t = _tt(n)
        x = (np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * 2 * freq * t) + 0.12 * np.sin(2 * np.pi * 3.01 * freq * t)) * np.exp(-t * 5.5)
        return v * x * np.minimum(1, t / 0.003) * 0.5

    # bruitages
    def _sweep(self, x, f0, f1, q=0.7):
        n = len(x); fc = np.geomspace(f0, f1, n); y = np.zeros(n); low = band = 0.0; k = 1.0 / q
        fs = 2 * np.sin(np.pi * fc / SR)
        for i in range(n):
            f = fs[i]; high = x[i] - low - k * band; band += f * high; low += f * band; y[i] = band
        return y

    def whoosh(self, dur=0.5, f0=300, f1=3500):
        n = int(dur * SR); t = _tt(n); x = self._sweep(self.rng.standard_normal(n), f0, f1, 1.2)
        env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
        return x * env / (np.max(np.abs(x)) + 1e-9)

    def impact(self, big=True):
        n = int(1.8 * SR); t = _tt(n); f = 38 + 60 * np.exp(-t * 9); ph = 2 * np.pi * np.cumsum(f) / SR
        sub = np.sin(ph) * np.exp(-t * (2.2 if big else 4.5))
        nz = self.lp(self.rng.standard_normal(n), 2500) * np.exp(-t * 14) * 0.6
        x = self.verb(np.tanh(1.5 * (sub + nz)), 0.35)
        return x / (np.max(np.abs(x)) + 1e-9)

    def riser(self, dur):
        n = max(1, int(dur * SR)); t = _tt(n); x = self._sweep(self.rng.standard_normal(n), 250, 6000, 2.0)
        tone = np.sin(2 * np.pi * np.cumsum(np.geomspace(180, 900, n)) / SR) * 0.25
        return (x / (np.max(np.abs(x)) + 1e-9) + tone) * (t / dur) ** 2.2

    def pop(self, freq=700):
        n = int(0.12 * SR); t = _tt(n); f = freq * (1 + 0.6 * np.exp(-t * 60))
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 35)

    def key(self):
        n = int(0.05 * SR); t = _tt(n)
        return self.bp(self.rng.standard_normal(n), 1800 + self.rng.random() * 1500, 7000) * np.exp(-t * 160)

    def tick(self, freq=1500):
        n = int(0.08 * SR); t = _tt(n)
        return np.sin(2 * np.pi * freq * t) * np.exp(-t * 60) + self.hp(self.rng.standard_normal(n), 3000) * np.exp(-t * 400) * 0.3

    # musique
    PROGS = [
        [([220.0, 261.63, 329.63], 55.0), ([174.61, 220.0, 261.63], 43.65), ([174.61, 220.0, 293.66], 73.42), ([164.81, 207.65, 246.94], 41.2)],
        [([196.0, 233.08, 293.66], 49.0), ([155.56, 196.0, 233.08], 38.89), ([174.61, 220.0, 261.63], 43.65), ([174.61, 207.65, 261.63], 43.65)],
        [([246.94, 293.66, 369.99], 61.74), ([196.0, 246.94, 293.66], 49.0), ([220.0, 277.18, 329.63], 55.0), ([185.0, 220.0, 277.18], 46.25)],
    ]

    def music(self, mutes=(), stop=None, bells_until=0.0, bells_from=None):
        rng = np.random.default_rng(self.seed)
        prog = self.PROGS[self.seed % len(self.PROGS)]
        bpm = [140, 136, 144][self.seed % 3]
        step = 60 / bpm / 4; bar = 16 * step; start = 0.03
        N = self.N; drums = np.zeros(N); bass = np.zeros(N); padb = np.zeros(N); bells = np.zeros(N)
        stop = stop if stop is not None else self.dur
        muted = lambda t: any(a <= t < b for a, b in mutes) or t >= stop
        for bi in range(int(np.ceil((self.dur - start) / bar))):
            b0 = start + bi * bar; ch, root = prog[bi % 4]
            if b0 < stop:
                self.place(padb, self.pad(ch, bar, 1300 if bi % 2 else 1000), b0)
            kicks = [0, 10] if bi % 2 == 0 else [0, 7, 10]
            for s in range(16):
                t0 = b0 + s * step
                if t0 >= self.dur or muted(t0):
                    continue
                if s in kicks:
                    self.place(drums, self.kick(), t0)
                    nxt = [k for k in kicks if k > s]; L = ((nxt[0] if nxt else 16) - s) * step
                    self.place(bass, self.b808(root, max(0.18, L - 0.03)), t0)
                if s == 8:
                    self.place(drums, self.clap(), t0)
                if s % 2 == 0:
                    self.place(drums, self.hat(1.0 if s % 4 == 0 else 0.6), t0)
                if bi % 4 == 3 and s >= 12:
                    self.place(drums, self.hat(0.5), t0 + step / 2)
                if s == 14 and bi % 2 == 1:
                    self.place(drums, self.hat(0.7, True), t0)
            if b0 < bells_until or (bells_from is not None and bells_from <= b0 < stop):
                arp = [c * 2 for c in ch] + [ch[1] * 2]
                for s in range(0, 16, 2):
                    t0 = b0 + s * step
                    if t0 < stop:
                        self.place(bells, self.bell(arp[(s // 2) % 4], 0.8 if s % 4 == 0 else 0.55), t0)
        m = 0.95 * drums + 0.9 * bass + 0.55 * self.verb(padb, 0.3) + 0.16 * self.verb(bells, 0.35)
        m = self.hp(m, 30)
        t = _tt(N)
        return m * np.clip((self.dur - t) / 1.2, 0, 1)


def _lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(r.split("Integrated loudness:")[1].split("I:")[1].split("LUFS")[0])


def build(dur, voice, cues, music_opts, out_voice, out_novoice, tmpdir, seed=11):
    """voice : piste mono 44,1 kHz (longueur quelconque). cues : liste de (type, t, params). Écrit deux WAV normalisés."""
    mx = Mixer(dur, seed)
    N = mx.N
    vo = np.zeros(N)
    vo[:min(N, len(voice))] = voice[:N]
    raw = f"{tmpdir}/voice_raw.wav"; proc = f"{tmpdir}/voice.wav"
    sf.write(raw, vo.astype(np.float32), SR, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af",
                    "highpass=f=85,equalizer=f=220:t=q:w=1:g=-2,equalizer=f=3300:t=q:w=1.2:g=3,acompressor=threshold=0.1:ratio=3.5:attack=6:release=120:makeup=2.2,alimiter=limit=0.92:level=false",
                    "-ar", str(SR), "-c:a", "pcm_f32le", proc], check=True)
    vo, _ = sf.read(proc, dtype="float64")
    vo = vo[:N] if len(vo) >= N else np.pad(vo, (0, N - len(vo)))

    music = mx.music(**music_opts)
    sfx = np.zeros(N)
    for kind, t, p in cues:
        g = p.get("g", 1.0)
        if kind == "impact":
            mx.place(sfx, mx.impact(p.get("big", True)), t, g)
        elif kind == "whoosh":
            mx.place(sfx, mx.whoosh(p.get("d", 0.5), p.get("f0", 300), p.get("f1", 4000)), t, g)
        elif kind == "riser":
            mx.place(sfx, mx.riser(p.get("d", 1.0)), t, g)
        elif kind == "pop":
            mx.place(sfx, mx.pop(p.get("f", 700)), t, g)
        elif kind == "key":
            mx.place(sfx, mx.key(), t, g)
        elif kind == "tick":
            mx.place(sfx, mx.tick(p.get("f", 1500)), t, g)

    sf.write(f"{tmpdir}/_v.wav", vo.astype(np.float32), SR, subtype="FLOAT")
    sf.write(f"{tmpdir}/_m.wav", music.astype(np.float32), SR, subtype="FLOAT")
    Lv, Lm = _lufs(f"{tmpdir}/_v.wav"), _lufs(f"{tmpdir}/_m.wav")
    gm = 10 ** ((Lv - 5.5 - Lm) / 20)
    gs = 0.55 * np.max(np.abs(vo)) / (np.max(np.abs(sfx)) + 1e-9)
    # la musique baisse de 9 dB pendant la voix
    env = np.convolve(np.abs(vo), np.ones(int(0.03 * SR)) / int(0.03 * SR), "same")
    on = (env > 0.02 * env.max()).astype(float)
    att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.32 * SR))
    g = np.zeros(N); s = 0.0
    for i in range(N):
        c = on[i]; s = (att * s + (1 - att) * c) if c > s else (rel * s + (1 - rel) * c); g[i] = s
    duck = 1 - (1 - 10 ** (-9 / 20)) * g
    for x, out in ((vo + gm * music * duck + gs * sfx, out_voice), (gm * music * 1.25 + gs * sfx, out_novoice)):
        pre = out.replace(".wav", "_pre.wav")
        sf.write(pre, np.stack([x, x], 1).astype(np.float32), SR, subtype="FLOAT")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", pre, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), out], check=True)
