# Vidéos TikTok / Reels du jour

Fabrique plusieurs vidéos verticales (1080x1920, 30 i/s) à partir des matchs NBA du jour, avec les vrais chiffres
de Basketlog. Rien n'est publié automatiquement : les vidéos sont remises à Tim, qui les relit et les poste.

## Formats

| Format | Match choisi | Durée |
| --- | --- | --- |
| `choc` | le match le plus attendu (équipes suivies en France, écart serré, bons bilans) | ~30 s |
| `favori` | le plus gros favori du modèle, puis « mais attention » sur l'outsider | ~28 s |
| `serre` | le match le plus serré | ~22 s |
| `programme` | tous les matchs de la nuit et leurs favoris | ~19 s |

Chaque vidéo existe en deux versions : avec voix off (voix française de synthèse) et sans voix (musique seule,
pour mettre sa propre voix ou la synthèse vocale de TikTok). Musique et bruitages sont générés : aucun son sous droits.
Pas de logos NBA : sigles des équipes. Le texte parle du « modèle Basketlog », jamais d'« IA ».
Le téléphone montre la fiche match telle qu'un visiteur la voit : partie gratuite, puis l'analyse verrouillée.

## Lancer

```bash
bash video/setup.sh                                  # une fois : modules Python, voix, polices
curl -s "https://basketlog-app.com/api/videos?d=AAAAMMJJ" > jour.json
python3 video/make.py --day jour.json --out video/out
```

Options : `--formats choc,favori` pour n'en faire que certains, `--exclude ID` pour qu'un match déjà traité ne soit
pas repris en « choc », `--check` pour quelques images fixes par vidéo (avec les zones masquées par TikTok en rose).

Sortie : `video/out/AAAA-MM-JJ/` avec les MP4, `legendes.txt` (texte de publication proposé) et `videos.json`.

## Chaque jour

Le workflow GitHub « Vidéos du jour » (`.github/workflows/videos.yml`) part chaque matin à 6 h 20 à Paris (hiver
comme été ; GitHub le lance souvent avec 30 à 60 minutes de retard) : il lit `/api/videos` du jour, fabrique les vidéos
des matchs de la nuit à venir et les dépose dans la release `videos-AAAA-MM-JJ`, que Tim reçoit vers 8 h. Un passage de
secours à 7 h 05 ne fait rien si le jour est déjà traité. La release `videos-etat` dit où en est le jour (« N matchs,
vidéos prêtes » ou « pas de match NBA ce soir »). On peut relancer pour une date précise depuis l'onglet Actions
(« Run workflow »). Les absences annoncées après la fabrication ne sont pas dans les vidéos : vérifier la fiche du
match avant de publier.
Après une modification du dossier `video/`, le workflow refait les vidéos pour test (gardées 3 jours dans Actions)
sans toucher à la release du jour.

Voix : les lignes sont vérifiées par reconnaissance vocale (Whisper) ; la musique baisse de 15 dB et les bruitages
de 6 dB pendant la voix. Un nom d'équipe mal prononcé se corrige dans `SPOKEN` (`voice.py`).

## Fichiers

- `make.py` : choix des matchs, textes, minutage, rendu image par image (Chromium), assemblage.
- `voice.py` : voix off (Piper « tom » via sherpa-onnx), nombres en lettres, noms d'équipes écrits pour être bien prononcés.
- `sound.py` : musique, bruitages et mixage (-14 LUFS).
- `engine/` : la scène animée (`stage.html`) et les écrans du téléphone construits avec le CSS du site.
- `sample/` : données d'exemple (31 octobre 2026).
