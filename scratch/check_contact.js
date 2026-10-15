const http = require('http');

['en', 'fr', 'ar'].forEach(lang => {
  const path = (lang === 'en' ? '' : '/' + lang) + '/pages/contact';
  http.get('http://127.0.0.1:9292' + path, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('=== ' + lang.toUpperCase() + ' CONTACT PAGE ===');
      const start = data.indexOf('m-contact-form');
      if (start !== -1) {
        console.log(data.slice(start, start + 1200));
      }
    });
  });
});
