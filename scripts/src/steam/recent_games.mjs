import { getConsumptionMode, getOwnedGames, validateAuth } from "./common.mjs";
import fs from "node:fs/promises";
import path from "path";

import { getResponsiveCard } from "./game-card.mjs";

export async function recentGamesService(section) {
    const mode = getConsumptionMode();
    if (mode != 'HIGH') {
        console.warn(`Skipped steam.recent_games in ${mode} consumption mode`);
        return section.content;
    }

    const [USER_ID, API_KEY] = validateAuth();
    const cache_dir = process.env["CACHE_DIRECTORY"];

    console.log("[Steam API] Loading recent games...");
    
    const games = await getOwnedGames(USER_ID, API_KEY);

    const recent = games
        .filter(g => (g.last_played_timestamp ?? 0) > 0)
        .sort((a, b) => (b.last_played_timestamp ?? 0) - (a.last_played_timestamp ?? 0))
        .slice(0, 4);

    const content = [];

    for (let i = 0; i < recent.length; i++) {
        const game = recent[i];
        content.push(... await getResponsiveCard(game));
    }

    content.push("<p align='center'><sub><i>Disclaimer: All game titles, arts, logos, and trademarks belong to Steam (Valve Corporation) and their respective developers.</i></sub></p>");
    return content.join('\n');
}
