import { JSDOM } from 'jsdom';
import prettier from 'prettier';
import xmlPlugin from '@prettier/plugin-xml';


export async function makeWideCard(game) {
    const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    const document = dom.window.document;
    const svgNS = "http://www.w3.org/2000/svg";

    const [image_hero] = await imageToBase64(`https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.image_hero}`);
    const [image_logo, image_logo_w, image_logo_h] = await imageToBase64(`https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.image_logo}`);

    const canvas_width = 460;
    const canvas_height = 215;

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

    // Hero image
    const hero_image = document.createElementNS(svgNS, "image");
        hero_image.setAttribute("href", image_hero);
        hero_image.setAttribute("width", "460");
        hero_image.setAttribute("height", "215");
        hero_image.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.appendChild(hero_image);

    // Gradient
    const rectFade = document.createElementNS(svgNS, "rect");
        rectFade.setAttribute("width", "460");
        rectFade.setAttribute("height", "215");
        rectFade.setAttribute("fill", "url(#fade)");
    svg.appendChild(rectFade);

    const image_logo_fw = canvas_width / 2;
    const image_logo_fh = (image_logo_fw / image_logo_w) * image_logo_h;

    // Icon
    const icon = document.createElementNS(svgNS, "image");
        icon.setAttribute("x", 20);
        icon.setAttribute("y", 20);
        icon.setAttribute("href", image_logo);
        icon.setAttribute("width", image_logo_fw);
        icon.setAttribute("height", image_logo_fh);
        icon.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.appendChild(icon);

    
    // Time played
    const playtime_text = game.playtime.time || "0h 0m";
    const playtime_pill_width = 65 + playtime_text.length * 8;

    const rectPlaytime = document.createElementNS(svgNS, "rect");
        rectPlaytime.setAttribute("x", "60");
        rectPlaytime.setAttribute("y", "175");
        rectPlaytime.setAttribute("width", playtime_pill_width);
        rectPlaytime.setAttribute("height", "28");
        rectPlaytime.setAttribute("rx", "14");
        rectPlaytime.setAttribute("fill", "#000000");
        rectPlaytime.setAttribute("fill-opacity", "0.55");
    svg.appendChild(rectPlaytime);

    const textPlaytime = document.createElementNS(svgNS, "text");
        textPlaytime.setAttribute("x", 100);
        textPlaytime.setAttribute("y", "194");
        textPlaytime.setAttribute("fill", "#ffffff");
        textPlaytime.setAttribute("font-size", "16");
        textPlaytime.setAttribute("font-weight", "600");
        textPlaytime.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
        textPlaytime.textContent = playtime_text;
    svg.appendChild(textPlaytime);

    // Badge
    {
        const bad_color = '#cc0000';
        const good_color = '#4CAF50';
        const meh_color = '#555555';

        let badge_color = '#000000';
        let badge_text = 0;

        const total_achiev = game.total_achievements;
        const unlock_achiev = game.unlocked_achievements;

        if (total_achiev == undefined || unlock_achiev == undefined) {
            badge_color = meh_color;
            badge_text = "NA";
        }
        else {
            const achiev_percent = unlock_achiev / total_achiev;
            badge_text = `🏆 ${Math.round(achiev_percent * 100)}%`;
            badge_color = lerpColor(bad_color, good_color, achiev_percent);
        }
        
        const rectBadge = document.createElementNS(svgNS, "rect");
            rectBadge.setAttribute("x", "10");
            rectBadge.setAttribute("y", "175");
            rectBadge.setAttribute("width", "75");
            rectBadge.setAttribute("height", "28");
            rectBadge.setAttribute("rx", "14");
            rectBadge.setAttribute("fill", badge_color);
        svg.appendChild(rectBadge);

        const textBadge = document.createElementNS(svgNS, "text");
            textBadge.setAttribute("x", "48");
            textBadge.setAttribute("y", "194");
            textBadge.setAttribute("text-anchor", "middle");
            textBadge.setAttribute("fill", "white");
            textBadge.setAttribute("font-size", "15");
            textBadge.setAttribute("font-weight", "bold");
            textBadge.setAttribute("font-family", "Arial");
            textBadge.textContent = badge_text;
        svg.appendChild(textBadge);
    }


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
export async function makeThinCard(game) {
    const dom = new JSDOM(`<!DOCTYPE html><body></body>`);
    const document = dom.window.document;
    const svgNS = "http://www.w3.org/2000/svg";

    const [image_cover] = await imageToBase64(`https://shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/${game.image_cover}`);
    const canvas_width = 600;
    const canvas_height = 900;

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

    // Hero image
    const hero_image = document.createElementNS(svgNS, "image");
        hero_image.setAttribute("href", image_cover);
        hero_image.setAttribute("width", "600");
        hero_image.setAttribute("height", "900");
        hero_image.setAttribute("preserveAspectRatio", "xMidYMid slice");
    svg.appendChild(hero_image);

    // Gradient
    // const rectFade = document.createElementNS(svgNS, "rect");
    //     rectFade.setAttribute("width", "460");
    //     rectFade.setAttribute("height", "215");
    //     rectFade.setAttribute("fill", "url(#fade)");
    // svg.appendChild(rectFade);

    // const image_logo_fw = canvas_width / 2;
    // const image_logo_fh = (image_logo_fw / image_logo_w) * image_logo_h;

    // // Icon
    // const icon = document.createElementNS(svgNS, "image");
    //     icon.setAttribute("x", 20);
    //     icon.setAttribute("y", 20);
    //     icon.setAttribute("href", image_logo);
    //     icon.setAttribute("width", image_logo_fw);
    //     icon.setAttribute("height", image_logo_fh);
    //     icon.setAttribute("preserveAspectRatio", "xMidYMid meet");
    // svg.appendChild(icon);

    
    // // Time played
    // const playtime_text = game.playtime.time || "0h 0m";
    // const playtime_pill_width = 65 + playtime_text.length * 8;

    // const rectPlaytime = document.createElementNS(svgNS, "rect");
    //     rectPlaytime.setAttribute("x", "60");
    //     rectPlaytime.setAttribute("y", "175");
    //     rectPlaytime.setAttribute("width", playtime_pill_width);
    //     rectPlaytime.setAttribute("height", "28");
    //     rectPlaytime.setAttribute("rx", "14");
    //     rectPlaytime.setAttribute("fill", "#000000");
    //     rectPlaytime.setAttribute("fill-opacity", "0.55");
    // svg.appendChild(rectPlaytime);

    // const textPlaytime = document.createElementNS(svgNS, "text");
    //     textPlaytime.setAttribute("x", 100);
    //     textPlaytime.setAttribute("y", "194");
    //     textPlaytime.setAttribute("fill", "#ffffff");
    //     textPlaytime.setAttribute("font-size", "16");
    //     textPlaytime.setAttribute("font-weight", "600");
    //     textPlaytime.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
    //     textPlaytime.textContent = playtime_text;
    // svg.appendChild(textPlaytime);

    // // Badge
    // {
    //     const bad_color = '#cc0000';
    //     const good_color = '#4CAF50';
    //     const meh_color = '#555555';

    //     let badge_color = '#000000';
    //     let badge_text = 0;

    //     const total_achiev = game.total_achievements;
    //     const unlock_achiev = game.unlocked_achievements;

    //     if (total_achiev == undefined || unlock_achiev == undefined) {
    //         badge_color = meh_color;
    //         badge_text = "NA";
    //     }
    //     else {
    //         const achiev_percent = unlock_achiev / total_achiev;
    //         badge_text = `🏆 ${Math.round(achiev_percent * 100)}%`;
    //         badge_color = lerpColor(bad_color, good_color, achiev_percent);
    //     }
        
    //     const rectBadge = document.createElementNS(svgNS, "rect");
    //         rectBadge.setAttribute("x", "10");
    //         rectBadge.setAttribute("y", "175");
    //         rectBadge.setAttribute("width", "75");
    //         rectBadge.setAttribute("height", "28");
    //         rectBadge.setAttribute("rx", "14");
    //         rectBadge.setAttribute("fill", badge_color);
    //     svg.appendChild(rectBadge);

    //     const textBadge = document.createElementNS(svgNS, "text");
    //         textBadge.setAttribute("x", "48");
    //         textBadge.setAttribute("y", "194");
    //         textBadge.setAttribute("text-anchor", "middle");
    //         textBadge.setAttribute("fill", "white");
    //         textBadge.setAttribute("font-size", "15");
    //         textBadge.setAttribute("font-weight", "bold");
    //         textBadge.setAttribute("font-family", "Arial");
    //         textBadge.textContent = badge_text;
    //     svg.appendChild(textBadge);
    // }


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

export function escapeXml(unsafe) {
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

        const data = `data:${mimeType};base64,${buffer.toString('base64')}`;

        return [data, width, height];
    }
    catch (error) {
        console.error("Image to base64 error:", error);
        return ['', 0, 0];
    }
}

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const bigint = parseInt(clean, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255,
    };
}

function rgbToHex({ r, g, b }) {
    return '#' + [r, g, b]
        .map(c => Math.round(c).toString(16).padStart(2, '0'))
        .join('');
}

function lerpColor(colorA, colorB, t) {
    const a = hexToRgb(colorA);
    const b = hexToRgb(colorB);
    return rgbToHex({
        r: a.r + (b.r - a.r) * t,
        g: a.g + (b.g - a.g) * t,
        b: a.b + (b.b - a.b) * t,
    });
}
