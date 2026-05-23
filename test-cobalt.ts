import fetch from "node-fetch";
const url = "https://www.tiktok.com/@tiktok/video/7106594312292453675";
fetch("https://api.cobalt.tools/api/json", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Accept": "application/json" },
  body: JSON.stringify({ url })
}).then(r => r.json()).then(console.log).catch(console.error);
