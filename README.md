# TheRepSheet

Static rep catalog for https://therepsheet.com. Vercel runs `node src/build.mjs`, which writes every page into `dist/`.

## Updating the catalog
1. Export the Panda panel to `data/panda-map.csv` (source_url, wd_product_id, price_cny, …).
2. `node scripts/fetch-source.mjs` to refresh names, categories and photos into `data/source.json` (optional).
3. `npm run data` to join them into `data/products.json`. Existing slugs are kept.
4. `npm run images` to fetch and convert only the photos that are missing into `public/img/`.
5. `npm run build`, then preview with `node scripts/serve.mjs` at http://localhost:4321.
6. Commit and push. Vercel deploys main.

Agents, codes and categories live in `src/config.mjs`. The guide, FAQ and about text live in `src/content.mjs`.
