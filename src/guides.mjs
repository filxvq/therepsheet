// Guides at /guides/<slug>/: plain answers to the questions people search before and after a rep
// order. Each guide is { slug, title (h1), seo (title tag), desc, intro, sections: [{ h, p: [..] }] }.
// Keep them factual and general; never advise on hiding parcels from customs.

export const GUIDES = [
  {
    slug: 'how-to-check-qc-photos',
    title: 'How to Check QC Photos Before You Ship',
    seo: 'How to Check QC Photos for Reps (Step-by-Step Guide)',
    desc: 'What to look for in rep QC photos: shape, stitching, logos, measurements and flaws, plus when to ask your agent for an exchange.',
    intro: 'QC photos are the only time you see your actual item before paying for international shipping. Ten minutes spent on them saves you from shipping a wrong size or a bad pair halfway around the world.',
    sections: [
      { h: 'What QC photos are', p: ['When your item reaches the agent\'s warehouse, staff photograph it: usually the front, back, labels, details and, for clothing, a measurement with a tape. These are QC (quality check) photos of the exact piece you bought, not the seller\'s stock pictures.'] },
      { h: 'Check the basics first', p: ['Start with what is easy to get wrong: is it the right item, the right colourway and the right size? Compare the size tag and the tape measurement with the size chart in the listing. A wrong size is the most common problem and the easiest to fix before shipping.'] },
      { h: 'Then the details', p: ['On shoes, look at the overall shape from the side, the toe box, the stitching around the heel and the alignment of logos. On clothing, check the print or embroidery for smudges and misalignment, the collar and the cuffs. On bags, look at the edges, the hardware and any engraving.', 'Put the QC photos next to retail pictures of the same model and compare the same angles. Small differences are normal for reps; look for things you would notice when wearing it.'] },
      { h: 'Look for flaws', p: ['Glue stains, loose threads, stains, scratches and uneven panels are worth flagging. Some are fixable (agents can sometimes clean glue), others are a reason to exchange.'] },
      { h: 'GL or RL', p: ['If everything looks right, accept it (GL, green light) and it waits in the warehouse for shipping. If not, ask your agent for an exchange or a return (RL, red light) before the parcel leaves. Exchanges usually cost only domestic shipping in China.'] },
      { h: 'Ask for more photos', p: ['Most agents sell extra or detailed photos for a small fee. They are worth it for expensive pairs or bags, where the details decide whether you keep the item.'] },
    ],
  },
  {
    slug: 'gl-rl-meaning',
    title: 'What GL and RL Mean in Reps',
    seo: 'GL and RL Meaning in Reps: Green Light vs Red Light',
    desc: 'GL means green light, RL means red light: what the terms mean in QC posts, when to GL or RL an item and what happens next.',
    intro: 'GL and RL are the two most common abbreviations in rep communities. You see them under every QC post and they decide whether an item ships or goes back.',
    sections: [
      { h: 'GL = green light', p: ['GL means the item looks good in the QC photos and you will keep it. In QC posts, "GL" from other buyers means they think the item passes.'] },
      { h: 'RL = red light', p: ['RL means something is wrong and you will send the item back or exchange it: the wrong size, a visible flaw or a shape that is too far from retail.'] },
      { h: 'How to decide', p: ['Ask yourself whether the flaw would bother you when wearing the item and whether a new one is likely to be better. A crooked logo on a tee is a clear RL; a tiny difference in a shade of grey usually is not.', 'Remember that an exchange takes time: a few days for the seller to receive the return and send a new piece, then new QC photos.'] },
      { h: 'Other terms you will see', p: ['QC: quality check photos. W2C: where to cop, a request for a link. Batch: one factory\'s version of an item. Haul: everything you ship together. Agent: the company that buys and ships for you.'] },
    ],
  },
  {
    slug: 'how-to-use-a-shopping-agent',
    title: 'How a Shopping Agent Works',
    seo: 'What Is a Shopping Agent? How to Buy Reps From China',
    desc: 'How shopping agents like Kakobuy and USFans buy from Weidian and Taobao for you, what you pay and how long it takes.',
    intro: 'Weidian and Taobao sellers sell to buyers in China. A shopping agent is a company in China that buys for you, receives the items, photographs them and ships them abroad.',
    sections: [
      { h: 'Why you need one', p: ['Chinese marketplaces are in Chinese, need a Chinese payment method and sellers ship only inside China. An agent handles all three: you pay the agent, it pays the seller, and it ships to your country.'] },
      { h: 'What you pay', p: ['First the item price plus a few yuan of domestic shipping to the warehouse. Later, when your items have arrived, international shipping by weight. Agents earn on the exchange rate and on shipping, so the dollar price of the same item differs between agents.'] },
      { h: 'The order step by step', p: ['Paste a link or use the buy button on a rep page, choose size and colour, pay. The agent orders from the seller, usually within a day. The seller ships to the warehouse in two to five days. You get QC photos, accept or return the item, then submit a parcel with everything you want shipped together.'] },
      { h: 'Choosing an agent', p: ['The differences are the exchange-rate margin, shipping lines and prices, coupons for new accounts and customer service. See our comparison of rep agents for the numbers we use on this site.'] },
    ],
  },
  {
    slug: 'best-rep-agents',
    title: 'Best Agents for Reps Compared',
    seo: 'Best Rep Agents 2026: Kakobuy vs USFans vs Others',
    desc: 'Kakobuy, USFans, Sinabuy, Litbuy, Oopbuy and Acbuy compared: exchange-rate margin, new-account coupons and what each is good for.',
    intro: 'Every agent on TheRepSheet can buy every rep we list. They differ in how much they add to the yuan price, in their shipping lines and in the coupons new accounts get.',
    agentsTable: true,
    sections: [
      { h: 'Exchange-rate margin', p: ['Agents convert the seller\'s yuan price to dollars at their own rate, a little worse than the market rate. The table above shows the margin we measured for each agent; the prices on this site use it, so switching the agent at the top of the page shows the real difference.'] },
      { h: 'Coupons', p: ['New accounts usually get shipping coupons, which matter more than a few percent on the exchange rate for a first haul. Sign up through an offer before your first order.'] },
      { h: 'Shipping', p: ['Shipping is the biggest cost after the items. Compare the lines each agent offers to your country in its shipping calculator, with your parcel\'s real weight.'] },
      { h: 'Our pick', p: ['Kakobuy is the default on this site because of its new-account offer and its rate. USFans is a good second choice. If you already use another agent, keep it: every link here works with it.'] },
    ],
  },
  {
    slug: 'rep-sizing-guide',
    title: 'How to Pick the Right Size for Reps',
    seo: 'Rep Sizing Guide: Asian Sizes, Shoes and Clothing',
    desc: 'How to size reps: why Asian sizing runs small, how to measure a garment you own and how to read shoe size charts in centimetres.',
    intro: 'Most rep sellers are Chinese and use Chinese sizing. Getting the size right is the most important step of an order, and the easiest to get right with a tape measure.',
    sections: [
      { h: 'Clothing: measure, do not guess', p: ['Take a piece you own that fits well, lay it flat and measure the chest (armpit to armpit), the length (shoulder to hem) and, for pants, the waist and inseam. Compare those numbers with the seller\'s size chart and pick the closest size.', 'If there is no chart, Asian sizing usually runs about one size small: a European M is often an Asian L.'] },
      { h: 'Shoes: use centimetres', p: ['Shoe sizes on Weidian are usually EU sizes, but batches run differently. Measure your foot length in centimetres and compare it with the chart in the listing. Many sellers say whether a pair runs true to size, small or large.'] },
      { h: 'Check in QC', p: ['Agents often photograph a measurement. If the size is wrong, exchange it before shipping.'] },
    ],
  },
  {
    slug: 'what-is-a-batch',
    title: 'What a Batch Means in Reps',
    seo: 'What Is a Batch in Reps? Batches Explained',
    desc: 'A batch is one factory\'s version of an item. Why the same rep comes in different batches and prices, and how to compare them.',
    intro: 'You will see the same rep at very different prices. The difference is usually the batch: which factory made it and how closely it follows the original.',
    sections: [
      { h: 'One item, several factories', p: ['Popular models are made by several factories. Each factory\'s version is a batch, often named after the factory. Batches differ in shape, materials, colours and details, and in price.'] },
      { h: 'Budget and top batches', p: ['Budget batches are cheaper and fine from a distance. Top batches cost more and get closer to retail in shape and materials. Which one is right depends on how much the details matter to you.'] },
      { h: 'How to compare', p: ['Look at QC photos of each listing rather than the seller\'s stock photos, which are sometimes of a better batch. On TheRepSheet, rep pages show QC photos from real orders when there are some.'] },
    ],
  },
  {
    slug: 'rep-shipping-guide',
    title: 'Shipping Your Rep Haul: Lines, Weight and Time',
    seo: 'Rep Shipping Guide: Lines, Weight and Delivery Time',
    desc: 'How rep shipping works: how parcels are weighed, how to choose a shipping line and how long delivery usually takes to Europe and the US.',
    intro: 'Shipping is paid once your items are in the agent\'s warehouse and is usually the biggest cost after the items themselves. A few choices make a big difference.',
    sections: [
      { h: 'Weight and volume', p: ['Lines charge by weight, and some by volume weight for bulky parcels. Shoe boxes add a lot of both: removing them is the most common way to make a parcel lighter. Agents also offer to vacuum-pack clothing.'] },
      { h: 'Choosing a line', p: ['Every agent lists lines for your country with price, speed and rules for what each line accepts. Express lines are fast and expensive; economy lines are cheaper and slower. Read the line\'s description and the agent\'s notes before you choose.'] },
      { h: 'How long it takes', p: ['Most parcels arrive in one to three weeks after they leave the warehouse, depending on the line and the country. Add the time for your items to reach the warehouse, usually three to seven days.'] },
      { h: 'Duties and rules', p: ['Your country may charge import VAT or duties on parcels from China. Check the rules for your country before you order and declare parcels truthfully; your agent\'s shipping page explains what each line includes.'] },
    ],
  },
  {
    slug: 'how-to-find-reps-on-weidian',
    title: 'How to Find Reps on Weidian',
    seo: 'How to Find Reps on Weidian (and Order Them)',
    desc: 'How Weidian works, how to find items without reading Chinese, and how to order a Weidian link through a shopping agent.',
    intro: 'Weidian is a Chinese marketplace owned by Tencent where many rep sellers run their shops. It is built for buyers in China, which is why a spreadsheet and an agent make it usable from abroad.',
    sections: [
      { h: 'Weidian links', p: ['A Weidian item link looks like weidian.com/item.html?itemID= followed by a number. That number identifies the item; agents use it to open the same listing on their site.'] },
      { h: 'Finding items', p: ['Searching Weidian directly is hard without Chinese. Spreadsheets like TheRepSheet list items with English names, prices and photos, and open them straight in your agent.'] },
      { h: 'Converting a link', p: ['If you have a Weidian link from somewhere else, paste it into our link converter to get the same item on Kakobuy, USFans or another agent.'] },
      { h: 'Checking a seller', p: ['Look at QC photos from other buyers and at how long the seller has been around. A listing with QC photos from real orders is a safer first order than one without.'] },
    ],
  },
];
