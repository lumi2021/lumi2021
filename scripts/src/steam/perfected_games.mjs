import { getConsumptionMode, getOwnedGames, getAchievements, validateAuth, formatPlaytime } from "./common.mjs";
import fs from "node:fs/promises";
import path from "path";

import { makeWideCard } from "./game-card.mjs";

export async function perfectedGamesService(section) {
    const mode = getConsumptionMode();
    if (mode != 'HIGH') {
        console.warn(`Skipped steam.perfected_games in ${mode} consumption mode`);
        return section.content;
    }

    const [USER_ID, API_KEY] = validateAuth();
    const cache_dir = process.env["CACHE_DIRECTORY"];

    const owned = await getOwnedGames(USER_ID, API_KEY);

    console.log("Filtering perfected games...");
    const perfectGames = [];
    let analyzedGames = 0;
    for (const ownedGame of owned) {
        // copiamos o objeto em vez de mutar o item cacheado em common.mjs -
        // ele é compartilhado com outros services (ex: recentGamesService)
        const game = { ...ownedGame };

        game.playtime = formatPlaytime(game.playtime_forever);
        game.image_header = `${game.appid}/header.jpg`;
        game.image_capsule = `${game.appid}/capsule_231x87.jpg`;
        game.image_hero = `${game.appid}/library_hero.jpg`;
        game.image_cover = `${game.appid}/library_600x900.jpg`;
        game.image_logo = `${game.appid}/logo.png`;

        console.log(`\tFiltering steam perfected games `
            + `[${analyzedGames++} of ${owned.length}] `
            + `(${game.name})`);

        try {
            const ach = await getAchievements(game.appid, USER_ID, API_KEY);
            const stats = ach?.playerstats;
            if (!stats || stats.success == false) continue;
            if (!stats?.success || !stats.achievements?.length) continue;

            const total = stats.achievements.length;
            const unlocked = stats.achievements.filter(a => a.achieved === 1).length;
            if (total > 0 && unlocked === total) perfectGames.push(game);
        }
        catch { continue; }
    }
    process.stdout.write("\n");

    // subpasta própria: perfected e recent escrevem no mesmo diretório base,
    // então cada service só limpa a sua própria subpasta
    const banners_dir = path.join(cache_dir, "steam/game_banners/perfected");
    await fs.rm(banners_dir, { recursive: true, force: true });
    await fs.mkdir(banners_dir, { recursive: true });

    const content = [];
    content.push('<table border="0" cellpadding="0" cellspacing="0" style="border: none; border-collapse: collapse;">');
    content.push("<tr>");

    for (let i = 0; i < perfectGames.length; i++) {
        if (i > 0 && i % 2 === 0) {
            content.push("</tr>");
            content.push("<tr>");
        }

        const game = perfectGames[i];

        const wide_svg_path = `${banners_dir}/${game.appid}_wide.svg`;
        await fs.writeFile(
            wide_svg_path,
            await makeWideCard(game),
            "utf-8"
        );

        content.push(`  <td style="border: none; padding: 5px; background: transparent">`);
        content.push(`    <img src="${wide_svg_path}" width="410" alt="${game.name}">`);
        content.push(`  </td>`);
    }

    content.push("</tr>");
    content.push("</table>");
    content.push("<p align='center'><sub><i>Disclaimer: All game titles, arts, logos, and trademarks belong to Steam (Valve Corporation) and their respective developers.</i></sub></p>");
    return content.join('\n');
}