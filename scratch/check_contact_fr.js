const http = require('http');

http.get('http://127.0.0.1:9292/fr/pages/contact', res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const titles = data.match(/<h3 class="m-info-box__title[^>]*>[\s\S]*?<\/h3>/gi) || [];
    console.log('Titles:', titles.map(t => t.replace(/<[^>]+>/g, '').trim()));
    const buttons = data.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
    console.log('Buttons:', buttons.map(b => b.replace(/<[^>]+>/g, '').trim()));
  });
});
