import { table } from "node:console";
import { getConsumptionMode } from "../last_fm/common.mjs";
import fs from "node:fs/promises";
import path from "node:path";


let lastFmPromise = null;


async function fetchLastFmTopTracks(username, apiKey) {
    if (lastFmPromise) return lastFmPromise;

    const url = new URL("https://ws.audioscrobbler.com/2.0/");
    url.searchParams.set("method", "user.gettoptracks");
    url.searchParams.set("user", username);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "5");

    lastFmPromise = (async () => {
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const res = await fetch(url);
                if ([500, 502, 503, 504].includes(res.status)) {
                    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
                    continue;
                }
                
                const data = await res.json();
                if (data.error) {
                    throw new Error(`Last.fm error ${data.error}: ${data.message}`);
                }
                
                return data.toptracks?.track ?? [];
            } catch (err) {
                if (attempt === 4) throw err;
            }
        }
    })();

    return lastFmPromise;
}


function validateLastFmAuth() {
    const api_key = process.env["LAST_FM_API_KEY"];
    const username = process.env["LAST_FM_USERNAME"];

    if (!api_key) throw new Error("LAST_FM_API_KEY environment variable not found.");
    if (!username) throw new Error("LAST_FM_USERNAME environment variable not found.");

    return [username, api_key];
}


async function lastFmTracksService(section) {
    const mode = getConsumptionMode();
    if (mode !== 'HIGH') {
        console.warn(`Skipped lastfm.top_tracks in ${mode} consumption mode`);
        return section.content;
    }

    const [USER, API_KEY] = validateLastFmAuth();

    console.log("Loading Last.fm top tracks...");
    let tracks = await fetchLastFmTopTracks(USER, API_KEY);

    console.log("Loading tracks' cover images...");
    tracks = await Promise.all(
        tracks.map(async (track) => {
            const artistName = track.artist?.name ?? "";
            const trackName = track.name ?? "";
            
            let coverUrl = "";
            let itunesDurationSec = 0;

            try {
                const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(artistName + " " + trackName)}&entity=song&limit=1`;
                const itunesRes = await fetch(searchUrl).then(res => res.json());
                const result = itunesRes?.results?.[0];

                if (result) {
                    coverUrl = result.artworkUrl60 ?? "";
                    itunesDurationSec = Math.floor((result.trackTimeMillis ?? 0) / 1000);
                }
            } catch {}

            return { 
                ...track, 
                itunesCover: coverUrl,
                itunesDuration: itunesDurationSec 
            };
        })
    );

    const content = [];

    tracks.forEach((track, index) => {
        const artist = track.artist;
        
        const artist_name = artist.name;
        const track_name = track.name;
        const artist_url = artist.url ?? "";
        const track_url = track.url ?? "";
        
        const coverUrl = track.itunesCover ?? track.image?.[1]?.["#text"] ?? "";

        const durationSec = parseInt(track.itunesDuration, 10) || 0;
        let duration = "—";
        if (durationSec > 0) {
            const minutes = Math.floor(durationSec / 60);
            const seconds = String(durationSec % 60).padStart(2, "0");
            duration = `${minutes}:${seconds}`;
        }

        const listenedTimes = track.playcount ?? "0";

        const trackHLink = `<a href="${track_url}">${track_name}</a>`;
        const artistHLink = `<a href="${artist_url}">${artist_name}</a>`;

        content.push('<p>');
        content.push(`    <img src="${coverUrl}" width="75" align="left"/>`);
        content.push(`    <p><strong>${trackHLink}</strong> - ${artistHLink}</p>`);
        content.push(`    <p>${duration}</p>`);
        content.push('</p>');
    });

    content.push("");
    return content.join("\n");
}

export default {
    process: lastFmTracksService,
}
