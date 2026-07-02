import os
import requests
from pathlib import Path

AUTH_ENV_VAR = os.environ["LAST_FM_AUTH"].split(",")
if len(AUTH_ENV_VAR) != 2: raise RuntimeError("Invalid LAST_FM_AUTH env var! format must be \"{username},{API_KEY}\"")

USER = AUTH_ENV_VAR[0].strip()
API_KEY = AUTH_ENV_VAR[1].strip()

README_FILE = Path("README.md")

response = requests.get(
    "https://ws.audioscrobbler.com/2.0/",
    params={
        "method": "user.gettoptracks",
        "user": USER,
        "api_key": API_KEY,
        "format": "json",
        "limit": 5,
    },
    timeout=30,
)

data = response.json()
if "error" in data: raise RuntimeError(f"Last.fm error {data['error']}: {data['message']}")

tracks = data["toptracks"]["track"]

content = [
    "| # | Cover | Track | Artist | Duration | Times listened |",
    "|--:|:-----:|-------|--------|----------|----------------|",
]

for i, track in enumerate(tracks, start=1):
    artist = track["artist"]
    name = track["name"]

    now_playing = track.get("@attr", {}).get("nowplaying") == "true"

    # URL da música
    url = track.get("url", "")

    # Cover (Last.fm image array)
    image = track.get("image", [])
    cover = (image[1]["#text"])

    duration_sec = int(track["duration"])
    duration = "-"
    
    if duration_sec > 0: duration = f"{duration_sec // 60}:{duration_sec % 60:02d}"
    else: duration = "—"

    listened_times = track["playcount"]

    cover_md = f"![x]({cover})" if cover else ""
    music_md = f"[{name}]({url})"
    artist_md = f"[{artist["name"]}]({artist["url"]})"

    content.append(
        f"| {i} | {cover_md} | {music_md} | {artist_md} | {duration} | {listened_times} |"
    )

music_section = "\n".join(content)

readme = README_FILE.read_text(encoding="utf-8")

start = "<!--START_SECTION:lastfm-->"
end = "<!--END_SECTION:lastfm-->"

before = readme.split(start)[0]
after = readme.split(end)[1]

updated = (
    before
    + start
    + "\n"
    + music_section
    + "\n"
    + end
    + after
)

README_FILE.write_text(updated, encoding="utf-8")

print("README atualizado.")