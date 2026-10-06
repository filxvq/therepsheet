// The "About this rep" text on a product page.
//
// describe() returns the facts line (price and where the rep sits in its category) and, for products
// without an AI-written description in data/descriptions.json, a paragraph built only from what is
// known about the listing: its brand, its colour and size options, its QC photos and a check that
// fits its category. Sentence shapes are picked by the listing id, so neighbouring pages read
// differently while nothing in them is invented.
const CHECKS = {
  shoes: ['compare the toe box and the heel shape with retail photos, since that is where batches differ most', 'go by the centimetre size chart in the listing rather than the number on your current pair', 'look at the sole edge and the stitching around the heel tab in the QC photos'],
  jackets: ['check the zips, snaps and patches in the QC photos; hardware is what gives a cheap jacket away', 'weigh the jacket against the rest of your haul before you choose a shipping line', 'look at how the seams line up on the shoulders and pockets in the QC photos'],
  hoodies: ['compare print placement and colour against retail pictures in your QC photos', 'size up if you are between sizes, because Asian sizing runs small on hoodies', 'check the cuffs, hem and hood seams in the QC photos'],
  't-shirts': ['look closely at the print edges and the collar in the QC photos', 'compare the chest width in the size chart with a tee you already own', 'check that the print is centred and the colours match the listing photos'],
  tracksuits: ['make sure you select both the top and the pants, since sets are often one listing with two options', 'check that both pieces match in colour in the QC photos', 'compare the inseam and chest measurements with clothes you already own'],
  pants: ['measure a pair you own lying flat and compare the waist and inseam with the size chart', 'check the stitching at the pockets and hem in the QC photos', 'look at the waistband and the fly in the QC photos'],
  shorts: ['compare the waist measurement with the size chart rather than the size letter', 'check the drawstring and the hem stitching in the QC photos', 'look at the print or embroidery placement in the QC photos'],
  hats: ['check the embroidery outline and whether the brim holds its shape', 'look at the stitching on the crown and the inside label in the QC photos', 'check the listing for one-size or fitted options before you order'],
  bags: ['ask your agent for close-ups of the logo and hardware engraving if they offer extra photos', 'check the edge paint, stitching and lining in the QC photos', 'look at the zip pulls and strap fixings in the QC photos'],
  accessories: ['check the engraving and the finish in the QC photos, where cheap batches show first', 'small items add little weight, so they ride along well with a larger order', 'compare the size or length with the listing before you order'],
  other: ['check the listing for the exact model or version before you order', 'ask your agent which shipping lines accept it, since some lines restrict electronics and liquids', 'look at the packaging and the item itself in the QC photos'],
};

const money = (n) => '$' + (n < 10 ? n.toFixed(2) : Math.round(n));
const pick = (list, seed, salt = 0) => list[(Number(String(seed).slice(-6)) + salt * 7) % list.length];
const groupOf = (groups, re) => groups.find((g) => re.test(g.label.toLowerCase()));
function range(opts) {
  const t = opts.map((o) => o.t).filter(Boolean);
  if (!t.length) return '';
  return t.length <= 4 ? t.join(', ') : `${t[0]} to ${t[t.length - 1]}`;
}

export function describe(p, { cat, catList, brandList, usd, variants = [], qc = 0 }) {
  const prices = catList.map((x) => x.cny).sort((a, b) => a - b);
  const rank = prices.filter((x) => x < p.cny).length / Math.max(1, prices.length - 1);
  const band = rank < 0.2 ? 'among the cheapest' : rank < 0.45 ? 'in the cheaper half' : rank < 0.7 ? 'around the middle' : rank < 0.9 ? 'in the pricier half' : 'among the most expensive';
  const plural = cat.reps.toLowerCase();
  const facts = `Listed at ¥${p.cny} on Weidian, about ${money(usd)} through Kakobuy at today's rate, which puts it ${band} of the ${catList.length} ${plural} in the spreadsheet (¥${prices[0]} to ¥${prices[prices.length - 1]}).`;

  const s = [];
  const id = p.id;
  // who makes it and where it sits among that brand's reps
  if (p.brand && brandList.length > 1) {
    const cheaper = brandList.filter((x) => x.cny < p.cny).length, n = brandList.length;
    s.push(cheaper === 0 ? pick([`This is the most affordable of the ${n} ${p.brand} reps on TheRepSheet.`, `Of the ${n} ${p.brand} reps listed here, this one costs the least.`], id)
      : cheaper === n - 1 ? pick([`It is the priciest of the ${n} ${p.brand} reps on TheRepSheet.`, `Of the ${n} ${p.brand} reps listed here, this one costs the most.`], id)
      : pick([`${p.brand} has ${n} reps on TheRepSheet, and ${cheaper} of them cost less than this one.`, `Among the ${n} ${p.brand} reps in the spreadsheet, ${cheaper} are cheaper than this ${p.name}.`, `This ${p.name} sits at number ${cheaper + 1} of ${n} ${p.brand} reps when sorted by price.`], id));
  } else if (p.brand) {
    s.push(pick([`It is the only ${p.brand} rep on TheRepSheet so far.`, `This is currently the one ${p.brand} piece in the spreadsheet.`], id));
  } else {
    s.push(pick([`The ${p.name} is listed under ${cat.name.toLowerCase()} in the rep spreadsheet.`, `You will find the ${p.name} among the ${catList.length} ${plural} on TheRepSheet.`], id));
  }
  // what the seller offers
  const colours = groupOf(variants, /colou?r|style|classification|model|scheme/), sizes = groupOf(variants, /size|yard|eur|length|dimension/);
  if (colours && sizes) s.push(pick([`The seller offers ${colours.options.length} colour option${colours.options.length > 1 ? 's' : ''} and sizes ${range(sizes.options)}.`, `It comes in ${colours.options.length} colourway${colours.options.length > 1 ? 's' : ''}, sized ${range(sizes.options)}.`, `Pick from ${colours.options.length} colour${colours.options.length > 1 ? 's' : ''} and sizes ${range(sizes.options)} on the agent page.`], id, 1));
  else if (colours) s.push(pick([`The seller lists ${colours.options.length} version${colours.options.length > 1 ? 's' : ''} to choose from.`, `There ${colours.options.length > 1 ? `are ${colours.options.length} versions` : 'is one version'} on the listing.`], id, 1));
  else if (sizes) s.push(pick([`Sizes run ${range(sizes.options)}.`, `The listing covers sizes ${range(sizes.options)}.`], id, 1));
  // QC
  s.push(qc ? pick([`${qc} QC photo${qc > 1 ? 's' : ''} from real orders show what other buyers received.`, `Other buyers' orders left ${qc} warehouse photo${qc > 1 ? 's' : ''} you can check below.`], id, 2)
    : pick(['No QC photos have been posted for this listing yet, so look closely at your own when the agent sends them.', 'There are no QC photos from earlier orders yet; your agent will photograph yours before it ships.'], id, 2));
  const tip = pick(CHECKS[p.category] || CHECKS.other, id, 3);
  s.push(`Before you order, ${tip}.`);
  return { facts, text: s.join(' ') };
}
