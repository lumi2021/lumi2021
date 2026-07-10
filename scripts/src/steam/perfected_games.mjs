import { getConsumptionMode, steamGet, validateAuth } from "./common.mjs";
import fs from "node:fs/promises";
import path from "path";

export async function perfectedGamesService(section) {
    const mode = getConsumptionMode();
    if (mode != 'HIGH') {
        console.warn(`Skipped steam.perfected_games in ${mode} consumption mode`);
        return section.content;
    }

    const [USER_ID, API_KEY] = validateAuth();
    const cache_dir = process.env["CACHE_DIRECTORY"];
    
    console.log("Loading steam's owned games...");
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

    console.log("Filtering perfected games...");
    const perfectGames = [];
    let analyzedGames = 0;
    for (const game of owned) {
        console.log(`\tFiltering steam perfected games `
            + `[${analyzedGames++} of ${owned.length}] `
            + `(${game.name})`);

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

    const banners_dir = path.join(cache_dir, "steam/game_banners");
    fs.mkdir(banners_dir, { recursive: true });

    var content = [];

    //content.push("| Icon | Name | Time played |");
    //content.push("|:----:|:----:|:-----------:|");

    for (let i = 0; i < perfectGames.length; i++) {
        const game = perfectGames[i];

        const name = game.name;
        
        const total_minutes = game.playtime_forever ?? 0;
        const hours = Math.floor(total_minutes / 60);
        const mins = total_minutes % 60;
        
        const playtime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        
        game.image_header = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.appid}/header.jpg`;
        game.image_capsule = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.appid}/capsule_231x87.jpg`;
        game.image_hero = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.appid}/library_hero.jpg`;
        game.image_600_900 = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.appid}/library_600x900.jpg`;
        game.image_logo = `https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.appid}/logo.png`;
        
        // content.push(`<img src="${image_header}" align="left"/>`);
        // content.push(`<img src="${image_capsule}" align="left"/>`);
        // content.push(`<img src="${image_hero}" align="left"/>`);
        // content.push(`<img src="${image_600_900}" align="left"/>`);
        // content.push(`<img src="${image_logo}"/>`);

        const svg_path = `${banners_dir}/${game.appid}.svg`;
        await fs.writeFile(svg_path, makeCard(game), "utf-8");

        content.push(`![](${svg_path})`);
    }

    return content.join('\n');

}

function makeCard(game) {
    return `
<svg xmlns="http://www.w3.org/2000/svg"
    width="460"
    height="215"
    viewBox="0 0 460 215"
>

    <defs>
        <linearGradient id="fade"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1">
            <stop offset="45%" stop-color="transparent"/>
            <stop offset="100%" stop-color="#111"/>
        </linearGradient>

        <filter id="shadow">
            <feDropShadow dx="0"
                          dy="2"
                          stdDeviation="3"
                          flood-opacity=".45"/>
        </filter>
    </defs>

    <image
        href="${game.image_header}"
        width="460"
        height="215"
        preserveAspectRatio="xMidYMid slice"/>

    <rect
        width="460"
        height="215"
        fill="url(#fade)"/>

    <text
        x="20"
        y="175"
        fill="white"
        font-size="24"
        font-family="Arial"
        filter="url(#shadow)">
        ${escapeXml(game.name)}
    </text>

    <text
        x="20"
        y="198"
        fill="#cccccc"
        font-size="16"
        font-family="Arial">
        ${game.playtime}
    </text>

    <rect
        x="365"
        y="170"
        width="75"
        height="28"
        rx="14"
        fill="#4CAF50"/>

    <text
        x="402"
        y="189"
        text-anchor="middle"
        fill="white"
        font-size="15"
        font-weight="bold"
        font-family="Arial">
        ✓ 100%
    </text>

</svg>`;
}

function escapeXml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}