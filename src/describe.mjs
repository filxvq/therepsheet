// The "About this find" text on a product page. Built from facts about the item and where it sits
// in its category and brand, so two pages rarely read alike: the price band, its rank among the
// brand's items, and a check that fits the category.
const CHECKS = {
  shoes: ['Compare the toe box and the heel shape with retail photos; those are where batches differ most.', 'Go by the centimetre size chart in the listing rather than your usual size number.'],
  jackets: ['Check the zips, snaps and logo patches in the QC photos; hardware is what gives a cheap jacket away.', 'Outerwear is heavy, so weigh it against the rest of your haul before choosing a shipping line.'],
  hoodies: ['Compare the print placement and the colour against retail pictures in your QC photos.', 'Asian sizing runs small on hoodies; if you are between sizes, size up.'],
  't-shirts': ['Look closely at the print edges and the collar in the QC photos.', 'Tees weigh little, so a few of them add almost nothing to shipping.'],
  tracksuits: ['Sets are often one listing with the top and pants as options, so make sure you select both.', 'Check that the two pieces match in colour in the QC photos.'],
  pants: ['Measure a pair you own lying flat and compare the waist and inseam with the size chart.', 'Check the stitching at the pockets and hem in the QC photos.'],
  shorts: ['Shorts are light and easy to size, which makes them a low-risk first order.', 'Compare the waist measurement with the chart rather than the size letter.'],
  hats: ['On caps, check the embroidery outline and whether the brim holds its shape.', 'Most are one size; fitted styles list their sizes in the listing.'],
  bags: ['Ask your agent for close-ups of the logo and hardware engraving if they offer extra photos.', 'Check the leather grain and the edge paint in the QC photos.'],
  accessories: ['Small items add little weight, so they ride along well with a larger order.', 'Check the engraving and finish in the QC photos, where cheap batches show first.'],
  other: ['Check the listing for the exact model or version before you order.', 'Electronics and liquids can be restricted on some shipping lines; ask your agent which lines accept it.'],
};

const money = (n) => '$' + (n < 10 ? n.toFixed(2) : Math.round(n));

export function describe(p, { cat, catList, brandList, usd }) {
  const out = [];
  const prices = catList.map((x) => x.cny).sort((a, b) => a - b);
  const rank = prices.filter((x) => x < p.cny).length / Math.max(1, prices.length - 1);
  const band = rank < 0.2 ? 'among the cheapest' : rank < 0.45 ? 'in the cheaper half' : rank < 0.7 ? 'around the middle' : rank < 0.9 ? 'in the pricier half' : 'among the most expensive';
  const plural = cat.reps.toLowerCase();
  out.push(`The ${p.name} rep is listed at ¥${p.cny} on Weidian, about ${money(usd)} through Kakobuy at today's rate. That puts it ${band} of the ${catList.length} ${plural} in the catalog, which run from ¥${prices[0]} to ¥${prices[prices.length - 1]}.`);
  if (p.brand && brandList.length > 1) {
    const cheaper = brandList.filter((x) => x.cny < p.cny).length;
    const n = brandList.length;
    out.push(cheaper === 0 ? `It is the cheapest of the ${n} ${p.brand} finds here.`
      : cheaper === n - 1 ? `It is the most expensive of the ${n} ${p.brand} finds here.`
      : `${p.brand} has ${n} finds in the catalog, and ${cheaper} of them cost less than this one.`);
  }
  const tips = CHECKS[p.category] || [];
  out.push(`Before you order: ${tips[Number(p.id) % tips.length] || ''} The buy button opens this exact listing with the agent you have selected; the size and colour are chosen there.`);
  return out;
}
