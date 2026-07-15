export const STATUS = ["Offline", "Online", "Busy", "Away", "Snooze" ];

const profileCache = new Map();

async function ensureProfileData(steamid, api_key) {
    if (profileCache.has(steamid)) return profileCache.get(steamid);

    console.log(`[Steam Service] Loading data for user ID: ${steamid}...`);

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
        const resStats = await steamGet(
            "ISteamUserStats/GetPlayerAchievements/v1/",
            { steamid, appid: game.appid },
            api_key
        ).catch(() => null);

        const resSchema = await steamGet(
            "ISteamUserStats/GetSchemaForGame/v2/",
            { appid: game.appid },
            api_key
        ).catch(() => null);

        const achievementsArray = resStats?.playerstats?.achievements ?? [];
        const schemaAchievements = resSchema?.game?.availableGameStats?.achievements ?? [];

        const schemaMap = new Map(schemaAchievements.map(a => [a.name, a]));

        const fullAchievements = achievementsArray.map(ach => {
            const schema = schemaMap.get(ach.apiname);
            return {
                apiname: ach.apiname,
                achieved: ach.achieved,
                unlocktime: ach.unlocktime,
                icon: schema?.icon ?? null,
                icon_gray: schema?.icongray ?? null
            };
        });

        const unlocked = fullAchievements
            .filter(a => a.achieved === 1)
            .sort((a, b) => b.unlocktime - a.unlocktime);
        
        unlocked.forEach(ach => {
            allUnlockedAchievements.push({
                appid: game.appid,
                game_name: game.name,
                apiname: ach.apiname,
                unlocktime: ach.unlocktime,
                icon: ach.icon
            });
        });

        const playtimeFormatted = formatPlaytime(game.playtime_forever);
        const media_base_url = `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${game.appid}`;

        return {
            appid: game.appid,
            name: game.name,

            playtime: playtimeFormatted,
            unlocked_achievements: unlocked,
            all_achievements: fullAchievements,

            last_played_timestamp: game.rtime_last_played,

            images: {
                header:  `${media_base_url}/header.jpg`,
                capsule: `${media_base_url}/capsule_231x87.jpg`,
                hero:    `${media_base_url}/library_hero.jpg`,
                cover:   `${media_base_url}/library_600x900.jpg`,
                logo:    `${media_base_url}/logo.png`,
            },
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
    const readable = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;

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
