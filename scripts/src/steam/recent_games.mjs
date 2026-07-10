import { getConsumptionMode, getOwnedGames, validateAuth } from "./common.mjs";
import fs from "node:fs/promises";
import path from "path";

import { makeThinCard, makeWideCard } from "./game-card.mjs";

export async function recentGamesService(section) {
    const mode = getConsumptionMode();
    if (mode != 'HIGH') {
        console.warn(`Skipped steam.recent_games in ${mode} consumption mode`);
        return section.content;
    }

    const [USER_ID, API_KEY] = validateAuth();
    const cache_dir = process.env["CACHE_DIRECTORY"];

    console.log("[Steam API] Loading recent games...");
    
    const ownedWithAchievements = await getOwnedGames(USER_ID, API_KEY);

    const recent = ownedWithAchievements
        .filter(g => (g.playtime_2weeks ?? 0) > 0)
        .sort((a, b) => (b.playtime_2weeks ?? 0) - (a.playtime_2weeks ?? 0))
        .slice(0, 4)
        .map(g => {
            return {
                ...g,
                playtime: g.playtime_forever_hours, 
                image_header: `${g.appid}/header.jpg`,
                image_capsule: `${g.appid}/capsule_231x87.jpg`,
                image_hero: `${g.appid}/library_hero.jpg`,
                image_cover: `${g.appid}/library_600x900.jpg`,
                image_logo: `${g.appid}/logo.png`,
            };
        });

    const banners_dir = path.join(cache_dir, "steam/game_banners/recent");
    await fs.rm(banners_dir, { recursive: true, force: true });
    await fs.mkdir(banners_dir, { recursive: true });

    const content = [];
    content.push("<p>");

    for (let i = 0; i < recent.length; i++) {
        const game = recent[i];

        const wide_svg_path = `${banners_dir}/${game.appid}_wide.svg`;
        const thin_svg_path = `${banners_dir}/${game.appid}_thin.svg`;

        await fs.writeFile(wide_svg_path, await makeWideCard(game), "utf-8");
        await fs.writeFile(thin_svg_path, await makeThinCard(game), "utf-8");

        content.push('    <picture>');
        content.push(`        <source media="(max-width: 400px)" srcset="${thin_svg_path}">`);
        content.push(`        <img src="${wide_svg_path}" width="410" style="max-width: 100%; padding: 5px;" alt="${game.name}">`);
        content.push('    </picture>');
    }

    content.push("</p>");
    content.push("<p align='center'><sub><i>Disclaimer: All game titles, arts, logos, and trademarks belong to Steam (Valve Corporation) and their respective developers.</i></sub></p>");
    return content.join('\n');
}
