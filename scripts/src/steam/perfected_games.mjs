import { getConsumptionMode, getOwnedGames, validateAuth } from "./common.mjs";
import fs from "node:fs/promises";
import path from "path";

import { getResponsiveCard } from "./game-card.mjs";

export async function perfectedGamesService(section) {
    const mode = getConsumptionMode();
    if (mode != 'HIGH') {
        console.warn(`Skipped steam.perfected_games in ${mode} consumption mode`);
        return section.content;
    }

    const [USER_ID, API_KEY] = validateAuth();
    const cache_dir = process.env["CACHE_DIRECTORY"];

    console.log("[Steam API] Loading steam's owned games and achievements...");
    
    const owned = await getOwnedGames(USER_ID, API_KEY);

    const perfectGames = owned
        .filter(game => game.all_achievements.length > 0 && game.unlocked_achievements.length === game.all_achievements.length)
        .sort((a, b) => {
            const lastAchievedA = a.unlocked_achievements[0]?.unlocktime ?? 0;
            const lastAchievedB = b.unlocked_achievements[0]?.unlocktime ?? 0;
            return lastAchievedB - lastAchievedA;
        });

    console.log(`[Steam API] Found ${perfectGames.length} perfected games.`);

    const content = [];
    content.push("<p>");
    
    for (let i = 0; i < perfectGames.length; i++) {
        const game = perfectGames[i];
        content.push(... await getResponsiveCard(game));
    }

    content.push("</p>");
    content.push("<p align='center'><sub><i>Disclaimer: All game titles, arts, logos, and trademarks belong to Steam (Valve Corporation) and their respective developers.</i></sub></p>");
    
    return content.join('\n');
}