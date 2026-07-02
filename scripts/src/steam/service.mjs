import { perfectedGamesService } from "./perfected_games.mjs";
import { profileService } from "./profile.mjs";
import { recentGamesService } from "./recent_games.mjs";


async function process(service, section, steam_auth) {
    switch (service[0]) {
        case 'profile': return profileService(section, steam_auth); break;
        case 'recent_games': return recentGamesService(section, steam_auth); break;
        case 'perfected_games': return perfectedGamesService(section, steam_auth); break;

        default:
            console.warn("Unknown service 'steam." + service[0] + "'. skipping.");
            break;
    }
}

export default {
    process: process,
}
