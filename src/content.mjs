// The site's fixed text: home page sections, buying guide, FAQ and the about page.
// The phrase people search is "rep spreadsheet" / "reps", so the copy says it plainly.

export const HOME = {
  lead: 'TheRepSheet puts {COUNT} Weidian reps in one rep spreadsheet: sneakers, hoodies, jackets, bags and accessories, each with its real price, every colour and size the seller offers, and QC photos from real orders where they exist. Pick your shopping agent once and every rep on the site opens straight in it.',
  start: [
    { t: 'Pick a rep.', d: 'Browse a category, a brand or search by name. Colours, sizes and QC photos are on every rep page.' },
    { t: 'Order through an agent.', d: 'Weidian sellers do not ship abroad, so an agent buys the rep for you and holds it in a warehouse in China.' },
    { t: 'Approve the QC, then ship.', d: 'The agent photographs your actual item. If it looks right, send everything home in one parcel.' },
  ],
  what: [
    'Reps is the name the community uses for budget versions of popular streetwear and designer styles, sold by independent sellers on Chinese marketplaces such as Weidian. The sellers only ship within China, which is why every order goes through a shopping agent.',
    'A rep spreadsheet is the shortcut: one list of reps with prices and working links, so you go straight to the item instead of digging through a seller\'s shop. TheRepSheet is that list as a fast site, with search, brands, colours, sizes and QC photos.',
  ],
  why: [
    { t: 'QC photos from real orders', d: 'Warehouse photos of the actual items other buyers received, shown on the rep pages that have them.' },
    { t: 'Every colour and size', d: 'Each rep lists the options its seller offers, with a photo for every colourway.' },
    { t: 'Six agents, one switch', d: 'Kakobuy, USFans, Sinabuy, Litbuy, Oopbuy or Acbuy: choose once and every link and price follows.' },
    { t: 'Prices you will actually pay', d: 'The seller\'s yuan price at today\'s rate with your agent\'s own margin, not a rounded guess.' },
  ],
};

export const GUIDE = {
  title: 'How to Buy Reps: Step by Step',
  intro: 'Weidian sellers do not ship abroad themselves, so you buy reps through a shopping agent: a company in China that orders the rep for you, photographs it in their warehouse and ships everything you bought in one parcel. The whole process takes about two to four weeks.',
  steps: [
    { t: 'Make an agent account.', d: 'Kakobuy is the default on this rep spreadsheet; USFans, Sinabuy, Litbuy, Oopbuy and Acbuy work too. Switch at the top of any page and every buy link follows.',
      more: 'New accounts usually get shipping coupons, so sign up through an offer before your first rep order rather than after it.' },
    { t: 'Pick a rep and press Buy.', d: 'The button opens the same Weidian listing inside your agent, where you choose the size and colour and add the rep to the cart.',
      more: 'Read the listing\'s size chart there. Most rep sellers use Asian sizing, which runs about one size smaller than EU or US labels.' },
    { t: 'Pay for the reps.', d: 'You pay the item price plus domestic shipping to the agent\'s warehouse in China, usually a few yuan.',
      more: 'International shipping is paid later, once all your reps have arrived and been weighed.' },
    { t: 'Check the QC photos.', d: 'When a rep reaches the warehouse, the agent posts quality-check photos. Compare them against retail pictures before you accept it.',
      more: 'If something is wrong (the size, the colour, a flaw), ask for a return or exchange now. Once the parcel leaves China that option is gone.' },
    { t: 'Ship your haul.', d: 'Submit the reps you want sent together, choose a shipping line and pay by weight.',
      more: 'Lines differ in price, speed and how they handle customs. Your agent\'s calculator shows the options for your country.' },
    { t: 'Track it home.', d: 'You get a tracking number as soon as the parcel is handed to the shipping line. Delivery takes one to three weeks depending on the line.' },
  ],
};

export const FAQ = [
  { q: 'What is a rep spreadsheet?', a: 'A list of reps from Chinese marketplaces, mostly Weidian, with a price and a working link for each, so you can find a specific rep without searching a seller\'s whole shop. TheRepSheet is a rep spreadsheet built as a website you can browse and search.' },
  { q: 'Is the rep spreadsheet free to use?', a: 'Yes. Browsing, searching and the agent links cost nothing. Some links carry a referral code, which costs you nothing and keeps the spreadsheet maintained.' },
  { q: 'Which agent is best for buying reps?', a: 'Every agent in the switcher works with every rep here. They differ in exchange rate, shipping lines and coupons. Kakobuy is the default because its new-account offer is the best right now; prices change with the agent you pick, since each converts yuan at its own rate.' },
  { q: 'Why does the price change when I switch agents?', a: 'Rep sellers price in yuan. Each agent converts yuan to dollars at its own rate, a little worse than the market, and that margin differs from agent to agent. The yuan price under each rep is what the seller asks; the dollar figure is what that agent charges.' },
  { q: 'Is the price the final cost of the rep?', a: 'No. It is the item price only. You also pay a few yuan of domestic shipping to the agent\'s warehouse and, at the end, international shipping by weight.' },
  { q: 'What are QC photos?', a: 'Quality-check photos your agent takes of your actual rep when it reaches their warehouse. They are your chance to spot a wrong size, colour or a flaw before anything ships.' },
  { q: 'How long does shipping reps take?', a: 'Usually three to seven days for the reps to reach the warehouse, then one to three weeks for the parcel, depending on the shipping line and your country.' },
  { q: 'What if a rep link is dead?', a: 'Weidian sellers take listings down without warning. Dead reps are removed when the spreadsheet is checked; if you hit one first, search for the item and pick another listing.' },
  { q: 'Does TheRepSheet sell reps?', a: 'No. There is no stock, no checkout and no payment here. Every order is placed by you with the agent you choose.' },
];

export const ABOUT = [
  'TheRepSheet is a rep spreadsheet of finds from Weidian sellers, each with its price and a direct link for six shopping agents. It exists so you can find a specific rep quickly and order it through whichever agent you already use.',
  'The site sells nothing. It holds no stock, takes no payments and is not part of any transaction: orders are placed by you with an agent, who buys from the seller on your behalf.',
  'Brand names and product names appear only to identify the items as their sellers list them. TheRepSheet has no affiliation with any of the brands shown.',
  'Some agent links and sign-up links carry a referral code. It costs you nothing and helps keep the rep spreadsheet maintained.',
  'Prices are the seller\'s yuan price converted at a live market rate with each agent\'s own margin, and change with the agent you pick. Always confirm the price and details on the agent\'s page before you order.',
];
