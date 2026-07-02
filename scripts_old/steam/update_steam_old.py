import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pathlib import Path

AUTH_ENV_VAR = os.environ["STEAM_AUTH"].split(",")
if len(AUTH_ENV_VAR) != 2: raise RuntimeError("Invalid STEAM_AUTH env var! format must be \"{user_id},{API_KEY}\"")

STEAM_ID = AUTH_ENV_VAR[0].strip()
API_KEY = AUTH_ENV_VAR[1].strip()

README = Path("README.md")

retries = Retry(
    total=5,
    backoff_factor=1,
    status_forcelist=[500, 502, 503, 504],
)

headers = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
}

session = requests.Session()
session.mount("https://", HTTPAdapter(max_retries=retries))


# 1. Profile
# -------------------------
profile = session.get(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/",
    params={"key": API_KEY, "steamids": STEAM_ID},
    headers=headers, timeout=15
).json()["response"]["players"][0]

name = profile.get("personaname", "Unknown")
status = profile.get("personastate", 0)
game_now = profile.get("gameextrainfo", None)

status_map = {
    0: "Offline",
    1: "Online",
    2: "Busy",
    3: "Away",
    4: "Snooze",
}

status_text = status_map.get(status, "Unknown")


# 2. Recent games
# -------------------------
recent = session.get(
    "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/",
    params={"key": API_KEY, "steamid": STEAM_ID, "count": 5},
    headers=headers, timeout=15
).json().get("response", {}).get("games", [])


# 3. Owned games
# -------------------------
owned = requests.get(
    "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
    params={
        "key": API_KEY,
        "steamid": STEAM_ID,
        "include_appinfo": True,
        "include_played_free_games": True,
    },
).json().get("response", {}).get("games", [])


perfect_games = []

for game in owned:
    appid = game["appid"]
    name_game = game.get("name", "Unknown")

    try:
        ach = requests.get(
            "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/",
            params={
                "key": API_KEY,
                "steamid": STEAM_ID,
                "appid": appid,
            },
            timeout=10,
        ).json()

        if not ach.get("playerstats", {}).get("success"):
            continue

        stats = ach["playerstats"]

        achieved = stats.get("achievements", [])
        if not achieved:
            continue

        total = len(achieved)
        unlocked = sum(1 for a in achieved if a.get("achieved") == 1)

        if total > 0 and unlocked == total:
            perfect_games.append(name_game)

    except:
        continue


# -------------------------
# 4. README
# -------------------------
content = [
    "## 🎮 Steam Profile",
    "",
    f"**Name:** {name}",
    f"**Status:** {status_text}",
]

if game_now:
    content.append(f"**Playing now:** {game_now}")

content += [
    "",
    "## 🕹️ Recent Games",
]

for g in recent:
    content.append(f"- {g.get('name')} ({g.get('playtime_2weeks', 0)} min)")

content += [
    "",
    "## 🏆 100% Achievements",
]

if perfect_games:
    for g in perfect_games:
        content.append(f"- {g}")
else:
    content.append("- None (or you're sane)")

readme_text = "\n".join(content)

readme = README.read_text(encoding="utf-8")

start = "<!--START_SECTION:steam-->"
end = "<!--END_SECTION:steam-->"

if start not in readme or end not in readme:
    raise RuntimeError("Missing STEAM markers in README")

before = readme.split(start)[0]
after = readme.split(end)[1]

updated = before + start + "\n" + readme_text + "\n" + end + after

README.write_text(updated, encoding="utf-8")

print("Steam README atualizado")
