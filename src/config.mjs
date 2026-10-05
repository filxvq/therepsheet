// Everything about the site that is not a product: its name, address, categories, agents.
export const SITE = 'https://therepsheet.com';
export const NAME = 'TheRepSheet';

// [id in products.json, display name, plural used in titles ("Shoe Reps"), intro text]
export const CATEGORIES = [
  { id: 'shoes', name: 'Shoes', reps: 'Shoe Reps',
    intro: 'Sneakers, boots, slides and runners from Weidian sellers. Shoes are where batches differ the most, so compare the toe box, the stitching around the heel and the shape of the sole in the photos before you pick one. Most listings run in EU sizes; go by the centimetre chart, not the number on your current pair.' },
  { id: 'jackets', name: 'Jackets & Vests', reps: 'Jacket Reps',
    intro: 'Puffers, shells, gilets and leather pieces. Check the fill weight and the hardware on puffers: zips, snaps and patches are what give a cheap jacket away. Outerwear is heavy, so it is worth weighing a jacket against your haul before you ship.' },
  { id: 'hoodies', name: 'Hoodies & Sweaters', reps: 'Hoodie Reps',
    intro: 'Hoodies, crewnecks, zip-ups and knits. Fabric weight decides how a hoodie hangs, so look for the GSM in the listing when it is given, and compare print placement and colour against retail photos. Asian sizing usually runs a size small.' },
  { id: 't-shirts', name: 'T-Shirts', reps: 'T-Shirt Reps',
    intro: 'Tees, polos, jerseys and long sleeves, the cheapest way to fill a haul. Print quality and collar shape are the two things to check. Tees are light, so they cost little to ship even when you buy several.' },
  { id: 'tracksuits', name: 'Tracksuits', reps: 'Tracksuit Reps',
    intro: 'Matching sets, tech fleece and track jackets with pants. Sets are often sold as one listing with the top and bottom as options, so pick both parts when you order.' },
  { id: 'pants', name: 'Pants', reps: 'Pants Reps',
    intro: 'Jeans, cargos, joggers and sweatpants. Measure a pair you already own flat and compare the waist and inseam with the size chart; that beats any size letter.' },
  { id: 'shorts', name: 'Shorts', reps: 'Shorts Reps',
    intro: 'Mesh shorts, sweat shorts and swim shorts. Light, cheap to ship and easy to size, which makes them a good first order from a new seller.' },
  { id: 'hats', name: 'Hats & Beanies', reps: 'Hat Reps',
    intro: 'Caps, beanies, balaclavas and bucket hats. On caps, the embroidery and a brim that keeps its shape are what to look for. Most are one size; fitted caps list their sizes.' },
  { id: 'bags', name: 'Bags', reps: 'Bag Reps',
    intro: 'Backpacks, crossbodies, totes and wallets. Look at the leather grain, the edge paint and the hardware engraving in the photos, and ask your agent for extra QC shots of the logo if they offer it.' },
  { id: 'accessories', name: 'Accessories', reps: 'Accessory Reps',
    intro: 'Belts, jewellery, sunglasses, watches, socks and underwear. Small items add little to a parcel\'s weight, so they ride along well with a bigger order.' },
  { id: 'other', name: 'Other Finds', reps: 'Other Finds',
    intro: 'Everything that is not clothing: tech, home, toys and collectibles. These ship from the same sellers and through the same agents as the rest of the catalog.' },
];

// The buy button rebuilds the order link for whichever agent the visitor picked. `rate` is the agent's
// conversion margin over the market yuan rate (measured for vetereps with scripts/agenci/kursy.mjs);
// agents without a measurement fall back to the market rate.
export const AGENTS = [
  { id: 'kakobuy', name: 'Kakobuy', code: 'Vetemefan', rate: 1.0834,
    signup: 'https://ikako.vip/r/Vetemefan', perk: '20% off shipping + ¥3000 in coupons' },
  { id: 'usfans', name: 'USFans', code: 'CEP7GG', rate: 1.1148,
    signup: 'https://www.usfans.com/register?ref=CEP7GG', perk: '40% off shipping coupon' },
  { id: 'sinabuy', name: 'Sinabuy', code: 'vetemefan', rate: 1.0466, signup: 'https://www.sinabuy.com/?inviteCode=vetemefan' },
  { id: 'litbuy', name: 'Litbuy', code: '', rate: 1.1793, signup: 'https://litbuy.com/' },
  { id: 'oopbuy', name: 'Oopbuy', code: '', rate: 1, signup: 'https://www.oopbuy.com/' },
  { id: 'acbuy', name: 'Acbuy', code: '', rate: 1, signup: 'https://www.acbuy.com/' },
];
export const DEFAULT_AGENT = 'kakobuy';
export const CNY_FALLBACK = 6.71;   // yuan per dollar until /api/rates answers

export const BRAND_PAGE_MIN = 8;    // a brand gets its own page from this many items
export const PER_PAGE = 60;
