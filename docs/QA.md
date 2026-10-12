# Quality checks

## Automatic (run on every change)

| Check | Command | Where it runs |
|---|---|---|
| Data: required fields, coordinates in Estonia, prices, URLs, phones, e-mails, photo https, translations line up | `node scripts/qa/check-data.mjs` | before every deploy + QA workflow |
| Translations: every UI text has Estonian and Russian with the same `{placeholders}` | `node scripts/qa/check-i18n.mjs` | before every deploy + QA workflow |
| Browser tests: every screen in 3 languages × 2 phone sizes, new and returning user, every town, every place and event, 80 OpenStreetMap places, user flows, accessibility (axe) | `npm run build && node scripts/qa/e2e.mjs` | QA workflow |
| Links: every website, photo and event link answers | `node scripts/qa/check-links.mjs` | QA workflow (report in the run summary) |

A failing data or translation check stops the deploy, so broken data never goes live.

## By hand on real phones (before each public release)

Test on an iPhone (Safari) and an Android phone (Chrome), in English, Estonian and Russian.

**First visit**
- [ ] Opens fast on mobile data; text readable without zooming; nothing wider than the screen.
- [ ] Language follows the phone's language; can be changed in Me → Family.
- [ ] Add child's birthday and name → Today greets the child and shows "Ideas for N months".

**Today**
- [ ] Weather matches the real weather in the chosen town.
- [ ] "Best idea right now" makes sense for the weather (indoor when raining).
- [ ] Thursday–Saturday: "This weekend" shows Saturday/Sunday forecast and events.

**Explore**
- [ ] Search, Free/Indoor/Outdoor/Near me chips, category row and filter sheet all narrow the list.
- [ ] Town picker: "Use my location" asks permission and picks the nearest town.
- [ ] Map: pinch-zoom, pan, tap a dot → place card; locate button centres on you.
- [ ] "Show more" loads more places.

**Place page**
- [ ] Photos swipe; Directions opens Google/Apple Maps; Call dials; Website opens.
- [ ] Heart → appears in Me → Saved. Bookmark → "Want to go".
- [ ] "We went today" → goal chip on Today counts it; moment note appears in Me → Moments.

**Events**
- [ ] Opens an event; "Add to calendar" downloads/opens a calendar entry.
- [ ] Calendar subscription (iPhone / Google Calendar) adds the town's feed; new events appear later.
- [ ] Red number on the Events tab after new events are added; clears after opening Events.

**Activities**
- [ ] Activities that fit the child's age say "Good now"; Swimming lists courses in the town.

**App behaviour**
- [ ] Add to Home Screen works; opens full-screen.
- [ ] Airplane mode: app still opens with saved data.
- [ ] Share a place → link opens the same place for someone else.
- [ ] iOS app (TestFlight): Thursday reminder arrives when enabled; share sheet works.

## Reporting a problem
Note the phone, language, screen and what you tapped; a screenshot helps.
