import { getConsumptionMode, steamGet, validateAuth } from "./common.mjs";

export async function recentGamesService(section) {
    const mode = getConsumptionMode();
    if (mode != 'HIGH') {
        console.warn(`Skipped steam.recent_games in ${mode} consumption mode`);
        return section.content;
    }

    const [USER_ID, API_KEY] = validateAuth();

    const recent = (
        await steamGet(
            "IPlayerService/GetRecentlyPlayedGames/v1/",
            { steamid: USER_ID, count: 5 },
            API_KEY
        )
    ).response?.games ?? [];
    if (recent.length > 5) recent = recent.slice(0, 5);

    let analyzedGames = 0;
    for (const game of recent) {
        process.stdout.write("\Gathering recent games' extra data [" + analyzedGames++
            + " of " + recent.length + "]");

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
            
            game.total_achievements = stats.achievements.length;
            game.unlocked_achievements = stats.achievements.filter(a => a.achieved === 1).length;
        
        } catch { continue; }
    }
    process.stdout.write("\n");

    let content = [];

    content.push("| Icon | Name | Time played | Achievements |");
    content.push("|:----:|:----:|:-----------:|:------------:|");

    for (let i = 0; i < recent.length; i++) {
        const game = recent[i];

        const name = game.name;
        const icon = game.img_icon_url ? `![](https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg)` : "";

        const total_minutes = game.playtime_2weeks ?? 0;
        const hours = Math.floor(total_minutes / 60);
        const mins = total_minutes % 60;

        const playtime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        const achievements_total = game.total_achievements ?? 0;
        const achievements_unlocked = game.unlocked_achievements ?? 0;
        const achievements = achievements_total == 0
            ? "n/a"
            : `${achievements_unlocked} / ${achievements_total} `
            + `(${Math.round(achievements_unlocked / achievements_total * 100)}%`;

        content.push(`| ${icon} | ${name} | ${playtime} | ${achievements} |`);
    }

    return content.join('\n');

}
