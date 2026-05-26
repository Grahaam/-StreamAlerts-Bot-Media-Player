async function test() {
  const res = await fetch("https://www.instagram.com/p/DE-b6gQO4Qp/embed/");
  console.log(res.status, res.headers.get("x-frame-options"));
}
test();
