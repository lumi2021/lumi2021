import { validateAuth } from "./common.mjs";
import { weeklyLangs } from "./weekly_langs.mjs";

async function process(service, section, wakatime_auth) {
    switch (service[0]) {
        case 'weekly_langs': return weeklyLangs(section, wakatime_auth); break;

        default:
            console.warn("Unknown service 'wakatime." + service[0] + "'. skipping.");
            break;
    }
}

export default {
    process: process,
}
