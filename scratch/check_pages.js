const http = require('http');

async function check(path) {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:9292' + path, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        const match = data.match(/<div class="m-page-content rte[^>]*>([\s\S]*?)<\/div>/i);
        resolve({ path, content: match ? match[1].trim() : 'NOT FOUND' });
      });
    }).on('error', (err) => resolve({ path, error: err.message }));
  });
}

async function run() {
  for (const p of ['/pages/returns-exchanges', '/fr/pages/returns-exchanges', '/ar/pages/returns-exchanges']) {
    const res = await check(p);
    console.log(`\n=================== ${res.path} ===================`);
    console.log(res.content);
  }
}

run();
