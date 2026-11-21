#!/usr/bin/env python3
"""Fond musical du Short quotidien (21/11/2026) : petit beat synthétisé ici même (aucun son d'autrui, aucun droit à
gérer). 96 BPM, grosse caisse, claquement, charleston, basse et nappe (la mineur – fa – do – sol).
Usage : python3 beat.py <durée en secondes> <sortie.wav>"""
import sys, wave
import numpy as np

SR = 44100
BPM = 96
BEAT = 60 / BPM


def env(n, attack=0.005, release=0.2):
    t = np.arange(n) / SR
    a = np.minimum(1, t / max(attack, 1e-4))
    r = np.exp(-t / max(release, 1e-4))
    return a * r


def kick(n=int(SR * 0.45)):
    t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(n, 0.002, 0.16) * 1.0


def clap(rng, n=int(SR * 0.25)):
    noise = rng.standard_normal(n)
    # bruit filtré grossièrement (différence) pour un son plus sec
    noise = np.diff(noise, prepend=0)
    return noise * env(n, 0.002, 0.06) * 0.35


def hat(rng, n=int(SR * 0.06)):
    noise = np.diff(np.diff(rng.standard_normal(n), prepend=0), prepend=0)
    return noise * env(n, 0.001, 0.015) * 0.10


def tone(freq, n, kind="sine"):
    t = np.arange(n) / SR
    if kind == "saw":
        x = 2 * ((t * freq) % 1) - 1
        # adoucir : moyenne glissante
        k = 24
        return np.convolve(x, np.ones(k) / k, mode="same")
    return np.sin(2 * np.pi * freq * t)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


CHORDS = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]  # Am, F, C/G, G


def main():
    dur = float(sys.argv[1]) if len(sys.argv) > 1 else 20.0
    out = sys.argv[2] if len(sys.argv) > 2 else "beat.wav"
    rng = np.random.default_rng(7)
    n = int(SR * (dur + 1))
    mix = np.zeros(n)

    def add(sig, at, gain=1.0):
        i = int(at * SR)
        if i >= n:
            return
        j = min(n, i + len(sig))
        mix[i:j] += sig[: j - i] * gain

    bar = 4 * BEAT
    nbars = int(dur / bar) + 2
    for b in range(nbars):
        t0 = b * bar
        root, notes = CHORDS[b % 4]
        # nappe : accord tenu toute la mesure, attaque lente
        pn = int(bar * SR)
        pad = sum(tone(midi(m), pn, "saw") for m in notes) / len(notes)
        pad *= np.minimum(1, np.arange(pn) / (SR * 0.4)) * np.exp(-np.arange(pn) / (SR * 3.5))
        add(pad, t0, 0.10)
        # basse : fondamentale sur les temps 1 et 3 (+ croche avant le 3)
        for beat_i, length in ((0, 1.6), (1.5, 0.4), (2, 1.8)):
            bn = int(length * BEAT * SR)
            bass = tone(midi(root - 12), bn) * env(bn, 0.01, 0.5)
            add(bass, t0 + beat_i * BEAT, 0.28)
        # batterie
        for beat_i in range(4):
            tb = t0 + beat_i * BEAT
            if beat_i in (0, 2):
                add(kick(), tb, 0.55)
            if beat_i == 2 and b % 2 == 1:
                add(kick(), tb + BEAT * 0.75, 0.35)
            if beat_i in (1, 3):
                add(clap(rng), tb, 1.0)
            for h in (0, 0.5):
                add(hat(rng), tb + h * BEAT, 1.0 if h == 0 else 0.6)

    mix = mix[: int(SR * dur)]
    # fondu d'entrée et de sortie, normalisation douce
    fade_in, fade_out = int(SR * 0.3), int(SR * 1.2)
    mix[:fade_in] *= np.linspace(0, 1, fade_in)
    mix[-fade_out:] *= np.linspace(1, 0, fade_out)
    mix = np.tanh(mix * 1.2)
    mix *= 0.5 / max(1e-6, np.max(np.abs(mix)))
    pcm = (np.stack([mix, mix], axis=1) * 32767).astype(np.int16)
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
