const officialTitles = {
  'obsidian-touch': 'OBSIDIAN TOUCH',
  'structured-silence': 'STRUCTURED SILENCE',
  'vermeil': 'VERMEIL',
  'crimson-poise': 'CRIMSON POISE',
  'iris-pearl': 'IRIS PEARL',
  'lilac-verse': 'LILAC VERSE'
};

const productAttributes = {
  'obsidian-touch': {
    colors: ['black', 'dark', 'noir', 'noire', 'sombre', 'اسود', 'سوداء', 'سودا', 'داكن'],
    names: ['obsidian', 'touch', 'obsidienne', 'اوبسيديان', 'تاتش', 'لمسه', 'لمسة'],
    uniqueKeywords: ['cocktail', 'sleeveless', 'sans manches', 'بدون اكمام', 'بدون أكمام', 'كوكتيل']
  },
  'vermeil': {
    colors: ['green', 'pale green', 'sage', 'mint', 'emerald', 'pastel green', 'vert', 'verte', 'vert pale', 'sauge', 'menthe', 'emeraude', 'اخضر', 'خضراء', 'خضرا', 'ميرميه', 'ميرمية', 'نعناعي', 'زمرد', 'زمردي'],
    names: ['vermeil', 'فيرميل'],
    uniqueKeywords: ['tweed', 'تويد', 'flared cuffs', 'deux pieces', 'deux pièces', 'ensemble', 'قطعتين', 'أكمام واسعة', 'اكمام واسعة']
  },
  'crimson-poise': {
    colors: ['crimson', 'red', 'pink', 'rose', 'raspberry', 'cramoisi', 'rouge', 'rose', 'framboise', 'قرمزي', 'احمر', 'حمراء', 'حمرا', 'وردي', 'زهري'],
    names: ['crimson poise', 'crimson', 'poise', 'equilibre cramoisi', 'équilibre cramoisi', 'cramoisi', 'كرمسون بويز', 'كرمسون', 'بويز'],
    uniqueKeywords: ['peplum', 'بيبلوم', 'lace', 'dentelle', 'دانتيل', 'long sleeves', 'manches longues', 'أكمام طويلة', 'اكمام طويلة', 'party', 'fete', 'fête', 'حفلات']
  },
  'lilac-verse': {
    colors: ['lilac', 'lavender', 'purple', 'violet', 'soft purple', 'lilas', 'lavande', 'pourpre', 'ليلاك', 'لافندر', 'بنفسجي', 'ارجواني', 'أرجواني'],
    names: ['lilac verse', 'verse', 'vers lilas', 'ليلاك فيرس', 'فيرس'],
    uniqueKeywords: ['high collar', 'col montant', 'ياقة عالية', 'lace', 'dentelle', 'دانتيل', 'paisley', 'بيزلي', 'romantic', 'romantique', 'رومانسي']
  },
  'iris-pearl': {
    colors: ['pearl', 'pearls', 'mauve', 'soft mauve', 'sheen', 'perle', 'perles', 'بيرل', 'لؤلؤ', 'لؤلؤي', 'موف', 'موف ناعم'],
    names: ['iris pearl', 'iris', 'ايريس بيرل', 'ايريس'],
    uniqueKeywords: ['satin', 'ساتان', 'puffed sleeves', 'manches bouffantes', 'أكمام منفوخة', 'اكمام منفوخة']
  },
  'structured-silence': {
    colors: ['sand', 'beige', 'sand-beige', 'tan', 'cream', 'taupe', 'neutral', 'sable', 'creme', 'crème', 'neutre', 'رملي', 'بيج', 'كريمي'],
    names: ['structured silence', 'structured', 'silence', 'silence structure', 'silence structuré', 'structure', 'ستركتشر سايلنس', 'ستركتشر', 'سايلنس', 'صمت', 'منظم'],
    uniqueKeywords: ['suit', 'skirt', 'pencil skirt', 'sharp lapels', 'costume', 'tailleur', 'jupe', 'jupe crayon', 'revers pointus', 'طقم', 'بدلة', 'بدله', 'تنورة', 'تنوره', 'تنورة قلم', 'ياقة حادة']
  }
};

const genericDressTerms = [
  'dress', 'dresses', 'gown', 'gowns', 'midi', 'evening', 'luxury',
  'robe', 'robes', 'soiree', 'soirée', 'luxe',
  'فستان', 'فساتين', 'ثوب', 'ميدي', 'سهرة', 'فاخر',
  'laleh', 'لاليه', 'لاله', 'collection', 'women', 'femme', 'نساء', 'نسائي'
];

const typoMap = {
  // Dress typos
  'dross': 'dress',
  'dres': 'dress',
  'dresse': 'dress',
  'drss': 'dress',
  'drees': 'dress',
  'dresses': 'dresses',
  'gwon': 'gown',
  'robr': 'robe',
  'robee': 'robe',
  'فستن': 'فستان',
  'فستانن': 'فستان',
  // Color typos
  'blck': 'black',
  'balck': 'black',
  'blak': 'black',
  'blac': 'black',
  'gren': 'green',
  'geen': 'green',
  'pnk': 'pink',
  'pik': 'pink',
  'purpel': 'purple',
  'purp': 'purple',
  'lavendar': 'lavender',
  'beig': 'beige',
  'begie': 'beige',
  'mauv': 'mauve',
  'noie': 'noir',
  'noitr': 'noir',
  'vertte': 'verte',
  // Product typos
  'obsidien': 'obsidian',
  'obsidion': 'obsidian',
  'obsidan': 'obsidian',
  'crimsn': 'crimson',
  'vermil': 'vermeil',
  'peral': 'pearl'
};

function normalizeArabic(str) {
  return str
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤئ]/g, 'ء')
    .replace(/ة/g, 'ه');
}

function normalizeQuery(str) {
  if (!str) return '';
  let s = String(str).toLowerCase().trim();
  s = s.replace(/[«»"'`’‘.,;:!?#@$%^&*()_+=\-\[\]{}|\\/]/g, ' ');
  s = normalizeArabic(s);
  const rawTokens = s.split(/\s+/).filter(Boolean);
  const normalizedTokens = rawTokens.map(tok => typoMap[tok] || tok);
  return normalizedTokens.join(' ');
}

// Build pre-normalized lookup sets for attributes
const normalizedAttrCache = {};
for (const [handle, attrs] of Object.entries(productAttributes)) {
  const normColors = attrs.colors.map(c => normalizeArabic(c.toLowerCase()));
  const normNames = attrs.names.map(n => normalizeArabic(n.toLowerCase()));
  const normUniques = attrs.uniqueKeywords.map(u => normalizeArabic(u.toLowerCase()));
  normalizedAttrCache[handle] = {
    colors: normColors,
    names: normNames,
    uniqueKeywords: normUniques,
    allSpecific: [...normColors, ...normNames, ...normUniques]
  };
}

const normGenericDress = genericDressTerms.map(d => normalizeArabic(d.toLowerCase()));

function scoreAndFilterCatalog(query, catalogProducts) {
  const q = normalizeQuery(query);
  if (!q || q.length < 2) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  // Check if the query contains any specific qualifier belonging to any product
  const foundQualifiersByProduct = {};
  let totalQualifiersFound = 0;

  for (const [handle, attrs] of Object.entries(normalizedAttrCache)) {
    foundQualifiersByProduct[handle] = [];

    // Check multi-word phrase match (e.g. "pale green", "crimson poise", "obsidian touch")
    for (const spec of attrs.allSpecific) {
      if (spec.includes(' ') && q.includes(spec)) {
        foundQualifiersByProduct[handle].push({ term: spec, weight: 10000 });
        totalQualifiersFound++;
      }
    }

    // Check individual token matches
    for (const tok of tokens) {
      if (tok.length < 2) continue;
      // Is this token a generic dress term? Skip here
      if (normGenericDress.includes(tok)) continue;

      for (const spec of attrs.allSpecific) {
        if (spec === tok) {
          foundQualifiersByProduct[handle].push({ term: spec, weight: 8000 });
          totalQualifiersFound++;
          break;
        } else if (tok.length >= 4 && (spec.startsWith(tok) || tok.startsWith(spec))) {
          foundQualifiersByProduct[handle].push({ term: spec, weight: 4000 });
          totalQualifiersFound++;
          break;
        }
      }
    }
  }

  // Also check if official titles match
  for (const [handle, offTitle] of Object.entries(officialTitles)) {
    const normTitle = offTitle.toLowerCase();
    if (normTitle === q) {
      foundQualifiersByProduct[handle].push({ term: normTitle, weight: 15000 });
      totalQualifiersFound++;
    } else if (normTitle.includes(q) && q.length >= 3) {
      foundQualifiersByProduct[handle].push({ term: normTitle, weight: 9000 });
      totalQualifiersFound++;
    }
  }

  // Check if query is generic dress/store search
  const isGenericQuery = tokens.some(t => normGenericDress.includes(t)) ||
                         normGenericDress.some(d => q.includes(d));

  const scored = [];

  for (const p of catalogProducts) {
    const handle = p.handle;
    const qualifiers = foundQualifiersByProduct[handle] || [];
    let score = 0;

    for (const qf of qualifiers) {
      score += qf.weight;
    }

    if (totalQualifiersFound > 0) {
      // If specific qualifiers (like color, product name) were detected in the query:
      // A product MUST match those qualifiers to be returned.
      // E.g., searching "black dress" -> totalQualifiersFound > 0 (black found for obsidian-touch).
      // The other dresses get score = 0.
      if (qualifiers.length === 0) {
        score = 0;
      } else if (isGenericQuery) {
        // Boost product that matched both qualifier and dress
        score += 2000;
      }
    } else if (isGenericQuery) {
      // The customer entered ONLY generic terms ("dress", "robe", "فستان", "collection")
      // All products in catalog match equally!
      score = 5000;
    }

    if (score > 0) {
      scored.push({ product: p, score: score });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Relative thresholding: if top item has very high score (e.g. >= 8000),
  // drop any items that scored less than 40% of top score
  if (scored.length > 0) {
    const topScore = scored[0].score;
    if (topScore >= 7000) {
      return scored.filter(item => item.score >= topScore * 0.4).map(item => item.product);
    }
  }

  return scored.map(item => item.product);
}

// Test battery
const testCatalog = Object.keys(officialTitles).map(h => ({ handle: h, title: officialTitles[h] }));

const testQueries = [
  // Black & typos (EN, FR, AR)
  'black dross',
  'black dress',
  'black',
  'blck dress',
  'balck dross',
  'dark dress',
  'robe noire',
  'robe noir',
  'noire',
  'noir',
  'فستان أسود',
  'فستان اسود',
  'اسود',
  'سوداء',
  'obsidian',
  'obsidian touch',
  'toucher d\'obsidienne',
  'اوبسيديان تاتش',

  // Green (EN, FR, AR)
  'green dress',
  'green dross',
  'sage dress',
  'tweed dress',
  'robe verte',
  'robe en tweed',
  'verte',
  'فستان أخضر',
  'فستان اخضر',
  'فستان تويد',
  'vermeil',
  'فيرميل',

  // Pink / Red / Crimson (EN, FR, AR)
  'pink dress',
  'pink dross',
  'red dress',
  'crimson poise',
  'robe rose',
  'robe rouge',
  'cramoisi',
  'فستان أحمر',
  'فستان وردي',
  'فستان قرمزي',
  'كرمسون بويز',

  // Lilac / Purple (EN, FR, AR)
  'purple dress',
  'purple dross',
  'lilac dress',
  'lavender dress',
  'robe violette',
  'robe lilas',
  'فستان بنفسجي',
  'فستان لافندر',
  'ليلاك فيرس',

  // Pearl / Mauve (EN, FR, AR)
  'pearl dress',
  'mauve dress',
  'satin dress',
  'robe perle',
  'robe mauve',
  'فستان لؤلؤي',
  'فستان موف',
  'ايريس بيرل',

  // Beige / Suit (EN, FR, AR)
  'beige dress',
  'beige dross',
  'sand dress',
  'suit',
  'robe beige',
  'robe sable',
  'tailleur',
  'فستان بيج',
  'فستان رملي',
  'طقم',
  'بدلة',
  'ستركتشر سايلنس',

  // Generic (should return ALL 6)
  'dress',
  'dross', // typo for dress alone!
  'dresses',
  'robe',
  'robes',
  'فستان',
  'فساتين',
  'laleh',

  // Unrelated (should return 0)
  'shoes',
  'hat',
  'sneakers',
  'pantalon',
  'حذاء',

  // Style attributes
  'cocktail',
  'cocktail dress',
  'cocktail dross',
  'lace dress',
  'dentelle',
  'دانتيل',
  'sleeveless',
  'sans manches',
  'بدون اكمام',
  'tweed',
  'peplum',
  'satin',
  'ساتان',
  'midi',
  'evening',
  'soiree',
  'سهرة'
];

console.log('--- RUNNING SEARCH EVALUATION BATTERY ---\n');
let passed = 0;
let total = testQueries.length;

for (const q of testQueries) {
  const results = scoreAndFilterCatalog(q, testCatalog);
  const handles = results.map(r => r.handle);
  console.log(`Query: "${q}" => [${handles.join(', ')}] (count: ${handles.length})`);
}
