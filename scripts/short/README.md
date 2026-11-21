# Short quotidien « les matchs de ce soir »

Vidéo verticale de 14 à 20 s (1080 × 1920, 30 images/s, environ 1,5 Mo) : titre avec le plus gros favori, les matchs NBA
du soir avec la probabilité de victoire de chaque équipe, puis « Every game, free / basketlog-app.com » et la ligne de
l'offre Pro. Musique synthétisée par `beat.py` (aucun son d'autrui). Créé le 21/11/2026 à la demande de Tim.

1. Données : `GET https://basketlog-app.com/api/short` (JSON public : matchs NBA pas encore commencés, `pHome`, couleurs,
   bilan de la nuit `lastNight`, affiché seulement si au moins 70 % des favoris ont gagné).
2. Rendu : `npm install` ici, puis `node render.mjs data.json en short_en.mp4` (et `fr`). Il faut Google Chrome
   (`/usr/bin/google-chrome`, ou variable `CHROME`), `ffmpeg` et `python3` avec numpy.
3. Publication : YouTube Shorts sur https://www.youtube.com/@basketlog (titre, description, « pas pour les enfants »,
   « l'IA n'a pas été utilisée » : graphiques dessinés par le code à partir des données, aucune image générée).

Règles de texte : pas de vocabulaire de paris, jamais « IA » ni « AI » dans le titre ou la description, liens en
anglais vers basketlog-app.com/en.
