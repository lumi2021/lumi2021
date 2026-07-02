import fs from "fs";
import path from "path";

const AUTH_ENV_VAR = process.env.LAST_FM_AUTH?.split(",");

if (!AUTH_ENV_VAR || AUTH_ENV_VAR.length !== 2) {
  throw new Error(
    'Invalid LAST_FM_AUTH env var! format must be "{username},{API_KEY}"'
  );
}

const USER = AUTH_ENV_VAR[0].trim();
const API_KEY = AUTH_ENV_VAR[1].trim();

const README_FILE = path.resolve("README.md");

// ----------------------
// Fetch Last.fm top tracks
// ----------------------

const url = new URL("https://ws.audioscrobbler.com/2.0/");
url.searchParams.set("method", "user.gettoptracks");
url.searchParams.set("user", USER);
url.searchParams.set("api_key", API_KEY);
url.searchParams.set("format", "json");
url.searchParams.set("limit", "5");

const response = await fetch(url);
const data = await response.json();

if (data.error) {
  throw new Error(`Last.fm error ${data.error}: ${data.message}`);
}

const tracks = data.toptracks.track;

// ----------------------
// Build markdown table
// ----------------------

const content = [
  "| # | Cover | Track | Artist | Duration | Times listened |",
  "|--:|:-----:|-------|--------|----------|----------------|",
];

for (let i = 0; i < tracks.length; i++) {
  const track = tracks[i];

  const name = track.name;
  const url = track.url;

  const artistName = track.artist?.name ?? "Unknown";
  const artistUrl = track.artist?.url ?? "#";

  const image = track.image ?? [];
  const cover = image[1]?.["#text"] || "";

  const durationSec = parseInt(track.duration || "0", 10);
  const duration =
    durationSec > 0
      ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`
      : "—";

  const playcount = track.playcount ?? "0";

  const coverMd = cover ? `![cover](${cover})` : "";
  const musicMd = `[${name}](${url})`;
  const artistMd = `[${artistName}](${artistUrl})`;

  content.push(
    `| ${i + 1} | ${coverMd} | ${musicMd} | ${artistMd} | ${duration} | ${playcount} |`
  );
}

const musicSection = content.join("\n");

// ----------------------
// Inject into README
// ----------------------

const readme = fs.readFileSync(README_FILE, "utf-8");

const start = "<!--START_SECTION:lastfm-->";
const end = "<!--END_SECTION:lastfm-->";

if (!readme.includes(start) || !readme.includes(end)) {
  throw new Error("Missing Last.fm markers in README");
}

const before = readme.split(start)[0];
const after = readme.split(end)[1];

const updated =
  before + start + "\n" + musicSection + "\n" + end + after;

fs.writeFileSync(README_FILE, updated);

console.log("README atualizado.");