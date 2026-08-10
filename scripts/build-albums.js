#!/usr/bin/env node
/**
 * Albümler/fotoğraflar klasörünü tarar ve Albümler/albums.json manifestini üretir.
 * Çalıştırma: node scripts/build-albums.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ALBUMS_DIR = path.join(ROOT, "Albümler", "fotoğraflar");
const OUT_FILE = path.join(ROOT, "Albümler", "albums.json");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".avif"]);

function slugify(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleize(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function walk(dir, base = dir) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...walk(full, base));
    } else if (entry.isFile() && IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) {
      entries.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return entries.sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
}

const albums = [];

if (!fs.existsSync(ALBUMS_DIR)) {
  console.warn(`Uyarı: ${ALBUMS_DIR} klasörü bulunamadı, boş manifest yazılıyor.`);
  const empty = {
    generatedAt: new Date().toISOString(),
    albumFolder: "fotoğraflar",
    albums: [],
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(empty, null, 2) + "\n", "utf8");
  console.log(`OK: ${OUT_FILE} yazıldı (0 albüm).`);
  process.exit(0);
}
for (const dir of fs.readdirSync(ALBUMS_DIR, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const folder = path.join(ALBUMS_DIR, dir.name);
  const photos = walk(folder).map((p) => `fotoğraflar/${dir.name}/${p}`);
  if (photos.length === 0) continue;
  albums.push({
    id: slugify(dir.name),
    title: titleize(dir.name),
    path: `fotoğraflar/${dir.name}`,
    cover: photos[0],
    photoCount: photos.length,
    photos,
  });
}

albums.sort((a, b) => a.title.localeCompare(b.title, "tr"));

const manifest = {
  generatedAt: new Date().toISOString(),
  albumFolder: "fotoğraflar",
  albums,
};

fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`OK: ${albums.length} albüm bulundu, ${OUT_FILE} yazıldı.`);
