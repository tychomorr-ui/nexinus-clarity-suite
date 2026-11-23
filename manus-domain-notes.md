# XinUS Manus Domain Configuration

## Current deployment

XinUS is served through the managed Manus deployment at `https://exonissuite-ceruhtwo.manus.space/`. The retired `xinus.one` and AWS Lightsail endpoints are not part of the active application path.

## Private OAuth boundary

Private OAuth is first-party and same-origin. The browser creates its callback URL from the current Manus origin, and the server validates the callback against the forwarded Manus host and HTTPS scheme. No external identity provider, Lightsail host, or custom-domain callback is required.

The private OAuth database requires the `private_oauth_accounts` and `private_oauth_codes` tables. The live managed database was repaired and verified after schema drift caused the login endpoint to return HTTP 503.

## Public discovery assets

The canonical URL, Open Graph URL, JSON-LD website identity, sitemap, and robots sitemap directive all point to the active Manus address. Protected application routes remain excluded from indexing through the server's `X-Robots-Tag` boundary.

## Operator rule

Use the active Manus address for user sign-in, testing, OAuth callbacks, and public links:

`https://exonissuite-ceruhtwo.manus.space/`
