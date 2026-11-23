# xinus.one Domain Cutover Notes

## Current state

On 2026-08-12 PDT, `https://xinus.one/` resolves to an existing **XINUS MonarchOS** deployment rather than the new XinUS Clarity Suite Lightsail instance at `52.214.4.184`.

## Cutover plan

1. Configure the Lightsail Nginx virtual host for `xinus.one` and `www.xinus.one` without changing the currently live DNS destination.
2. After the user explicitly confirms the DNS-provider change, replace the root-domain `A` record with `52.214.4.184`; add a matching `www` record according to the user’s DNS-provider capabilities.
3. After DNS propagation, issue a Let’s Encrypt certificate and verify `https://xinus.one/` serves XinUS Clarity Suite.

> The existing MonarchOS deployment remains live until the DNS record is intentionally changed.
