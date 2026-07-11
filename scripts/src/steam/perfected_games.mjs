import { getConsumptionMode, getOwnedGames, validateAuth } from "./common.mjs";
import fs from "node:fs/promises";
import path from "path";

import { makeThinCard, makeWideCard } from "./game-card.mjs";

export async function perfectedGamesService(section) {
    const mode = getConsumptionMode();
    if (mode != 'HIGH') {
        console.warn(`Skipped steam.perfected_games in ${mode} consumption mode`);
        return section.content;
    }

    const [USER_ID, API_KEY] = validateAuth();
    const cache_dir = process.env["CACHE_DIRECTORY"];

    console.log("[Steam API] Loading steam's owned games and achievements...");
    
    const ownedWithAchievements = await getOwnedGames(USER_ID, API_KEY);

    const perfectGames = ownedWithAchievements
        .filter(game => {
            return game.total_achievements > 0 && game.unlocked_achievements === game.total_achievements;
        })
        .map(ownedGame => {
            const game = { ...ownedGame };
            
            // Como a nova função já roda o formatPlaytime e salva em 'playtime_forever_hours',
            // nós apenas reaproveitamos o objeto pronto para economizar processamento.
            game.playtime = game.playtime_forever_hours; 
            
            game.image_header = `${game.appid}/header.jpg`;
            game.image_capsule = `${game.appid}/capsule_231x87.jpg`;
            game.image_hero = `${game.appid}/library_hero.jpg`;
            game.image_cover = `${game.appid}/library_600x900.jpg`;
            game.image_logo = `${game.appid}/logo.png`;
            return game;
        });

    console.log(`[Steam API] Found ${perfectGames.length} perfected games.`);

    const banners_dir = path.join(cache_dir, "steam/game_banners/perfected");
    await fs.rm(banners_dir, { recursive: true, force: true });
    await fs.mkdir(banners_dir, { recursive: true });

    const content = [];
    content.push("<p>");
    
    for (let i = 0; i < perfectGames.length; i++) {
        const game = perfectGames[i];

        const wide_svg_path = `${banners_dir}/${game.appid}_wide.svg`;
        const thin_svg_path = `${banners_dir}/${game.appid}_thin.svg`;

        await fs.writeFile(wide_svg_path, await makeWideCard(game), "utf-8");
        await fs.writeFile(thin_svg_path, await makeThinCard(game), "utf-8");

        content.push('    <picture>');
        content.push(`        <source media="(max-width: 1061px)" width="21%" srcset="${thin_svg_path}">`);
        content.push(`        <source media="(min-width: 1061px)" width="49%" srcset="${wide_svg_path}">`);
        content.push(`        <img style="max-width: 100%; padding: 5px;" alt="${game.name}">`);
        content.push('    </picture>');
    }

    content.push("</p>");
    content.push("<p align='center'><sub><i>Disclaimer: All game titles, arts, logos, and trademarks belong to Steam (Valve Corporation) and their respective developers.</i></sub></p>");
    
    return content.join('\n');
}