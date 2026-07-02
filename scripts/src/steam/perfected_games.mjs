import { steamGet, validateAuth } from "./common.mjs";

export async function perfectedGamesService(section, steam_auth) {
    const [USER_ID, API_KEY] = validateAuth(steam_auth);

    const owned = (
        await steamGet(
            "IPlayerService/GetOwnedGames/v1/", {
                steamid: USER_ID,
                include_appinfo: true,
                include_played_free_games: true,
            },
            API_KEY
        )
    ).response?.games ?? [];

    const perfectGames = [];
    let analyzedGames = 0;
    for (const game of owned) {
        process.stdout.write("\rFiltering steam perfected games [" + analyzedGames++
            + " of " + owned.length + "]");

        try {
        
            const ach = await steamGet(
                "ISteamUserStats/GetPlayerAchievements/v1/", {
                    steamid: USER_ID,
                    appid: game.appid,
                },
                API_KEY
            );
            
            const stats = ach?.playerstats;
            if (!stats || stats.success == false) continue;

            if (!stats?.success || !stats.achievements?.length) continue;
            
            const total = stats.achievements.length;
            const unlocked = stats.achievements.filter(a => a.achieved === 1).length;
            if (total > 0 && unlocked === total) perfectGames.push(game);
        
        } catch { continue; }
    }
    process.stdout.write("\n");

    var content = [];

    content.push("| Icon | Name | Time played |");
    content.push("|:----:|:----:|:-----------:|");

    for (let i = 0; i < perfectGames.length; i++) {
        const game = perfectGames[i];

        const name = game.name;
        const icon = game.img_icon_url ? `![${name}](https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg)` : "";

        const total_minutes = game.playtime_forever ?? 0;
        const hours = Math.floor(total_minutes / 60);
        const mins = total_minutes % 60;

        const playtime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        content.push(`| ${icon} | ${name} | ${playtime} |`);
    }

    return content.join('\n');

}
