export function getConsumptionMode() {
    return process.env["PROCESS_CONSUPTION"] || 'MEDIUM';
}

export function validateAuth() {
    const wakatime_api_key = process.env["WAKATIME_API_KEY"];

    let errors = [];

    if (wakatime_api_key == undefined) {
        errors.push("No wakatime API key found!\n"
                  + "Please define it as an WAKATIME_API_KEY "
                  + "environment variable");
        hasError = true;
    }
    if (errors.length > 0) throw new Error(errors.join("\n"));
    
    return [wakatime_api_key];
}
