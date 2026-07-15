import { getOwnedGames, validateAuth } from "./common.mjs";
import { getResponsiveCard } from "./game-card.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import global from '#global';

export async function perfectedGamesService(section) {
    const now = new Date();
    const last_updated_str = global.cache_info.steam_last_updated;
    const last_updated = last_updated_str ? new Date(last_updated_str) : null;

    const is_day_0 = now.getDay() === 0;
    const must_update = !global.cache_info.steam_game_data || is_day_0;
    const must_clean_cache = last_updated && last_updated.toDateString() === now.toDateString();

    let steam_perfected_game_data = {};

    if (must_update) {
        if (must_clean_cache && global.cache_info.steam_game_data && typeof global.cache_info.steam_game_data === 'object') {
            console.log("[Steam Service] Cleaning up old cached images from disk...");
            for (const appid in global.cache_info.steam_game_data) {
                if (Object.prototype.hasOwnProperty.call(global.cache_info.steam_game_data, appid)) {
                    const game = global.cache_info.steam_game_data[appid];
                    
                    if (game.thin_path && !game.thin_path.includes('<')) {
                        await fs.unlink(game.thin_path).catch(() => {
                            console.warn(`Could not delete old file: ${game.thin_path}`);
                        });
                    
                    }
                    if (game.wide_path && !game.wide_path.includes('<')) {
                        await fs.unlink(game.wide_path).catch(() => {
                            console.warn(`Could not delete old file: ${game.wide_path}`);
                        });
                    }
                }
            }
        }

        const [USER_ID, API_KEY] = validateAuth();

        console.log("[Steam Service] Loading steam's owned games and achievements...");
        
        const owned = await getOwnedGames(USER_ID, API_KEY);

        const perfectGames = owned
            .filter(game => game.all_achievements.length > 0 && game.unlocked_achievements.length === game.all_achievements.length)
            .sort((a, b) => {
                const lastAchievedA = a.unlocked_achievements[0]?.unlocktime ?? 0;
                const lastAchievedB = b.unlocked_achievements[0]?.unlocktime ?? 0;
                return lastAchievedB - lastAchievedA;
            })
            .slice(0, Math.min(owned.length, 4));

        console.log(`[Steam Service] Found ${perfectGames.length} perfected games.`);

        const card_results = await Promise.all(perfectGames.map(async (game) => {
            const [ widePath, thinPath ] = await getResponsiveCard(game);
 
            return {
                appid: game.appid.toString(),
                data: {
                    name: game.name,
                    thin_path: thinPath,
                    wide_path: widePath
                }
            };
        }));

        for (const item of card_results) {
            steam_perfected_game_data[item.appid] = item.data;
        }

        global.cache_info.steam_perfected_game_data = steam_perfected_game_data;
        global.cache_info.steam_perfected_last_updated = now.toISOString();

        console.log("[Steam Service] Fresh data generated as dictionary, old assets purged.");
    } else {
        console.log("[Steam Service] Using cached steam game data...");
        steam_perfected_game_data = global.cache_info.steam_game_data || {};
    }

    const content = [];
    content.push("<p>");
    
    const github_article_max_px = 1061;

    for (const appid in steam_perfected_game_data) {
        if (Object.prototype.hasOwnProperty.call(steam_perfected_game_data, appid)) {
            const game = steam_perfected_game_data[appid];
            content.push(
                `<a href="https://store.steampowered.com/app/${appid}" target="_blank"><picture>`,
                `    <source media="(max-width: ${github_article_max_px}px)" width="24%" srcset="${game.thin_path}">`,
                `    <source media="(min-width: ${github_article_max_px}px)" width="49%" srcset="${game.wide_path}">`,
                `    <img style="max-width: 100%;" alt="${game.name}">`,
                '</picture></a>'
            );
        }
    }

    content.push("</p>");
    content.push("<p align='center'><sub><i>Disclaimer: All game titles, arts, logos, and trademarks belong to Steam (Valve Corporation) and their respective developers.</i></sub></p>");
    
    return content.join('\n');
}