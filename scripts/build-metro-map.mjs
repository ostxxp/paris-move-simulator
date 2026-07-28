import { mkdir, writeFile } from "node:fs/promises";

const LINES_URL = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/schema_trace_fermetrotram-gf/exports/geojson?lang=fr&timezone=Europe%2FParis";
const STATIONS_URL = "https://data.iledefrance-mobilites.fr/api/explore/v2.1/catalog/datasets/schema_gares-gf/exports/geojson?lang=fr&timezone=Europe%2FParis";

const colors = {
  "1": "#ffcd00", "2": "#0064b0", "3": "#9f9825", "3B": "#6ec4e8",
  "4": "#be418d", "5": "#f28e42", "6": "#77c695", "7": "#f3a4ba",
  "7B": "#77c695", "8": "#ceadd2", "9": "#b6bd00", "10": "#c9910d",
  "11": "#704b1c", "12": "#007852", "13": "#6ec4e8", "14": "#662483",
};

const width = 1400;
const height = 900;
const padding = 70;

function flattenCoordinates(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") return [geometry.coordinates];
  if (geometry.type === "MultiLineString") return geometry.coordinates;
  return [];
}

function perpendicularDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplify(points, tolerance = 1.25) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let splitIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistance(points[index], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      splitIndex = index;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, splitIndex + 1), tolerance).slice(0, -1), ...simplify(points.slice(splitIndex), tolerance)];
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "-")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

const [lineResponse, stationResponse] = await Promise.all([fetch(LINES_URL), fetch(STATIONS_URL)]);
if (!lineResponse.ok || !stationResponse.ok) throw new Error("IDFM data download failed");
const [lineData, stationData] = await Promise.all([lineResponse.json(), stationResponse.json()]);

const metroFeatures = lineData.features.filter((feature) => feature.properties?.mode === "METRO" && feature.geometry);
const rawSegments = metroFeatures.flatMap((feature) => flattenCoordinates(feature.geometry));
const allPoints = rawSegments.flat();
const minX = Math.min(...allPoints.map((point) => point[0]));
const maxX = Math.max(...allPoints.map((point) => point[0]));
const minY = Math.min(...allPoints.map((point) => point[1]));
const maxY = Math.max(...allPoints.map((point) => point[1]));
const project = ([x, y]) => [
  Math.round((padding + ((x - minX) / (maxX - minX)) * (width - padding * 2)) * 10) / 10,
  Math.round((height - padding - ((y - minY) / (maxY - minY)) * (height - padding * 2)) * 10) / 10,
];

const groupedLines = new Map();
for (const feature of metroFeatures) {
  const id = String(feature.properties.extcode).split(":").at(-1)?.toUpperCase();
  if (!id || !colors[id]) continue;
  const entry = groupedLines.get(id) ?? { id, color: colors[id], segments: [] };
  for (const segment of flattenCoordinates(feature.geometry)) {
    const projected = simplify(segment.map(project));
    if (projected.length > 1) entry.segments.push(projected);
  }
  groupedLines.set(id, entry);
}

const groupedStations = new Map();
for (const feature of stationData.features) {
  const properties = feature.properties;
  if (properties?.mode !== "METRO" || !feature.geometry?.coordinates) continue;
  const name = properties.nom_iv || properties.nom_gare;
  const key = normalizeName(name);
  const station = groupedStations.get(key) ?? { name, key, points: [], lines: [] };
  station.points.push(project(feature.geometry.coordinates));
  const lineId = String(properties.indice_lig || "").toUpperCase();
  if (lineId && !station.lines.includes(lineId)) station.lines.push(lineId);
  groupedStations.set(key, station);
}

const stations = [...groupedStations.values()].map((station) => ({
  name: station.name,
  key: station.key,
  x: Math.round(station.points.reduce((sum, point) => sum + point[0], 0) / station.points.length * 10) / 10,
  y: Math.round(station.points.reduce((sum, point) => sum + point[1], 0) / station.points.length * 10) / 10,
  lines: station.lines.sort((a, b) => Number.parseInt(a) - Number.parseInt(b)),
}));

const output = {
  source: "Ile-de-France Mobilites Open Data",
  license: "Licence Ouverte 2.0 (Etalab)",
  generatedAt: new Date().toISOString().slice(0, 10),
  width,
  height,
  lines: [...groupedLines.values()].sort((a, b) => Number.parseInt(a.id) - Number.parseInt(b.id)),
  stations,
};

await mkdir(new URL("../app/game/", import.meta.url), { recursive: true });
await writeFile(new URL("../app/game/paris-metro-schematic.json", import.meta.url), `${JSON.stringify(output)}\n`);
console.log(`Wrote ${output.lines.length} metro lines and ${output.stations.length} stations.`);
