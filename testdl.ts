import { resolveMediaFromLink } from "./server/mediaParser.js";
import youtubedl from "youtube-dl-exec";

async function test() {
  const url = "https://www.tiktok.com/@pepe_fails/video/7620170003371003156";
  const info: any = await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    format: "best[ext=mp4]/best",
  });

  console.log("URL:", info.url);
  console.log("Headers:", info.http_headers);
}

test();
