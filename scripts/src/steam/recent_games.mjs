import { getConsumptionMode, getOwnedGames, getAchievements, validateAuth, formatPlaytime } from "./common.mjs";
import fs from "node:fs/promises";
import path from "path";

import { makeWideCard } from "./game-card.mjs";

export async function recentGamesService(section) {
    const mode = getConsumptionMode();
    if (mode != 'HIGH') {
        console.warn(`Skipped steam.recent_games in ${mode} consumption mode`);
        return section.content;
    }

    const [USER_ID, API_KEY] = validateAuth();
    const cache_dir = process.env["CACHE_DIRECTORY"];

    const owned = await getOwnedGames(USER_ID, API_KEY);

    const recent = owned
        .filter(g => (g.playtime_2weeks ?? 0) > 0)
        .sort((a, b) => (b.playtime_2weeks ?? 0) - (a.playtime_2weeks ?? 0))
        .slice(0, 5)
        .map(g => ({ ...g }));

    let analyzedGames = 0;
    for (const game of recent) {
        game.playtime = formatPlaytime(game.playtime_2weeks);
        game.image_header = `${game.appid}/header.jpg`;
        game.image_capsule = `${game.appid}/capsule_231x87.jpg`;
        game.image_hero = `${game.appid}/library_hero.jpg`;
        game.image_cover = `${game.appid}/library_600x900.jpg`;
        game.image_logo = `${game.appid}/logo.png`;

        process.stdout.write(`\rGathering recent games' extra data `
            + `[${analyzedGames++} of ${recent.length}] `
            + `(${game.name})`);

        try {

            const ach = await getAchievements(game.appid, USER_ID, API_KEY);
            const stats = ach?.playerstats;
            if (!stats || stats.success == false) continue;
            if (!stats?.success || !stats.achievements?.length) continue;

            game.total_achievements = stats.achievements.length;
            game.unlocked_achievements = stats.achievements.filter(a => a.achieved === 1).length;
        }
        catch { continue; }
    }
    process.stdout.write("\n");

    const banners_dir = path.join(cache_dir, "steam/game_banners/recent");
    await fs.rm(banners_dir, { recursive: true, force: true });
    await fs.mkdir(banners_dir, { recursive: true });

    const content = [];
    content.push('<table border="0" cellpadding="0" cellspacing="0" style="border: none; border-collapse: collapse;">');
    content.push("<tr>");

    for (let i = 0; i < recent.length; i++) {
        if (i > 0 && i % 2 === 0) {
            content.push("</tr>");
            content.push("<tr>");
        }

        const game = recent[i];

        const wide_svg_path = `${banners_dir}/${game.appid}_wide.svg`;
        await fs.writeFile(wide_svg_path, await makeWideCard(game), "utf-8");

        content.push(`  <td style="border: none; padding: 5px; background: transparent">`);
        content.push(`    <img src="${wide_svg_path}" width="410" alt="${game.name}">`);
        content.push(`  </td>`);
    }

    content.push("</tr>");
    content.push("</table>");
    content.push("<p align='center'><sub><i>Disclaimer: All game titles, arts, logos, and trademarks belong to Steam (Valve Corporation) and their respective developers.</i></sub></p>");
    return content.join('\n');
}