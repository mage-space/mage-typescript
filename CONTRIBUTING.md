# Contributing

Thanks for helping improve the Mage TypeScript SDK. Bug reports and pull requests are welcome. For questions about the API itself, see the [Mage API docs](https://docs.mage.space/api/overview).

## Development

```bash
npm ci
npm test            # unit tests
npm run typecheck   # includes the type-level checks in test/types.check.ts
npm run format      # prettier
npm run build       # compiles to dist/
```

The tests never call the real API. `npm run smoke` does, with `MAGE_API_KEY` set: it runs one generation with the cheapest image model and spends Gems. Run `npm run build` first.

## Generated code

`src/generated/types.ts` is generated from `spec/openapi.json`, the API reference Mage publishes at <https://docs.mage.space/api/openapi.json>. Do not edit either file by hand:

- To change how types are generated, edit `scripts/generate.mjs` and run `npm run generate`.
- The spec is updated by the **Sync API spec** workflow, which checks the published reference every hour and opens a pull request when it changes. Additive changes (new models, fields, or options) merge on their own once CI passes. Breaking changes are labelled `needs-review` and wait for a maintainer.

CI fails if the generated file does not match the spec.

## Pull requests

Pull requests are squash-merged, and the title becomes the commit message, so write it as a [Conventional Commit](https://www.conventionalcommits.org/): `fix: …`, `feat: …`, `docs: …`, or `chore: …`. Releases are built from these titles.

## Releases

[release-please](https://github.com/googleapis/release-please) keeps a release pull request open that collects the changes since the last release. Merging it tags the release and publishes it to npm with provenance. While the SDK is in beta (`0.x`), features and fixes bump the patch version and breaking changes bump the minor version.

## Maintainer setup

These steps are done once per repository.

1. **Bot.** A GitHub App installed on this repository with read and write access to contents and pull requests. Store its app ID as the `MAGE_BOT_APP_ID` Actions variable and its private key as the `MAGE_BOT_PRIVATE_KEY` Actions secret. The spec sync and release-please use it so that their pull requests run CI.
2. **Repository settings.** Allow squash merging only, allow auto-merge, delete branches after merge, and protect `main` with the CI checks (`Check`, `Test (Node 20)`, `Test (Node 22)`, `Test (Node 24)`) required.
3. **npm.** Publish the first version by hand to create the package (`npm ci && npm publish --access public` as an owner of the `@mage-space` scope). Then, in the package's settings on npmjs.com, add a trusted publisher: GitHub Actions, repository `mage-space/mage-typescript`, workflow `release.yml`, environment `npm`. Create the `npm` environment in the repository settings.
4. **Smoke test (optional).** Store an API key for an account with a small Gem balance as the `MAGE_API_KEY` Actions secret. Without it, the nightly smoke test is skipped.
