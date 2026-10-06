// Everything about the site that is not a product: its name, address, categories, agents.
export const SITE = 'https://therepsheet.com';
export const NAME = 'TheRepSheet';
export const DOMAIN = 'therepsheet.com';

// [id in products.json, display name, plural used in titles ("Shoe Reps"), intro text]
export const CATEGORIES = [
  { id: 'shoes', icon: '<path d="M2 17v-4l3.2-1.1 3.3-4.4 2.2 1.6c1.6 1.2 3.6 2 5.7 2.3l2.6.5A2.4 2.4 0 0 1 21 14.3V17z"/><path d="M2 17h19"/><path d="m7.5 10.6 1.4 1.1"/><path d="m10 8.9 1.4 1.1"/>', name: 'Shoes', reps: 'Shoe Reps',
    intro: 'Sneakers, boots, slides and runners from Weidian sellers. Shoes are where batches differ the most, so compare the toe box, the stitching around the heel and the shape of the sole in the photos before you pick one. Most listings run in EU sizes; go by the centimetre chart, not the number on your current pair.' },
  { id: 'jackets', short: 'Jackets', icon: '<path d="M8.5 3 4.5 5.4 3 20h5.5V9"/><path d="M15.5 3l4 2.4L21 20h-5.5V9"/><path d="M8.5 3c.9 1.4 2.1 2.2 3.5 2.2S14.6 4.4 15.5 3"/><path d="M12 5.2V21"/><path d="M8.5 21h7"/>', name: 'Jackets & Vests', reps: 'Jacket Reps',
    intro: 'Puffers, shells, gilets and leather pieces. Check the fill weight and the hardware on puffers: zips, snaps and patches are what give a cheap jacket away. Outerwear is heavy, so it is worth weighing a jacket against your haul before you ship.' },
  { id: 'hoodies', short: 'Hoodies', icon: '<path d="M9 3.5C9 6 10.3 8 12 8s3-2 3-4.5"/><path d="M9 3.5 5 5.5 3 14l3 .8V21h12v-6.2l3-.8-2-8.5-4-2"/><path d="m10 8-.4 3.5"/><path d="m14 8 .4 3.5"/><path d="M9 17.5h6"/>', name: 'Hoodies & Sweaters', reps: 'Hoodie Reps',
    intro: 'Hoodies, crewnecks, zip-ups and knits. Fabric weight decides how a hoodie hangs, so look for the GSM in the listing when it is given, and compare print placement and colour against retail photos. Asian sizing usually runs a size small.' },
  { id: 't-shirts', icon: '<path d="M20.4 3.5 16 2a4 4 0 0 1-8 0L3.6 3.5a2 2 0 0 0-1.3 2.2l.6 3.5a1 1 0 0 0 1 .8H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.1a1 1 0 0 0 1-.8l.6-3.5a2 2 0 0 0-1.3-2.2z"/>', name: 'T-Shirts', reps: 'T-Shirt Reps',
    intro: 'Tees, polos, jerseys and long sleeves, the cheapest way to fill a haul. Print quality and collar shape are the two things to check. Tees are light, so they cost little to ship even when you buy several.' },
  { id: 'tracksuits', icon: '<path d="M5.5 3 3 4.6 2.4 12h3V7"/><path d="M10.5 3 13 4.6l.3 3.4"/><path d="M5.5 3c.5 1 1.4 1.5 2.5 1.5S10 4 10.5 3"/><path d="M8 4.5V12"/><path d="M14 10h6.5l1 11h-3l-1.2-6-1.2 6h-3z"/>', name: 'Tracksuits', reps: 'Tracksuit Reps',
    intro: 'Matching sets, tech fleece and track jackets with pants. Sets are often sold as one listing with the top and bottom as options, so pick both parts when you order.' },
  { id: 'pants', icon: '<path d="M6.5 2h11l1.5 20h-4.6L12 10.5 9.6 22H5z"/><path d="M6.4 5.5h11.2"/>', name: 'Pants', reps: 'Pants Reps',
    intro: 'Jeans, cargos, joggers and sweatpants. Measure a pair you already own flat and compare the waist and inseam with the size chart; that beats any size letter.' },
  { id: 'shorts', icon: '<path d="M5 4h14l1.6 11.5-6.6 1.5L12 10.5 10 17l-6.6-1.5z"/><path d="M4.8 7.5h14.4"/>', name: 'Shorts', reps: 'Shorts Reps',
    intro: 'Mesh shorts, sweat shorts and swim shorts. Light, cheap to ship and easy to size, which makes them a good first order from a new seller.' },
  { id: 'hats', short: 'Headwear', icon: '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M2 15h17.5a2.5 2.5 0 0 0 2.5-2.5"/><path d="M12 7V5.5"/><path d="M9 7.6c.5 2.2.8 4.6.8 7.4"/>', name: 'Hats & Beanies', reps: 'Hat Reps',
    intro: 'Caps, beanies, balaclavas and bucket hats. On caps, the embroidery and a brim that keeps its shape are what to look for. Most are one size; fitted caps list their sizes.' },
  { id: 'bags', icon: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>', name: 'Bags', reps: 'Bag Reps',
    intro: 'Backpacks, crossbodies, totes and wallets. Look at the leather grain, the edge paint and the hardware engraving in the photos, and ask your agent for extra QC shots of the logo if they offer it.' },
  { id: 'accessories', icon: '<circle cx="12" cy="12" r="6"/><path d="M12 10v2l1.2 1.2"/><path d="m16.1 7.7-.8-4A2 2 0 0 0 13.3 2h-2.6a2 2 0 0 0-2 1.6l-.8 4.1"/><path d="m7.9 16.4.8 4a2 2 0 0 0 2 1.6h2.6a2 2 0 0 0 2-1.6l.8-4"/>', name: 'Accessories', reps: 'Accessory Reps',
    intro: 'Belts, jewellery, sunglasses, watches, socks and underwear. Small items add little to a parcel\'s weight, so they ride along well with a bigger order.' },
  { id: 'other', icon: '<path d="M11 21.7a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7z"/><path d="M12 22V12"/><path d="M3.3 7 12 12l8.7-5"/><path d="m7.5 4.3 9 5.1"/>', name: 'Other Finds', reps: 'Other Finds',
    intro: 'Everything that is not clothing: tech, home, toys and collectibles. These ship from the same sellers and through the same agents as the rest of the catalog.' },
];

// The buy button rebuilds the order link for whichever agent the visitor picked. `rate` is the agent's
// conversion margin over the market yuan rate (measured for vetereps with scripts/agenci/kursy.mjs);
// agents without a measurement fall back to the market rate.
export const AGENTS = [
  { id: 'kakobuy', name: 'Kakobuy', logo: '/agents/kb.avif', code: 'Vetemefan', rate: 1.0834,
    signup: 'https://ikako.vip/r/Vetemefan', perk: '20% off shipping + ¥3000 in coupons' },
  { id: 'usfans', name: 'USFans', logo: '/agents/usf.avif', code: 'CEP7GG', rate: 1.1148,
    signup: 'https://www.usfans.com/register?ref=CEP7GG', perk: '40% off shipping coupon' },
  { id: 'sinabuy', name: 'Sinabuy', logo: '/agents/sina.webp', code: 'vetemefan', rate: 1.0466, signup: 'https://www.sinabuy.com/?inviteCode=vetemefan' },
  { id: 'litbuy', name: 'Litbuy', logo: '/agents/lit.avif', code: '', rate: 1.1793, signup: 'https://litbuy.com/' },
  { id: 'oopbuy', name: 'Oopbuy', logo: '/agents/oop.avif', code: '', rate: 1, signup: 'https://www.oopbuy.com/' },
  { id: 'acbuy', name: 'Acbuy', logo: '/agents/ac.avif', code: '', rate: 1, signup: 'https://www.acbuy.com/' },
];
export const DEFAULT_AGENT = 'kakobuy';
export const CNY_FALLBACK = 6.71;   // yuan per dollar until /api/rates answers

export const BRAND_PAGE_MIN = 8;    // a brand gets its own page from this many items
export const PER_PAGE = 60;
