import { STATUS, steamGet, validateAuth } from './common.mjs';

export async function profileService(section, steam_auth) {
    if (section.templates == null) return;
    const [USER_ID, API_KEY] = validateAuth(steam_auth);
    
    const profile = (
        await steamGet(
            "ISteamUser/GetPlayerSummaries/v2/",
            { steamids: USER_ID },
            API_KEY,
        )
    ).response.players[0];

    const data = {
        name: profile.realname ?? "Unknown",
        username: profile.personaname ?? "Unknown",
        status: STATUS[profile.personastate] ?? "Unknown",
        profile_url: profile.profileurl ?? "#",
    }
    
    var content = [];

    for (let i = 0; i < section.templates.length; i++) {
        const template = section.templates[i];
        const template_content = normalizeTemplate(template.content);
        content.push(renderTemplate(template_content, data));
    }

    return content.join('\n');
}

function normalizeTemplate(str) {
    if (typeof str !== "string") throw new TypeError("Template must be a string");
    
    let s = str.trim();

    const isQuoted =
        (s.startsWith('"') && s.endsWith('"')) ||
        (s.startsWith("'") && s.endsWith("'"));

    if (!isQuoted) throw new TypeError(`Template must be a string`);

    return s.slice(1, -1).trim();
}
function renderTemplate(str, data) {
    return str.replace(/\{(\w+)\}/g, (_, key) => {
        return data[key] ?? "";
    });
}
