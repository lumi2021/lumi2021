import { validateAuth } from "./common.mjs";

export async function activity(section, github_auth) {
    const token = validateAuth(github_auth);

    console.log("Requesting github's contribution data...");
    const data = (await get_contributions(token)).slice(0, 10);
    console.log("Processing github's contribution data...");

    // const activity = [
    //     ...commits,
    //     ...pullRequests,
    //     ...issues,
    //     ...reviews
    // ].sort((a, b) => new Date(b.date) - new Date(a.date));

    let content = [];

    const emojis = {
        opened_pr: '↗️',
        merged_pr: '🎉',
        opened_issue: '‼️',
        closed_issue: '✅',
        review: '👁️‍🗨️'
    };

    for (let i = 0; i < data.length; i++) {
        const e = data[i];
        
        switch (e.type) {
            case "pull_request": {
                if (e.pullRequest.state == 'MERGED') {
                    content.push(`- ${emojis.merged_pr} Merged pull request `
                        + `[#${e.pullRequest.number}](${e.pullRequest.url}) `
                        + `in [${e.pullRequest.repository.nameWithOwner}](${e.pullRequest.repository.url})`);
                } else {
                    content.push(`- ${emojis.opened_pr} Openned pull request `
                        + `[#${e.pullRequest.number}](${e.pullRequest.url}) `
                        + `in [${e.pullRequest.repository.nameWithOwner}](${e.pullRequest.repository.url})`);
                }
            } break;

            case "issue": {
                if (e.issue.state == 'CLOSED') {
                    content.push(`- ${emojis.closed_issue} Closed pull request `
                        + `[#${e.issue.number}](${e.issue.url}) `
                        + `in [${e.issue.repository.nameWithOwner}](${e.issue.repository.url})`);
                } else {
                    content.push(`- ${emojis.opened_issue} Opened pull request `
                        + `[#${e.issue.number}](${e.issue.url}) `
                        + `in [${e.issue.repository.nameWithOwner}](${e.issue.repository.url})`);
                }
            } break;
        }
    }

    return content.join('\n');
}

async function get_contributions(token) {
    

    const commits = `
        commitContributionsByRepository {
            repository {
                nameWithOwner
                url
            }

            contributions(first: 25) {
                nodes {
                commitCount
                occurredAt
                }
            }
        }
    `;
    const pullRequests = `
        pullRequestContributions(first: 10) {
            nodes {
                occurredAt
                pullRequest {
                    number
                    title
                    url
                    state
                    repository {
                        name
                        nameWithOwner
                        url
                    }
                }
            }
        }
    `;
    const issues = `
        issueContributions(first: 10) {
            nodes {
                occurredAt
                issue {
                    number
                    title
                    url
                    state

                    repository {
                        name
                        nameWithOwner
                        url
                    }
                }
            }
        }
    `;
    const reviews = `
        pullRequestReviewContributions(first: 10) {
        nodes {
            pullRequestReview {
            state
            url
            }
        }
        }
    `;

    const query = `
        query {
        viewer {
            contributionsCollection {
            ${pullRequests}
            ${issues}
            ${reviews}
            }
        }
        }
    `;

    const response = await graphql_fetch(query, token);
    const data = (await response.json());
    if (data.errors) throw new Error(JSON.stringify(data.errors));

    const cc = data.data.viewer.contributionsCollection;

    const contributions = [
        // ...cc.commitContributionsByRepository
        // .flatMap(repo =>
        //     repo.contributions.nodes.map(commit => ({
        //     type: "commit",
        //     date: commit.occurredAt,
        //     repository: repo.repository.nameWithOwner,
        //     ...commit,
        //     }))
        // ),

        ...cc.pullRequestContributions.nodes.map(pr => ({
            type: "pull_request",
            date: pr.occurredAt,
            ...pr,
        })),

        ...cc.issueContributions.nodes.map(issue => ({
            type: "issue",
            date: issue.occurredAt,
            ...issue,
        })),

        ...cc.pullRequestReviewContributions.nodes.map(review => ({
            type: "review",
            date: review.occurredAt,
            ...review,
        })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    return contributions;
}

async function graphql_fetch(query, token) {
    return fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
    });
}
