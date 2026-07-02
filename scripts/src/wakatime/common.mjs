export function validateAuth(waka_auth) {
    if (waka_auth == undefined) {
        throw new Error(
            "No wakatime API key found!\n"
            + "Please define an WAKATIME_AUTH environment variable with "
            + "the format \"{wakatime_api_key}\""
        );
    }

    return waka_auth.api_key;
}
