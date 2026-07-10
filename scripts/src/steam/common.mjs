export const STATUS = ["Offline", "Online", "Busy", "Away", "Snooze" ];

// Cache centralizado que guarda os dados processados por SteamID
const profileCache = new Map();


async function ensureProfileData(steamid, api_key) {
    if (profileCache.has(steamid)) return profileCache.get(steamid);

    console.log(`[Steam API] Loading data for user ID: ${steamid}...`);

    const games = await steamGet(
        "IPlayerService/GetOwnedGames/v1/",
        {
            steamid,
            include_appinfo: true,
            include_played_free_games: true,
        },
        api_key
    ).then(res => res.response?.games ?? []);

    const allUnlockedAchievements = [];

    const gamesWithAchievements = await Promise.all(
        games.map(async (game) => {
            const res = await steamGet(
                "ISteamUserStats/GetPlayerAchievements/v1/",
                { steamid, appid: game.appid },
                api_key
            ).catch(() => null); // Trata jogos sem conquistas

            const achievementsArray = res?.playerstats?.achievements ?? [];
            const unlocked = achievementsArray.filter(a => a.achieved === 1);
            
            // Alimenta a lista global de conquistas recentes
            unlocked.forEach(ach => {
                allUnlockedAchievements.push({
                    appid: game.appid,
                    game_name: game.name,
                    apiname: ach.apiname,
                    unlocktime: ach.unlocktime,
                });
            });

            return {
                ...game,
                playtime_forever_hours: formatPlaytime(game.playtime_forever),
                total_achievements: achievementsArray.length,
                unlocked_achievements: unlocked.length
            };
        })
    );

    const recentAchievements = allUnlockedAchievements.sort((a, b) => b.unlocktime - a.unlocktime);

    const processedData = {
        games: gamesWithAchievements,
        recentAchievements: recentAchievements
    };

    profileCache.set(steamid, processedData);

    return processedData;
}


export async function getOwnedGames(steamid, api_key) {
    const data = await ensureProfileData(steamid, api_key);
    return data.games;
}
export async function getRecentAchievements(steamid, api_key) {
    const data = await ensureProfileData(steamid, api_key);
    return data.recentAchievements;
}

export async function steamGet(endpoint, params, api_key) {
    const url = new URL(`https://api.steampowered.com/${endpoint}`);
    url.searchParams.set("key", api_key);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch(url);
        if ([500, 502, 503, 504].includes(res.status)) {
            await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
            continue;
        }
        return res.json();
    }
    throw new Error(`Failed to fetch ${endpoint} after 5 attempts`);
}


function formatPlaytime(totalMinutes) {
    const minutes = totalMinutes ?? 0;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const readable = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return { hours, mins, time: readable };
}

export function validateAuth() {
    const steam_user_id = process.env["STEAM_USER_ID"];
    const steam_api_key = process.env["STEAM_API_KEY"];
    let errors = [];

    if (!steam_user_id) errors.push("No STEAM_USER_ID environment variable found");
    if (!steam_api_key) errors.push("No STEAM_API_KEY environment variable found");
    if (errors.length > 0) throw new Error(errors.join("\n"));
    
    return [steam_user_id, steam_api_key];
}

export function getConsumptionMode() {
    return process.env["PROCESS_CONSUPTION"] || 'MEDIUM';
}