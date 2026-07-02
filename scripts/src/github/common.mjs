export function validateAuth(github_auth) {
    if (github_auth == undefined) {
        throw new Error(
            "No github API key found!\n"
            + "Please define an GITHUB_AUTH environment variable with "
            + "the format \"{github_api}\""
        );
    }

    return github_auth.token;
}
