# Kuhu Minna (formerly Parents Hub)

A mobile-first web app (PWA) that helps parents of toddlers in Tallinn decide **where to go today**:
places, prices, free entry rules, discounts and toddler-practical details (stroller access, changing
tables, feeding rooms). It installs onto iPhone and Android home screens like a normal app.

## Features (v0.1)

- **Today**: live Tallinn weather (Open-Meteo), with 3 daily ideas matched to the weather, the child's age and the season
- **Explore**: search and filters (indoor/outdoor, free, type, area, right age, open this season, near me)
- **Place page**: price table, free-age rules, discounts, opening hours, parent facilities, transit directions, "last verified" date
- **Saved**: favorites, a "want to go" list and **Moments** (a log of outings with a one-line memory)
- **Family**: child's name, birthday and nap time, plus install instructions and money-saving tips

All personal data stays in the browser's local storage for now.

## Data

Place data lives in `src/data/places.json`, and money tips in `src/data/money-tips.json`.
Each place has a `lastVerified` date and a `confidence` level. **Re-check prices and hours on the
official website before relying on them.** To add a place, append an object with the same shape
(see `src/types.ts`).

Parking details (free/paid, operator, city zone, and whether the Pargi.ee app works there) are in
each place's `parkingInfo`. General parking rules are in `src/data/parking-rules.json`, and places to
find kids' events are in `src/data/event-sources.json`.

Useful sources for adding more places: kuhuminnalastega.ee, keskraamatukogu.ee (library sessions),
visittallinn.ee, tallinn.ee, kultuurikava.ee, partyup.ee playroom lists, and perekool.ee.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run lint
```

## Deploy (free, GitHub Pages)

1. Merge into `main`.
2. In the repo, go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow publishes the site to `https://<user>.github.io/parents_hub/`.
4. Open the site on your phone, then add it to your home screen (Safari: Share → Add to Home Screen; Chrome: ⋮ → Install app).

## Roadmap

- Shared family account, so both parents see the same lists (needs a backend, such as Supabase)
- Weekly events calendar
- "Report wrong info" and parent reviews
- Photos in Moments
- Estonian, Russian and Bengali UI
- Classes (swimming, music), then Tartu and Pärnu
