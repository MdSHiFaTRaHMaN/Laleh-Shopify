async function getVermeilFr() {
  const url = 'https://www.mylaleh.com/fr/products/vermeil';
  try {
    const res = await fetch(url);
    const html = await res.text();
    const idx = html.indexOf('corsage');
    if (idx !== -1) {
      console.log('FOUND corsage in HTML:');
      console.log(html.substring(idx - 100, idx + 150));
    } else {
      console.log('corsage not found in HTML, searching for Vermeil description:');
      const m = html.match(/class="m-luxury-accordion-content rte"[\s\S]*?<\/div>/g);
      if (m) {
        m.forEach((t, i) => console.log('ACCORDION', i, t));
      }
    }
  } catch(e) {
    console.error(e);
  }
}

getVermeilFr();
