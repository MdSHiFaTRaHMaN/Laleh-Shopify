async function test() {
  const res = await fetch('https://www.mylaleh.com');
  const html = await res.text();
  const match = html.match(/market_countries:\s*\{([\s\S]*?)\n\s*\},/);
  if (match) {
    console.log('Snippet of market_countries:');
    console.log(match[1].substring(0, 500));
  }
}
test().catch(console.error);

