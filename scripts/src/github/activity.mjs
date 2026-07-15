import { validateAuth } from "./common.mjs";

export async function activity(section, github_auth) {
    const [username, token] = validateAuth(github_auth);

    console.log("[GitHub Service] Requesting github's contribution data...");
    const data = (await get_contributions(token, username)).slice(0, 10);
    console.log("[GitHub Service] Processing github's contribution data...");

    // const activity = [
    //     ...commits,
    //     ...pullRequests,
    //     ...issues,
    //     ...reviews
    // ].sort((a, b) => new Date(b.date) - new Date(a.date));

    let content = [];

    const emojis = {
        commit: '✏️',
        opened_pr: '↗️',
        closed_pr: '❌',
        merged_pr: '🎉',
        opened_issue: '‼️',
        closed_issue: '✅',
        review: '👁️‍🗨️'
    };

    for (let i = 0; i < data.length; i++) {
        const e = data[i];
        
        switch (e.type) {
            case "commit": {
                content.push(`- ${emojis.commit} Made ${e.commits.length} `
                    +`${e.commits.length == 1 ? 'commit' : 'commits'}`);
            } break;

            case "pull_request": {
                switch (e.pullRequest.state) {
                    case 'OPEN':
                        content.push(`- ${emojis.opened_pr} Openned pull request `
                        + `[#${e.pullRequest.number}](${e.pullRequest.url}) `
                        + `in [${e.pullRequest.repository.nameWithOwner}](${e.pullRequest.repository.url})`);
                    break;

                    case 'CLOSED':
                        content.push(`- ${emojis.closed_pr} Closed pull request `
                        + `[#${e.pullRequest.number}](${e.pullRequest.url}) `
                        + `in [${e.pullRequest.repository.nameWithOwner}](${e.pullRequest.repository.url})`);
                    break;

                    case 'MERGED':
                        content.push(`- ${emojis.merged_pr} Merged pull request `
                        + `[#${e.pullRequest.number}](${e.pullRequest.url}) `
                        + `in [${e.pullRequest.repository.nameWithOwner}](${e.pullRequest.repository.url})`);
                    break;

                    default: console.warn(`Unknown pr state "${e.pullRequest.state}"`); break;
                }
            } break;

            case "issue": {
                switch (e.issue.state) {
                    case 'OPEN':
                        content.push(`- ${emojis.opened_issue} Opened pull request `
                        + `[#${e.issue.number}](${e.issue.url}) `
                        + `in [${e.issue.repository.nameWithOwner}](${e.issue.repository.url})`);
                    break;

                    case 'CLOSED':
                        content.push(`- ${emojis.closed_issue} Closed pull request `
                        + `[#${e.issue.number}](${e.issue.url}) `
                        + `in [${e.issue.repository.nameWithOwner}](${e.issue.repository.url})`);
                    break;

                    default: console.warn(`Unknown issue state "${e.issue.state}"`); break;
                }
            } break;

            default: console.warn(`Unknown github contribution type "${e.type}"`); break;
        }
    }

    return content.join('\n');
}

async function get_contributions(token, username) {
    
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
        user(login: "${username}") {
            contributionsCollection {
            ${commits}
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

    const cc = data.data.user.contributionsCollection;

    const commitsResponse = cc.commitContributionsByRepository.flatMap(repo =>
        repo.contributions.nodes.map(commit => ({
            type: "commit",
            date: commit.occurredAt,
            repository: repo.repository.nameWithOwner,
            ...commit,
        }))
    );

    const dailyCommits = new Map();

    for (const commit of commitsResponse) {
        const week = getWeek(commit.date);

        if (!dailyCommits.has(week)) {
            dailyCommits.set(week, {
                type: "commit",
                date: week,
                count: 1,
                commits: [commit],
            });
        } else {
            const entry = dailyCommits.get(week);
            entry.count++;
            entry.commits.push(commit);
        }
    }

    const contributions = [
        ...dailyCommits.values(),

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

function getWeek(date) {
    const d = new Date(date);

    d.setHours(0, 0, 0, 0);
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setDate(d.getDate() + diff);

    return d.toISOString().slice(0, 10);
}
