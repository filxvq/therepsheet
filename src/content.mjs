// The site's fixed text: buying guide, FAQ and the about page.
export const GUIDE = {
  title: 'How to Buy Reps from Weidian',
  intro: 'Weidian sellers do not ship abroad themselves, so you order through a shopping agent: a company in China that buys the item for you, photographs it in their warehouse and ships everything you bought in one parcel. The whole process takes about two to four weeks.',
  steps: [
    { t: 'Make an agent account.', d: 'Kakobuy is the default on this site; USFans, Sinabuy, Litbuy, Oopbuy and Acbuy work too. Switch at the top of any page and every buy link follows.',
      more: 'New accounts usually get shipping coupons, so sign up through an offer before your first order rather than after it.' },
    { t: 'Pick a find and press Buy.', d: 'The button opens the same Weidian listing inside your agent, where you choose the size and colour and add it to the cart.',
      more: 'Read the listing\'s size chart there. Most sellers use Asian sizing, which runs about one size smaller than EU or US labels.' },
    { t: 'Pay for the items.', d: 'You pay the item price plus domestic shipping to the agent\'s warehouse in China, usually a few yuan.',
      more: 'International shipping is paid later, once everything has arrived and been weighed.' },
    { t: 'Check the QC photos.', d: 'When an item reaches the warehouse, the agent posts quality-check photos. Compare them against retail pictures before you accept the item.',
      more: 'If something is wrong (the size, the colour, a flaw), ask for a return or exchange now. Once the parcel leaves China that option is gone.' },
    { t: 'Ship your parcel.', d: 'Submit the items you want sent together, choose a shipping line and pay by weight.',
      more: 'Lines differ in price, speed and how they handle customs. Your agent\'s calculator shows the options for your country.' },
    { t: 'Track it home.', d: 'You get a tracking number as soon as the parcel is handed to the shipping line. Delivery takes one to three weeks depending on the line.' },
  ],
};

export const FAQ = [
  { q: 'What is a rep spreadsheet?', a: 'A list of products from Chinese marketplaces, mostly Weidian, with a price and a link for each, so you can find a specific item without searching a seller\'s whole shop. This site is one, built as pages you can browse and search instead of a single sheet.' },
  { q: 'Which shopping agent should I use?', a: 'Any agent in the switcher works with every link here. They differ in their exchange rate, shipping lines and coupons. Kakobuy is the default because its new-account offer is the best right now; the prices shown change with the agent you pick, since each converts yuan at its own rate.' },
  { q: 'Why does the price change when I switch agents?', a: 'Sellers price in yuan. Each agent converts yuan to dollars at its own rate, a little worse than the market, and that margin differs from agent to agent. The yuan price under each item is what the seller asks; the dollar figure is what that agent will charge for it.' },
  { q: 'Is the price shown the final cost?', a: 'No. It is the item price only. You also pay a few yuan of domestic shipping to the agent\'s warehouse and, at the end, international shipping by weight.' },
  { q: 'What are QC photos?', a: 'Quality-check photos your agent takes of your actual item when it reaches their warehouse. They are your chance to spot a wrong size, colour or a flaw before anything ships.' },
  { q: 'What if a link is dead?', a: 'Weidian sellers take listings down without warning. Dead finds are removed when the catalog is checked; if you hit one first, search for the item name and pick another seller.' },
  { q: 'How long does shipping take?', a: 'Usually three to seven days for the items to reach the warehouse, then one to three weeks for the parcel, depending on the shipping line and your country.' },
  { q: 'Does this site sell anything?', a: 'No. There is no stock, no checkout and no payment here. Every order is placed by you with the agent you choose.' },
];

export const ABOUT = [
  'TheRepSheet is a catalog of finds from Weidian sellers, each with its price and a direct link for six shopping agents. It exists so you can find a specific item quickly and order it through whichever agent you already use.',
  'The site sells nothing. It holds no stock, takes no payments and is not part of any transaction: orders are placed by you with an agent, who buys from the seller on your behalf.',
  'Brand names and product names appear only to identify the items as their sellers list them. TheRepSheet has no affiliation with any of the brands shown.',
  'Some agent links and sign-up links carry a referral code. It costs you nothing and helps keep the catalog maintained.',
  'Prices are the seller\'s yuan price converted at a live market rate with each agent\'s own margin, and change with the agent you pick. Always confirm the price and details on the agent\'s page before you order.',
];
