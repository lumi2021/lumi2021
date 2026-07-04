export function validateAuth() {
    const github_user = process.env["GITHUB_USERNAME"];
    const github_api_key = process.env["GITHUB_API_KEY"];

    let errors = [];

    if (github_user == undefined) {
        errors.push("No github username found!\n"
                  + "Please define it as an GITHUB_USERNAME "
                  + "environment variable");
        hasError = true;
    }
    if (github_api_key == undefined) {
        errors.push("No github API key found!\n"
                  + "Please define an GITHUB_API_KEY "
                  + "environment variable");
        hasError = true;
    }
    if (errors.length > 0) throw new Error(errors.join("\n"));
    
    return [github_user, github_api_key];
}
