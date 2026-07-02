export const STATUS = ["Offline", "Online", "Busy", "Away", "Snooze" ];

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

export function validateAuth(steam_auth) {
    if (steam_auth == undefined) {
        throw new Error(
            "No steam auth key found!\n"
            + "Please define an STEAM_AUTH environment variable with "
            + "the format \"{user_id}:{steam_api}\""
        );
    }

    return [steam_auth.user, steam_auth.api_key];
}