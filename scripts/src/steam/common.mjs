export const STATUS = ["Offline", "Online", "Busy", "Away", "Snooze" ];

let ownedGamesPromise = null;
const achievementsCache = new Map();

export function getOwnedGames(steamid, api_key) {
    if (!ownedGamesPromise) {
        console.log("Loading steam's owned games...");
        ownedGamesPromise = steamGet(
            "IPlayerService/GetOwnedGames/v1/",
            {
                steamid,
                include_appinfo: true,
                include_played_free_games: true,
            },
            api_key
        ).then(res => res.response?.games ?? []);
    }
    return ownedGamesPromise;
}
export function getAchievements(appid, steamid, api_key) {
    if (!achievementsCache.has(appid)) {
        const promise = steamGet(
            "ISteamUserStats/GetPlayerAchievements/v1/",
            { steamid, appid },
            api_key
        ).catch(() => null);
        achievementsCache.set(appid, promise);
    }
    return achievementsCache.get(appid);
}

export function formatPlaytime(totalMinutes) {
    const minutes = totalMinutes ?? 0;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const readable = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
        hours: hours,
        mins: mins,
        time: readable,
    };
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
export function validateAuth() {
    const steam_user_id = process.env["STEAM_USER_ID"];
    const steam_api_key = process.env["STEAM_API_KEY"];

    let errors = [];

    if (steam_user_id == undefined) {
        errors.push("No wakatime API key found!\n"
                  + "Please define it as an STEAM_USER_ID "
                  + "environment variable");
        hasError = true;
    }
    if (steam_api_key == undefined) {
        errors.push("No wakatime API key found!\n"
                  + "Please define it as an STEAM_API_KEY "
                  + "environment variable");
        hasError = true;
    }
    if (errors.length > 0) throw new Error(errors.join("\n"));
    
    return [steam_user_id, steam_api_key];
}
export function getConsumptionMode() {
    return process.env["PROCESS_CONSUPTION"] || 'MEDIUM';
}   