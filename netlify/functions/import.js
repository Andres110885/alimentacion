// Netlify Function · importa una receta desde un enlace de blog
// Lee la página en el servidor (sin CORS) y extrae ingredientes y pasos
// principalmente desde los datos estructurados JSON-LD (schema.org/Recipe).

export async function handler(event) {
  const url = (event.queryStringParameters && event.queryStringParameters.url) || '';
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  };
  if (!url) return { statusCode: 400, headers, body: JSON.stringify({ error: 'falta url' }) };
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MiCocinaBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml'
      }
    });
    const html = await res.text();
    const data = parseRecipe(html);
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: String(e), found: false }) };
  }
}

function parseRecipe(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  let recipe = null;
  for (const b of blocks) {
    let j;
    try { j = JSON.parse(b.trim().replace(/<!--[\s\S]*?-->/g, '')); } catch (e) { continue; }
    recipe = findRecipe(j);
    if (recipe) break;
  }
  if (!recipe) return { found: false };

  const clean = s => String(s).replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
  const ingredients = (recipe.recipeIngredient || recipe.ingredients || [])
    .map(clean).filter(Boolean);

  let steps = [];
  const ri = recipe.recipeInstructions;
  const flat = x => {
    if (!x) return;
    if (typeof x === 'string') { steps.push(clean(x)); return; }
    if (Array.isArray(x)) { x.forEach(flat); return; }
    if (x['@type'] === 'HowToSection' && x.itemListElement) { flat(x.itemListElement); return; }
    if (x.text) steps.push(clean(x.text));
    else if (x.name) steps.push(clean(x.name));
  };
  flat(ri);
  steps = steps.filter(Boolean);

  let image = recipe.image;
  if (Array.isArray(image)) image = image[0];
  if (image && typeof image === 'object') image = image.url || '';

  return {
    found: ingredients.length > 0 || steps.length > 0,
    title: clean(recipe.name || ''),
    ingredients,
    steps,
    image: image || '',
    yield: Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : (recipe.recipeYield || ''),
    time: recipe.totalTime || ''
  };
}

function findRecipe(j) {
  if (!j) return null;
  if (Array.isArray(j)) { for (const x of j) { const r = findRecipe(x); if (r) return r; } return null; }
  const t = j['@type'];
  if (t && (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe')))) return j;
  if (j['@graph']) return findRecipe(j['@graph']);
  return null;
}
