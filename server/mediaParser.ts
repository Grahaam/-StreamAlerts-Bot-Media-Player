import { getLinkPreview } from "link-preview-js";
import youtubedl from "youtube-dl-exec";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export function parseMediaUrl(url: string): { type: "image" | "video" | "iframe" | "link"; mediaUrl: string; provider?: string } {
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
    return { type: "iframe", mediaUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&controls=1&modestbranding=1&rel=0`, provider: "youtube" };
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

export async function resolveMediaFromLink(url: string): Promise<{ type: "image" | "video" | "iframe" | "link"; mediaUrl: string; title?: string; duration?: number; provider?: string; ytDlpError?: string }> {
  const lowercaseUrl = url.toLowerCase();

  const cookiesPath = path.join(process.cwd(), "cookies.txt");
  const hasCookies = fs.existsSync(cookiesPath);

  let outputYtError: string | undefined = undefined;

  if (
    lowercaseUrl.includes("tiktok.com") || 
    (lowercaseUrl.includes("instagram.com") && hasCookies) ||
    lowercaseUrl.includes("twitter.com") ||
    lowercaseUrl.includes("x.com")
  ) {
    try {
      console.log(`[yt-dlp] Attempting to extract and cache video from: ${url}`);
      
      const cacheDir = path.join(process.cwd(), "media_cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      
      const hash = crypto.createHash("md5").update(url).digest("hex");
      const filename = `${hash}.mp4`;
      const filepath = path.join(cacheDir, filename);

      const dlOptions: any = {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        format: "best[ext=mp4]/best",
      };

      if (hasCookies) {
        dlOptions.cookies = cookiesPath;
      }

      const info: any = await youtubedl(url, dlOptions);

      if (info && info.url) {
        if (!fs.existsSync(filepath)) {
          const downloadOpts = { ...dlOptions };
          delete downloadOpts.dumpSingleJson;
          downloadOpts.output = filepath;
          downloadOpts.format = "best[ext=mp4]/best"; // Force mp4
          console.log(`[yt-dlp] Downloading video to cache: ${filepath}`);
          try {
            await youtubedl(url, downloadOpts);
            console.log(`[yt-dlp] Download complete: ${filename}`);
          } catch (dlErr: any) {
            console.error(`[yt-dlp] Download error:`, dlErr.message);
            fs.appendFileSync(path.join(process.cwd(), "proxy-debug.log"), `\n[yt-dlp] Download error: ${dlErr.message}\n`);
            throw dlErr;
          }
        } else {
          console.log(`[yt-dlp] Video already in cache: ${filename}`);
        }

        if (fs.existsSync(filepath)) {
          const localUrl = `/api/media-cache/${filename}`;
          return { type: "video", mediaUrl: localUrl, title: info.title || "Video", duration: info.duration ? info.duration * 1000 : undefined };
        }
      }
    } catch (err: any) {
      console.warn("⚠️ yt-dlp extraction/download failed:", err.message);
      outputYtError = err.message || "yt-dlp default fallback error";
    }
  }

  const quick = parseMediaUrl(url);
  if (quick.type === "iframe") {
    return { ...quick, title: "", ytDlpError: outputYtError };
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
        return { type: "image", mediaUrl: preview.url || url, title: preview.title || "", ytDlpError: outputYtError };
      }
      if (contentType.startsWith("video/") || mediaType === "video" || mediaType === "video.other") {
        const rawUrl = preview.url || url;
        return { type: "video", mediaUrl: `/api/proxy-media?url=${encodeURIComponent(rawUrl)}`, title: preview.title || "", ytDlpError: outputYtError };
      }

      if (preview.images && preview.images.length > 0) {
        return { type: "image", mediaUrl: preview.images[0], title: preview.title || "", ytDlpError: outputYtError };
      }

      if (preview.videos && preview.videos.length > 0) {
        const videoSrc = preview.videos[0].url || preview.videos[0];
        if (typeof videoSrc === "string") {
          return { type: "video", mediaUrl: `/api/proxy-media?url=${encodeURIComponent(videoSrc)}`, title: preview.title || "", ytDlpError: outputYtError };
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ link-preview-js retrieval timed out:", url);
  }

  return { ...quick, title: "", ytDlpError: outputYtError };
}
