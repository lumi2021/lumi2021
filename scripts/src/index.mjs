import steam from "./steam/service.mjs";
import github from "./github/service.mjs";
import wakatime from "./wakatime/service.mjs";

import fs from "node:fs/promises";
import path from "path";


async function main() {

    let WAKATIME_AUTH = {}
    let LAST_FM_AUTH = {}
    let GITHUB_AUTH = {}
    let STEAM_AUTH = {}


    // Wakatime auth
    WAKATIME_AUTH.raw = process.env["WAKATIME_AUTH"];
    if (WAKATIME_AUTH.raw == undefined) WAKATIME_AUTH = undefined;
    else WAKATIME_AUTH.api_key = WAKATIME_AUTH.raw;

    // last.fm auth
    LAST_FM_AUTH.raw = process.env["LAST_FM_AUTH"];
    if (LAST_FM_AUTH.raw == undefined) LAST_FM_AUTH = undefined;
    else {
        let split = LAST_FM_AUTH.raw.split(':');
        if (split.length != 2) throw new Error("Invalid LAST_FM_AUTH format! expected \"{user_name}:{api_key}\"");
    
        LAST_FM_AUTH.user = split[0];
        LAST_FM_AUTH.api_key = split[1];
    }
    
    // Github auth
    GITHUB_AUTH.raw = process.env["GITHUB_AUTH"];
    if (GITHUB_AUTH.raw == undefined) GITHUB_AUTH = undefined;
    else GITHUB_AUTH.token = GITHUB_AUTH.raw;

    // Steam auth
    STEAM_AUTH.raw = process.env["STEAM_AUTH"];
    if (STEAM_AUTH.raw == undefined) STEAM_AUTH = undefined;
    else {
        let split = STEAM_AUTH.raw.split(':');
        if (split.length != 2) throw new Error("Invalid STEAM_AUTH format! expected \"{user_id}:{api_key}\"");

        STEAM_AUTH.user = split[0];
        STEAM_AUTH.api_key = split[1];
    }

    const README_FILE = path.resolve(process.env["README_PATH"] || "README.md");
    const README_CONTENT = await fs.readFile(README_FILE, "utf-8");

    const sections = extractSections(README_CONTENT);
    
    await processSections(
        sections,
        {
            wakatime: WAKATIME_AUTH,
            last_fm: LAST_FM_AUTH,
            github: GITHUB_AUTH,
            steam: STEAM_AUTH,
        }
    );

    const newPath = path.resolve(
        path.dirname(README_FILE),
        path.basename(README_FILE, ".md")
      //path.basename(README_FILE, ".md") + ".gen.md"
    );

    const NEW_README_CONTENT = glueContent(README_CONTENT, sections);
    await fs.writeFile(newPath, NEW_README_CONTENT, "utf-8");
}

async function processSections(sections, auth) {
    for (const key in sections) {
        let section = sections[key];

        let parts = key.split('.');

        switch (parts[0]) {
            case 'github': section.new_content = await github.process(parts.slice(1), section, auth.github); break;
            case 'wakatime': section.new_content = await wakatime.process(parts.slice(1), section, auth.wakatime); break;
            case 'last_fm': break;
            case 'steam': section.new_content = await steam.process(parts.slice(1), section, auth.steam); break;

            default:
                console.warn("Unknown service '" + parts[0] + "'. skipping.");
                break;
        }

    }
}

function glueContent(readme, sections) {
    let result = readme;

    const entries = Object.entries(sections)
        .filter(([_, sec]) => sec.new_content !== undefined)
        .map(([key, sec]) => ({
            key,
            start: sec.start,
            end: sec.end,
            templates: sec.templates,
            newContent: sec.new_content
        }))
        .sort((a, b) => b.start - a.start);

    for (const sec of entries) {
        result =
            result.slice(0, sec.start).trimEnd() + '\n' +
            sec.templates.map(t => "  " + t.raw.trimLeft() + '\n').join("") +
            sec.newContent +
            result.slice(sec.end);
    }

    return result;
}

function extractSections(text) {
    const SECTION_REGEX = /<!--\s*START_SECTION:\s*(.+?)\s*-->\s*([\s\S]*?)\s*<!--\s*END_SECTION\s*-->/g;

    const sections = {};
    let match;

    while ((match = SECTION_REGEX.exec(text)) !== null) {
        const name = match[1];

        const fullMatch = match[0];
        const startIndex = match.index;

        const startTagMatch = fullMatch.match(/<!--\s*START_SECTION:\s*.+?\s*-->\s*/);
        const endTagMatch = fullMatch.match(/\s*<!--\s*END_SECTION\s*-->/);

        const contentStart = startIndex + (startTagMatch ? startTagMatch[0].length : 0);
        const contentEnd = startIndex + fullMatch.length - (endTagMatch ? endTagMatch[0].length : 0);

        sections[name] = {
            start: contentStart,
            end: contentEnd,
            content: match[2],
            templates: extractTemplates(match[2]),
        };
    }

    return sections;
}

function extractTemplates(sectionText) {
    const TEMPLATE_REGEX = /<!--\s*TEMPLATE\s*([\s\S]*?)-->/g;

    const templates = [];
    let match;

    while ((match = TEMPLATE_REGEX.exec(sectionText)) !== null) {
        templates.push({
            raw: match[0], 
            content: match[1].trim(),
        });
    }

    return templates;
}

await main();
