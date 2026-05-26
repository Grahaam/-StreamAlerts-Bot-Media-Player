async function test() {
  const result = await fetch("http://localhost:3000/api/trigger-test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authorName: "Test User",
      text: "Testing instagram embed",
      type: "link",
      mediaUrl: "https://www.instagram.com/reel/DE-b6gQO4Qp/",
      duration: 15000,
    })
  });
  console.log(await result.json());
}
test();
