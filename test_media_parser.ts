import { resolveMediaFromLink } from "./server/mediaParser.js";

async function run() {
  const media = await resolveMediaFromLink("https://www.instagram.com/reel/DE-b6gQO4Qp/");
  console.log(media);
}

run();
