# XinUS Product, Technical, and Search-Discovery Audit

## Baseline Findings — 2026-08-13

The public `https://xinus.one/` response previously rendered an authentication boundary rather than a crawlable explanation of the product. Live checks also showed that `/robots.txt`, `/sitemap.xml`, and `/favicon.ico` fell through to the generic HTML application shell, rather than returning dedicated crawl assets. The original client entry included a basic title and description but lacked a canonical URL, explicit robots directive, web manifest, and structured data.

The new public landing page was reviewed at desktop (1280×720) and mobile (375×812) breakpoints. It presents the platform proposition, focused app family, privacy model, private-sign-in call to action, and explicit scope boundaries without exposing protected workflows. The layout remains readable and actionable at the mobile breakpoint; the mobile navigation correctly prioritizes private sign-in and stacks the app overview into scannable cards.

Production verification confirmed `https://xinus.one/`, `robots.txt`, `sitemap.xml`, and `site.webmanifest` now return their dedicated public assets with appropriate content types. The public landing initially displayed an empty root while client assets loaded, then completed successfully with the expected title, discovery copy, private sign-in links, and no protected workspace content.

## Implemented Search-Discovery Baseline

| Area | Implementation | Rationale |
|---|---|---|
| Public indexable content | Canonical root landing page | Provides crawlable product context without exposing private application surfaces. |
| Crawl assets | Root `robots.txt` and `sitemap.xml` | Makes the preferred public URL discoverable to compliant crawlers. |
| Canonicalization | Root canonical URL and Open Graph URL | Consolidates the preferred public identity at `https://xinus.one/`. |
| Structured understanding | Organization and WebSite JSON-LD | Gives search engines machine-readable identity and website context. |
| Privacy boundary | `X-Robots-Tag: noindex, nofollow` for private application routes | Keeps authenticated workspaces out of search results while allowing the public page to be crawled. |
| Mobile quality | Responsive public landing review | Supports a usable discovery and sign-in path across desktop and mobile widths. |

## Audit Priorities

| Priority | Upgrade | Why it matters | Status |
|---|---|---|---|
| P0 | Remediate production dependency audit findings | The production audit reports 81 vulnerabilities, including 1 critical and 21 high findings concentrated in transitive rendering dependencies. | Open |
| P0 | Complete Hidden Gems upload regression repair | User-reported proxy-size and storage-response parsing failures must be confirmed resolved end to end. | In progress |
| P1 | Add Google Search Console property and submit sitemap | Sitemap publication is a crawl hint; Search Console verification and submission make coverage and errors observable. [1] | Requires site-owner action |
| P1 | Add a distinct XinUS brand mark and privacy-sharing visual motif | Improves differentiation and recall across the public page and product surfaces. | Recommended |
| P1 | Add route-level metadata management for future public resources | Enables title, description, canonical, and sharing metadata to match future public pages. | Recommended |
| P2 | Publish substantive, audience-specific resource pages | Creates indexable topical depth for genuine search demand without exposing private workspace content. | Recommended |
| P2 | Add performance budget and split the large initial JavaScript bundle | The current production client bundle exceeds Vite’s 500 kB advisory threshold. | Recommended |
| P2 | Add automated accessibility checks to CI | Complements visual checks with repeatable coverage for semantics, contrast, keyboard flow, and form labels. | Recommended |

## Google Indexing Notes

Google recommends a root-hosted sitemap with fully qualified canonical URLs and allows site owners to submit it through Search Console. Sitemap submission is a hint rather than a guarantee of indexing. [1] Robots rules manage crawler access but should not be relied upon as a privacy control; authentication and `noindex` are appropriate for private application routes. [2] Structured data may help Google understand a public page, but it does not guarantee a rich result. [3]

## References

[1]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap "Google Search Central: Build and submit a sitemap"
[2]: https://developers.google.com/search/docs/crawling-indexing/robots/intro "Google Search Central: Introduction to robots.txt"
[3]: https://developers.google.com/search/docs/appearance/structured-data/software-app "Google Search Central: Software application structured data"
