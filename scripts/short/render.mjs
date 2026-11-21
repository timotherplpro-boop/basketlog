// Short quotidien « les matchs de ce soir » (21/11/2026) : dessine short.html image par image avec Chrome (sans
// interface), ajoute le fond musical de beat.py et encode le MP4 vertical (1080 × 1920, 30 images/s, moins de 3,8 Mo
// pour l'envoi par le navigateur). Données : réponse JSON de https://basketlog-app.com/api/short.
// Usage : node render.mjs <data.json> <en|fr> <sortie.mp4>
import { readFile, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const [dataPath, lang = "en", out = "short.mp4"] = process.argv.slice(2);
if (!dataPath) { console.error("Usage : node render.mjs <data.json> <en|fr> <sortie.mp4>"); process.exit(1); }
const data = JSON.parse(await readFile(dataPath, "utf8"));
if (!data.games?.length) { console.error("Aucun match à venir dans les données : pas de vidéo."); process.exit(2); }

const FPS = 30;
const work = path.join(path.dirname(path.resolve(out)), `frames-${lang}`);
await rm(work, { recursive: true, force: true });
await mkdir(work, { recursive: true });

const chrome = process.env.CHROME || "/usr/bin/google-chrome";
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox", "--force-color-profile=srgb", "--font-render-hinting=none", "--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "short.html")).href, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate((d, l) => window.setup(d, l), data, lang);
const frames = Math.ceil(duration * FPS);
console.log(`${data.games.length} matchs, ${duration.toFixed(1)} s, ${frames} images (${lang})`);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.render(t), i / FPS);
  await page.screenshot({ path: path.join(work, `${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
}
await browser.close();

const wav = path.join(work, "beat.wav");
execFileSync("python3", [path.join(here, "beat.py"), String(duration), wav], { stdio: "inherit" });
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(work, "%05d.jpg"), "-i", wav,
  "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-b:v", "1000k", "-maxrate", "1200k", "-bufsize", "2400k",
  "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", out,
], { stdio: "inherit" });
await rm(work, { recursive: true, force: true });
console.log(`OK ${out}`);
