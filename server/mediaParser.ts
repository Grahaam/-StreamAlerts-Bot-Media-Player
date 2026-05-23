import { extract } from "@extractus/oembed-extractor";
import { getLinkPreview } from "link-preview-js";

// Professional tools use specific headers to avoid being blocked by social platforms
const BROWSER_HEADERS = {
	"user-agent":
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
	accept:
		"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
};

/**
 * Standardizes URL parsing using provider-specific regex patterns
 * similar to those used in major open-source media player libraries.
 */
export function parseMediaUrl(url: string): {
	type: "image" | "video" | "react-player" | "iframe" | "link";
	mediaUrl: string;
	provider?: string;
} {
	const lowercaseUrl = url.toLowerCase();

	// 1. Direct Static Assets
	if (/\.(jpg|jpeg|gif|png|webp|bmp)(\?.*)?$/i.test(lowercaseUrl)) {
		return { type: "image", mediaUrl: url };
	}
	if (/\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(lowercaseUrl)) {
		return { type: "video", mediaUrl: url };
	}

	// 2. YouTube & Shorts (Handled best by ReactPlayer)
	const ytRegex =
		/(?:youtube(?:-nocookie|-education)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|watch\?v=|shorts\/)|youtu\.be\/)([^"&?\s]{11})/i;
	const ytMatch = url.match(ytRegex);
	if (ytMatch?.[1]) {
		return {
			type: "react-player",
			mediaUrl: `https://www.youtube.com/watch?v=${ytMatch[1]}`,
			provider: "youtube",
		};
	}

	// 3. TikTok - Standard Embed Path
	const ttRegex = /tiktok\.com\/@[^\/]+\/video\/(\d+)/i;
	const ttMatch = url.match(ttRegex);
	if (ttMatch?.[1]) {
		return {
			type: "iframe",
			mediaUrl: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
			provider: "tiktok",
		};
	}

	// 4. Instagram (Posts & Reels) - Standard Embed Path
	const igRegex = /instagram\.com\/(?:p|reels|reel)\/([a-zA-Z0-9_-]+)/i;
	const igMatch = url.match(igRegex);
	if (igMatch?.[1]) {
		const isReel =
			lowercaseUrl.includes("/reel/") || lowercaseUrl.includes("/reels/");
		return {
			type: "iframe",
			mediaUrl: `https://www.instagram.com/${isReel ? "reel" : "p"}/${igMatch[1]}/embed`,
			provider: "instagram",
		};
	}

	// 5. Twitch Clips
	const twitchClipRegex =
		/(?:clips\.twitch\.tv\/|twitch\.tv\/\w+\/clip\/)([a-zA-Z0-9_-]+)/i;
	const clipMatch = url.match(twitchClipRegex);
	if (clipMatch?.[1]) {
		return {
			type: "iframe",
			mediaUrl: `https://clips.twitch.tv/embed?clip=${clipMatch[1]}`,
			provider: "twitch",
		};
	}

	// Generic Link
	let provider = "link";
	if (lowercaseUrl.includes("twitter.com") || lowercaseUrl.includes("x.com"))
		provider = "twitter";
	if (lowercaseUrl.includes("facebook.com")) provider = "facebook";

	return { type: "link", mediaUrl: url, provider };
}

/**
 * Resolves media metadata using OEmbed (standard) with fallbacks.
 * This mimics the logic used by Streamlabs and other major alert tools.
 */
export async function resolveMediaFromLink(url: string): Promise<{
	type: "image" | "video" | "react-player" | "iframe" | "link";
	mediaUrl: string;
	title?: string;
	duration?: number;
	provider?: string;
}> {
	// First, do a quick parse for known patterns
	const quick = parseMediaUrl(url);

	// If it's a direct image or video, return immediately
	if (quick.type === "image" || quick.type === "video") {
		return { ...quick, title: "" };
	}

	// If it's a known embed provider (YT, IG, TT), try to get rich metadata but keep the embed URL
	try {
		const oembed = (await extract(url, undefined, {
			headers: BROWSER_HEADERS,
		})) as any;
		if (oembed) {
			// If it's YouTube, we prefer ReactPlayer for better control
			if (oembed.provider_name?.toLowerCase() === "youtube") {
				return {
					type: "react-player",
					mediaUrl: url,
					provider: "youtube",
					title: oembed.title || "",
				};
			}

			// For others, if we have an iframe in the oembed response, extract the src
			const iframeMatch = oembed.html?.match(
				/<iframe[^>]+src=["']([^"']+)["']/i,
			);
			if (iframeMatch?.[1]) {
				let mediaUrl = iframeMatch[1];
				// Add autoplay/mute hints for common providers if not present
				if (
					mediaUrl.includes("instagram.com") &&
					!mediaUrl.includes("autoplay")
				) {
					mediaUrl +=
						(mediaUrl.includes("?") ? "&" : "?") + "autoplay=true&muted=1";
				}
				return {
					type: "iframe",
					mediaUrl,
					provider: oembed.provider_name?.toLowerCase() || quick.provider,
					title: oembed.title || "",
					duration: oembed.duration ? oembed.duration * 1000 : undefined,
				};
			}

			// Special case for TikTok oembed which doesn't always use an iframe in the response
			if (oembed.provider_name?.toLowerCase() === "tiktok" && quick.mediaUrl) {
				return {
					type: "iframe",
					mediaUrl: quick.mediaUrl,
					provider: "tiktok",
					title: oembed.title || "",
				};
			}
		}
	} catch (err) {
		// Log OEmbed failure but continue to fallback
		console.log(`ℹ️ OEmbed extraction skipped or failed for ${url}`);
	}

	// Fallback 1: Instagram/TikTok specific patterns (most reliable for these)
	if (quick.provider === "instagram" || quick.provider === "tiktok") {
		let finalUrl = quick.mediaUrl;
		if (quick.provider === "instagram" && !finalUrl.includes("autoplay")) {
			finalUrl +=
				(finalUrl.includes("?") ? "&" : "?") + "autoplay=true&muted=1";
		}
		return { ...quick, mediaUrl: finalUrl, title: "" };
	}

	// Fallback 2: Link Preview (Scraping)
	try {
		const preview = (await getLinkPreview(url, {
			timeout: 4000,
			headers: BROWSER_HEADERS,
			followRedirects: "follow",
		})) as any;

		if (preview) {
			if (
				preview.mediaType === "video" ||
				preview.contentType?.startsWith("video/")
			) {
				return {
					type: "video",
					mediaUrl: preview.videos?.[0]?.url || preview.url || url,
					title: preview.title || "",
				};
			}
			if (
				preview.mediaType === "image" ||
				preview.contentType?.startsWith("image/")
			) {
				return {
					type: "image",
					mediaUrl: preview.images?.[0] || preview.url || url,
					title: preview.title || "",
				};
			}
		}
	} catch (err) {
		console.log(`ℹ️ Link preview fallback timed out for ${url}`);
	}

	// Final fallback: Return the quick parse result or original URL as a link
	return { ...quick, title: "" };
}
