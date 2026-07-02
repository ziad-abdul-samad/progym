# Performance and SEO Strategy

## Performance

- Use SSR or static rendering for public content.
- Keep public landing pages crawlable without client-side data dependencies.
- Use `next/image` for inspectable public imagery.
- Dynamically load GSAP, Three.js, and React Three Fiber only where needed.
- Respect `prefers-reduced-motion`.
- Paginate dashboard tables and activity feeds.
- Use TanStack Query cache keys by feature and invalidate narrowly.
- Add database indexes for role/status, assignments, attendance date, subscription status, token hashes, and unread notifications.

## SEO

- Public routes exist under `/ar` and `/en`.
- Generate page metadata, canonical URLs, hreflang, sitemap, robots, Open Graph, and Twitter metadata.
- Add JSON-LD for LocalBusiness, coaches, membership offers, and breadcrumbs.
- Dashboard routes must be `noindex`.
- Public content must use semantic headings, descriptive alt text, and server-rendered text.
