# Source of Truth

## Canonical repository

The canonical GitHub repository for the current XinUS Clarity Suite is:

<https://github.com/tychomorr-ui/nexinus-clarity-suite>

Its `main` branch contains the current Manus WebDev application source and production documentation.

## Canonical runtime

The production runtime is Manus WebDev project `CERUhtwoxiEDvVacJwQnY6` as provisioned by the project environment, deployed at:

<https://exonissuite-ceruhtwo.manus.space>

The repository is the reviewable source. Manus deployment state, managed secrets, database state, and deployment checkpoints are runtime assets and are not reproduced in Git.

## What is legacy

The following repositories and Replit exports are historical or separate projects and must not be treated as the current Clarity production source without an explicit migration decision:

- `Xinus-Clarity-Engine`
- `XinUS-Sovereign-Truth-Engine`
- `XinUS-Sovereign-Truth-Engine1`
- `tesseract`
- `sovereign-truth-engine`

They may contain useful historical material, but their architecture, provider paths, product boundaries, and deployment assumptions predate the current Manus suite.

## Separate protocol source

`https://github.com/tychomorr-ui/pharo-lapse` is the separate Pharo-Lapse protocol and reference implementation repository. It is not a vendored copy of this application and it is not evidence that the Clarity deployment has live mesh transport. The current application contains a bounded local protocol core and tests only.

## Import record

The current Manus checkout was imported into this repository while preserving the existing GitHub commit history. The import intentionally excludes `.env*` files, project-local secret metadata, dependencies, build output, runtime logs, local databases, private keys, and deployment-only artifacts.

Future changes should be made in this repository, validated with the documented checks, and deployed through the Manus project workflow. Do not edit a legacy Replit repository and assume production changed.
