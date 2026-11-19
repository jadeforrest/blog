/**
 * Spotify podcast embed URLs, for the SpotifyEpisode component and the Kit email converter.
 *
 * Posts carry embed URLs in three historical shapes:
 *   https://podcasters.spotify.com/pod/show/<show>/embed/episodes/<slug>[/a-<id>]
 *   https://creators.spotify.com/pod/{show,profile}/<show>/embed/episodes/<slug>[/a-<id>]
 *   https://open.spotify.com/embed/episode/<id>[/video][?utm_source=...]
 * The first two redirect (301 then 302) to creators.spotify.com/pod/profile/..., so the embed
 * URL is normalised to that final form to save the iframe two round trips.
 */

const CREATORS = /^https:\/\/(?:podcasters|creators)\.spotify\.com\/pod\/(?:show|profile)\/([\w-]+)\/embed\/episodes\/([\w-]+?)(\/a-[a-z0-9]+)?\/?$/;
const OPEN = /^https:\/\/open\.spotify\.com\/embed\/episode\/([A-Za-z0-9]+)(\/video)?\/?(?:\?.*)?$/;

/** Anchor slug "9--Jade-Rubick-on-x--and-y-e2m49sf" -> "#9 Jade Rubick on x, and y" (or null). */
export function slugTitle(slug) {
  const m = slug.match(/^(\d+)-+(.+)-e[a-z0-9]{5,7}$/);
  if (!m) return null;
  return `#${m[1]} ${m[2].replace(/--/g, ", ").replace(/-/g, " ")}`;
}

/**
 * Parse an embed URL into { embedUrl, pageUrl, title }, or null when it isn't a Spotify episode
 * embed. `title` is null when the URL carries no readable slug (open.spotify.com IDs).
 */
export function parseSpotifyEmbed(src) {
  const c = CREATORS.exec(src);
  if (c) {
    const [, show, slug, audio = ""] = c;
    const base = `https://creators.spotify.com/pod/profile/${show}`;
    return {
      embedUrl: `${base}/embed/episodes/${slug}${audio}`,
      pageUrl: `${base}/episodes/${slug}`,
      title: slugTitle(slug),
    };
  }
  const o = OPEN.exec(src);
  if (o) {
    const [, id, video = ""] = o;
    return {
      embedUrl: `https://open.spotify.com/embed/episode/${id}${video}`,
      pageUrl: `https://open.spotify.com/episode/${id}`,
      title: null,
    };
  }
  return null;
}

/** Visible text of the fallback link, also used as the iframe's accessible title. */
export function episodeLabel({ title }, override) {
  const name = override || title;
  return name ? `Listen on Spotify: ${name}` : "Listen to this episode on Spotify";
}

/**
 * Rewrite one `<SpotifyEpisode src="..." [title="..."] />` tag as a Markdown link paragraph,
 * for outputs that can't run the player (email). An unparseable tag becomes "".
 */
export function spotifyEpisodeToMarkdown(tag) {
  const attr = (name) => (tag.match(new RegExp(`\\b${name}="([^"]*)"`)) || [])[1];
  const episode = parseSpotifyEmbed(attr("src") || "");
  if (!episode) return "";
  const label = episodeLabel(episode, attr("title")).replace(/[[\]]/g, "");
  return `[${label}](${episode.pageUrl})`;
}
