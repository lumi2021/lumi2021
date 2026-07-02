import { validateAuth } from "./common.mjs";
import { activity } from "./activity.mjs";

async function process(service, section, github_auth) {
    switch (service[0]) {
        case 'activity': return activity(section, github_auth); break;

        default:
            console.warn("Unknown service 'github." + service[0] + "'. skipping.");
            break;
    }
}

export default {
    process: process,
}
