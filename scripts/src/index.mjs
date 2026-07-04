import steam from "./steam/service.mjs";
import github from "./github/service.mjs";
import wakatime from "./wakatime/service.mjs";

import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "path";


async function main() {
    const README_INPUT_FILE = path.resolve(process.env["README_IN_PATH"] || "README.template.md");
    const README_OUTPUT_FILE = path.resolve(process.env["README_OUT_PATH"] || "README.md");
    const README_CONTENT = await fs.readFile(README_INPUT_FILE, "utf-8");

    const sections = extractSections(README_CONTENT);
    
    await processSections(sections);

    const newPath = path.resolve(README_OUTPUT_FILE);

    const NEW_README_CONTENT = glueContent(README_CONTENT, sections);
    await fs.writeFile(newPath, NEW_README_CONTENT, "utf-8");

    gitPush(newPath);
}

async function processSections(sections, auth) {
    for (const key in sections) {
        let section = sections[key];

        let parts = key.split('.');

        try {
            switch (parts[0]) {
                case 'github': section.new_content = await github.process(parts.slice(1), section); break;
                case 'wakatime': section.new_content = await wakatime.process(parts.slice(1), section); break;
                case 'last_fm': break;
                case 'steam': section.new_content = await steam.process(parts.slice(1), section); break;

                default:
                    console.warn(`Unknown service '${parts[0]}'. skipping.`);
                break;
            }
        }
        catch (err) { console.error(err); }

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

function gitPush(out_path) {
    execSync('git config user.name "github-actions[bot]"');
    execSync('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');

    execSync(`git add ${out_path}`);
    const hasChanges = execSync("git diff --cached --quiet || echo changed").toString().trim();

    if (hasChanges === "changed") {
        execSync('git commit -m "chore: update README"', { stdio: "inherit" });
        execSync("git push", { stdio: "inherit" });
        console.log("Pushed changes.");
    } else {
        console.log("Nothing to commit.");
    }
}

await main();
