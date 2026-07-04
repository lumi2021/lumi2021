import { validateAuth } from "./common.mjs";
import { activity } from "./activity.mjs";

async function process(service, section) {
    switch (service[0]) {
        case 'activity': return activity(section); break;

        default:
            console.warn(`Unknown service 'github.${service[0]}'. skipping.`);
        break;
    }
}

export default {
    process: process,
}
