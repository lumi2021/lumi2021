import { getOwnedGames, validateAuth } from "./common.mjs";
import { getResponsiveCard } from "./game-card.mjs";
import fs from "node:fs/promises";
import path from "path";
import global from '#global';

export async function recentGamesService(section) {
    const now = new Date();
    const last_updated_str = global.cache_info.steam_recent_last_updated;
    const last_updated = last_updated_str ? new Date(last_updated_str) : null;

    const is_day_0 = now.getDay() === 0;
    const must_update = !global.cache_info.steam_recent_game_data || is_day_0;
    const must_clean_cache = must_update && global.cache_info.steam_recent_game_data;

    let steam_recent_game_data = {};

    if (must_update) {
        if (must_clean_cache && typeof global.cache_info.steam_recent_game_data === 'object') {
            console.log("[Steam Service] Cleaning up old cached recent images from disk...");
            for (const appid in global.cache_info.steam_recent_game_data) {
                if (Object.prototype.hasOwnProperty.call(global.cache_info.steam_recent_game_data, appid)) {
                    const game = global.cache_info.steam_recent_game_data[appid];
                    
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

        console.log("[Steam Service] Loading recent games...");
        
        const games = await getOwnedGames(USER_ID, API_KEY);

        const recent = games
            .filter(g => (g.last_played_timestamp ?? 0) > 0)
            .sort((a, b) => (b.last_played_timestamp ?? 0) - (a.last_played_timestamp ?? 0))
            .slice(0, Math.min(games.length, 4));

        console.log(`[Steam Service] Found ${recent.length} recent games.`);

        const card_results = await Promise.all(recent.map(async (game) => {
            const [widePath, thinPath] = await getResponsiveCard(game);
 
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
            steam_recent_game_data[item.appid] = item.data;
        }

        global.cache_info.steam_recent_game_data = steam_recent_game_data;
        global.cache_info.steam_recent_last_updated = now.toISOString();

        console.log("[Steam Service] Fresh recent games generated, old assets purged.");
    } else {
        console.log("[Steam Service] Using cached recent steam game data...");
        steam_recent_game_data = global.cache_info.steam_recent_game_data || {};
    }

    const content = [];
    content.push("<p>");
    
    const github_article_max_px = 1061;

    for (const appid in steam_recent_game_data) {
        if (Object.prototype.hasOwnProperty.call(steam_recent_game_data, appid)) {
            const game = steam_recent_game_data[appid];
            content.push(
                `<a href="https://store.steampowered.com/app/${appid}"><picture>`,
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