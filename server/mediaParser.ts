import { getLinkPreview } from "link-preview-js";

export function parseMediaUrl(url: string): { type: "image" | "video" | "react-player" | "iframe" | "link"; mediaUrl: string; provider?: string } {
  const lowercaseUrl = url.toLowerCase();

  if (/\.(jpg|jpeg|gif|png|webp|bmp)(\?.*)?$/i.test(lowercaseUrl)) {
    return { type: "image", mediaUrl: url };
  }

  if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(lowercaseUrl)) {
    return { type: "video", mediaUrl: url };
  }

  const ytRegex = /(?:youtube(?:-nocookie|-education)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|watch\?v=|shorts\/)|youtu\.be\/)([^"&?\s]{11})/i;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return { type: "react-player", mediaUrl: `https://www.youtube.com/watch?v=${ytMatch[1]}`, provider: "youtube" };
  }

  const ttRegex = /tiktok\.com\/@[^\/]+\/video\/(\d+)/i;
  const ttMatch = url.match(ttRegex);
  if (ttMatch && ttMatch[1]) {
    return { type: "iframe", mediaUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`, provider: "tiktok" };
  } else if (lowercaseUrl.includes("tiktok.com")) {
    return { type: "link", mediaUrl: url, provider: "tiktok" };
  }

  const igRegex = /instagram\.com\/(?:p|reels|reel)\/([a-zA-Z0-9_-]+)/i;
  const igMatch = url.match(igRegex);
  if (igMatch && igMatch[1]) {
    return { type: "iframe", mediaUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`, provider: "instagram" };
  } else if (lowercaseUrl.includes("instagram.com")) {
    return { type: "link", mediaUrl: url, provider: "instagram" };
  }

  const twitchClipRegex = /(?:clips\.twitch\.tv\/|twitch\.tv\/\w+\/clip\/)([a-zA-Z0-9_-]+)/i;
  const clipMatch = url.match(twitchClipRegex);
  if (clipMatch && clipMatch[1]) {
    return { type: "iframe", mediaUrl: `https://clips.twitch.tv/embed?clip=${clipMatch[1]}`, provider: "twitch" };
  }

  let providerDefault = "general";
  if (lowercaseUrl.includes("twitter.com") || lowercaseUrl.includes("x.com")) providerDefault = "twitter";
  if (lowercaseUrl.includes("twitch.tv")) providerDefault = "twitch";
  if (lowercaseUrl.includes("facebook.com")) providerDefault = "facebook";

  return { type: "link", mediaUrl: url, provider: providerDefault };
}

export async function resolveMediaFromLink(url: string): Promise<{ type: "image" | "video" | "react-player" | "iframe" | "link"; mediaUrl: string; title?: string }> {
  if (url.toLowerCase().includes("tiktok.com")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch(`https://tikwm.com/api/?url=${url}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      const json = await resp.json();
      if (json && json.data && json.data.play) {
        return { type: "video", mediaUrl: json.data.play, title: json.data.title || "TikTok Video" };
      }
    } catch (err) {
      console.warn("⚠️ tikwm TikTok API timeout/failure, dropping to fallback.");
    }
  }

  const quick = parseMediaUrl(url);
  if (quick.type === "react-player" || quick.type === "iframe") {
    return { ...quick, title: "" };
  }

  try {
    const preview = await getLinkPreview(url, {
      timeout: 3000,
      followRedirects: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
      }
    }) as any;

    if (preview) {
      const contentType = (preview.contentType || "").toLowerCase();
      const mediaType = (preview.mediaType || "").toLowerCase();

      if (contentType.startsWith("image/") || mediaType === "image" || mediaType === "image.generic") {
        return { type: "image", mediaUrl: preview.url || url, title: preview.title || "" };
      }
      if (contentType.startsWith("video/") || mediaType === "video" || mediaType === "video.other") {
        return { type: "video", mediaUrl: preview.url || url, title: preview.title || "" };
      }

      if (preview.images && preview.images.length > 0) {
        return { type: "image", mediaUrl: preview.images[0], title: preview.title || "" };
      }

      if (preview.videos && preview.videos.length > 0) {
        const videoSrc = preview.videos[0].url || preview.videos[0];
        if (typeof videoSrc === "string") {
          return { type: "video", mediaUrl: videoSrc, title: preview.title || "" };
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ link-preview-js retrieval timed out:", url);
  }

  return { ...quick, title: "" };
}
