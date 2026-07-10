import { getConsumptionMode, steamGet, validateAuth } from "./common.mjs";
import fs from "node:fs/promises";
import path from "path";

import { JSDOM } from 'jsdom';
import prettier from 'prettier';
import xmlPlugin from '@prettier/plugin-xml';

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

        const totalMinutes = game.playtime_forever ?? 0;
    
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const secs = 0;

        delete game.playtime_deck_forever;
        delete game.playtime_disconected;
        delete game.playtime_forever;
        delete game.playtime_linux_forever;
        delete game.playtime_mac_forever;
        delete game.playtime_windows_forever;

        game.played_hours = hours;
        game.played_mins = mins;
        game.played_secs = secs;
        game.played_time = `{hours} h {mins} min`;
        game.image_header = `${game.appid}/header.jpg`;
        game.image_capsule = `${game.appid}/capsule_231x87.jpg`;
        game.image_hero = `${game.appid}/library_hero.jpg`;
        game.image_cover = `${game.appid}/library_600x900.jpg`;
        game.image_logo = `${game.appid}/logo.png`;

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
    await fs.rm(banners_dir, { recursive: true, force: true });
    fs.mkdir(banners_dir, { recursive: true });

    var content = [];

    content.push(`<table border="0" cellpadding="0" cellspacing="0" style="border: none; border-collapse: collapse;">`);
    var count = 0;

    content.push('<table border="0" cellpadding="0" cellspacing="0" style="border: none; border-collapse: collapse;">');
    
    content.push("<tr>");    
    for (let i = 0; i < perfectGames.length; i++) {
    
        if (i > 0 && i % 2 === 0) {
            content.push("</tr>");
            content.push("<tr>");
        }

        const game = perfectGames[i];
        
        const total_minutes = game.playtime_forever ?? 0;
        const hours = Math.floor(total_minutes / 60);
        const mins = total_minutes % 60;
        
        game.playtime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        
        const wide_svg_path = `${banners_dir}/${game.appid}_wide.svg`;
        await fs.writeFile(wide_svg_path, await makeWideCard(game), "utf-8");
        
        content.push(`  <td style="border: none; padding: 5px; background: transparent">`);
        content.push(`    <img src="${wide_svg_path}" width="410" alt="${game.name}">`);
        content.push(`  </td>`);
    }
    
    content.push("</tr>"); // CORRIGIDO: Fecha a última linha da tabela
    content.push("</table>");

    content.push("</table>");
    content.push("<p align='center'><sub><i>Disclaimer: All game titles, arts, logos, and trademarks belong to Steam (Valve Corporation) and their respective developers.</i></sub></p>");
    return content.join('\n');

}

async function makeWideCard(game) {
    const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    const document = dom.window.document;
    const svgNS = "http://www.w3.org/2000/svg";

    const [image_hero, , ] = await imageToBase64(`https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.image_hero}`);
    const [image_logo, image_logo_w, image_logo_h] = await imageToBase64(`https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.image_logo}`);

    const canvas_width = 460;
    const canvas_height = 215;

    // 2. Cria o elemento raiz <svg>
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("xmlns", svgNS);
    svg.setAttribute("width", canvas_width);
    svg.setAttribute("height", canvas_height);
    svg.setAttribute("viewBox", `0 0 ${canvas_width} ${canvas_height}`);

    const defs = document.createElementNS(svgNS, "defs");

    const linearGradient = document.createElementNS(svgNS, "linearGradient");
    linearGradient.setAttribute("id", "fade");
    linearGradient.setAttribute("x1", "0");
    linearGradient.setAttribute("y1", "0");
    linearGradient.setAttribute("x2", "0");
    linearGradient.setAttribute("y2", "1");

    const stop1 = document.createElementNS(svgNS, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", "transparent");

    const stop2 = document.createElementNS(svgNS, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", "#111");

    linearGradient.appendChild(stop1);
    linearGradient.appendChild(stop2);
    defs.appendChild(linearGradient);

    const filter = document.createElementNS(svgNS, "filter");
    filter.setAttribute("id", "shadow");

    const feDropShadow = document.createElementNS(svgNS, "feDropShadow");
        feDropShadow.setAttribute("dx", "0");
        feDropShadow.setAttribute("dy", "2");
        feDropShadow.setAttribute("stdDeviation", "3");
        feDropShadow.setAttribute("flood-opacity", ".45");

    filter.appendChild(feDropShadow);
    defs.appendChild(filter);
    svg.appendChild(defs);

    // 4. Hero image
    const hero_image = document.createElementNS(svgNS, "image");
        hero_image.setAttribute("href", image_hero);
        hero_image.setAttribute("width", "460");
        hero_image.setAttribute("height", "215");
        hero_image.setAttribute("preserveAspectRatio", "xMidYMid slice");
        svg.appendChild(hero_image);

    // 5. Gradient
    const rectFade = document.createElementNS(svgNS, "rect");
        rectFade.setAttribute("width", "460");
        rectFade.setAttribute("height", "215");
        rectFade.setAttribute("fill", "url(#fade)");
        svg.appendChild(rectFade);

    const image_logo_fw = canvas_width / 2;
    const image_logo_fh = (image_logo_fw / image_logo_w) * image_logo_h;

    const x_offset = 20; 
    const y_offset = canvas_height - image_logo_fh - 20;

    const icon = document.createElementNS(svgNS, "image");
        icon.setAttribute("x", x_offset);
        icon.setAttribute("y", y_offset);
        icon.setAttribute("href", image_logo);
        icon.setAttribute("width", image_logo_fw);
        icon.setAttribute("height", image_logo_fh);
        icon.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.appendChild(icon);

    // Badge
    {
        // Box
        const rectBadge = document.createElementNS(svgNS, "rect");
            rectBadge.setAttribute("x", "10");
            rectBadge.setAttribute("y", "175");
            rectBadge.setAttribute("width", "75");
            rectBadge.setAttribute("height", "28");
            rectBadge.setAttribute("rx", "14");
            rectBadge.setAttribute("fill", "#4CAF50");
            svg.appendChild(rectBadge);

        // Text
        const textBadge = document.createElementNS(svgNS, "text");
            textBadge.setAttribute("x", "48");
            textBadge.setAttribute("y", "194");
            textBadge.setAttribute("text-anchor", "middle");
            textBadge.setAttribute("fill", "white");
            textBadge.setAttribute("font-size", "15");
            textBadge.setAttribute("font-weight", "bold");
            textBadge.setAttribute("font-family", "Arial");
            textBadge.textContent = "✓ 100%";
            svg.appendChild(textBadge);
    }

    // Game plyed time
    const textPlaytime = document.createElementNS(svgNS, "text");
        textPlaytime.setAttribute("x", "100");
        textPlaytime.setAttribute("y", "194");
        textPlaytime.setAttribute("fill", "#cccccc");
        textPlaytime.setAttribute("font-size", "16");
        textPlaytime.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
        textPlaytime.setAttribute("style", "text-shadow: 1px 1px 2px rgba(0,0,0,0.8);");
        textPlaytime.textContent = game.playtime || "0h 0m";
        svg.appendChild(textPlaytime);
    
    // Credits because no one want to be sued
    const textCredits = document.createElementNS(svgNS, "text");
        textCredits.setAttribute("x", "343");
        textCredits.setAttribute("y", "210");
        textCredits.setAttribute("fill", "#ffffff");
        textCredits.setAttribute("fill-opacity", "0.3");
        textCredits.setAttribute("font-size", "10");
        textCredits.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
        textCredits.style.letterSpacing = "1px";
        textCredits.textContent = "POWERED BY STEAM";
        svg.appendChild(textCredits);

    return await prettier.format(svg.outerHTML, {
        parser: 'xml',
        plugins: [xmlPlugin],
        xmlQuoteAttributes: 'double',
        xmlWhitespaceSensitivity: 'ignore',
        
        printWidth: 1,
        singleAttributePerLine: true,
        tabWidth: 4,
        useTabs: true
    });
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
async function imageToBase64(url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = response.headers.get('content-type') || 'image/jpeg';

        let width = 0;
        let height = 0;

        // Manual image header parsing because bruh i will not install a fucking
        // dependency just for that
        if (mimeType === 'image/png') {
            width = buffer.readUInt32BE(16);
            height = buffer.readUInt32BE(20);
        }
        else if (mimeType === 'image/jpeg') {
            let i = 0;
            while (i < buffer.length) {
                if (buffer[i] === 0xFF && (buffer[i + 1] === 0xC0 || buffer[i + 1] === 0xC2)) {
                    height = buffer.readUInt16BE(i + 5);
                    width = buffer.readUInt16BE(i + 7);
                    break;
                }
                i++;
            }
        }
        else throw Error(`Unknown image format ${mimeType}`);

        var data = `data:${mimeType};base64,${buffer.toString('base64')}`;

        return [data, width, height];
    }
    catch (error) {
        console.error("Image to base64 error:", error);
        return ['', 0, 0];
    }
}
