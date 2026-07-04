import { validateAuth } from "./common.mjs";

export async function weeklyLangs(section) {
    const [token] = validateAuth();
    
    const response = await fetch(
        "https://wakatime.com/api/v1/users/current/stats/last_7_days",
        {
            headers: { Authorization: "Basic " + btoa(`${token}:`), },
        },
    );

    const data = (await response.json()).data;

    var content = [];
    content.push("```rust");

    content.push(`Total Time: ${data.human_readable_total}`);
    content.push("");

    const languages = data.languages;
    const levels = "⣿⣷⣶⣦⣤⣄⣀";

    for (let i = 0; i < 5 && i < languages.length; i++) {
        const e = languages[i];
        
        let line = "- ";
        const percent = Number(e.percent) / 100;

        line += ('"' + truncate(e.name, 13) + '"').padEnd(16);
        line += progressBar(percent, 20, levels) + " ";
        line += e.text;
        
        content.push(line);
    }

    content.push("```");
    return content.join('\n');
}

function truncate(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + "...";
}
function progressBar(percent, width, levels = "# ") {
    percent = Math.max(0, Math.min(1, percent));

    const maxLevel = levels.length - 1;
    let out = "";

    for (let i = 0; i < width; i++) {
        const cellStart = i / width;
        const cellEnd = (i + 1) / width;
        const fill = (percent - cellStart) / (cellEnd - cellStart);
        const clamped = Math.max(0, Math.min(1, fill));
        const levelIndex = Math.round((1 - clamped) * maxLevel);
        out += levels[levelIndex];
    }

    return out;
}