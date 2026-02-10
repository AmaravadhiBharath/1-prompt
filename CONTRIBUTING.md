# Contributing

Small notes to keep installs and the lockfile stable across contributors and CI.

- Node/npm version
  - Use the Node version in `.nvmrc` (run `nvm use` or your preferred Node version manager).
  - `package.json` also specifies an `engines.node` and `engines.npm` requirement.

- Installing
  - Always use `npm ci` in CI and for local clean installs to reproduce the lockfile exactly.
  - If you need to update dependencies locally, run `npm install` and commit the updated `package-lock.json`.

- Lockfile
  - Commit `package-lock.json` for any dependency changes.
  - If you encounter lockfile corruption, regenerate it locally:

```bash
rm -rf node_modules package-lock.json
npm install
```

- Dependabot
  - Dependabot is enabled and will open weekly PRs for dependency upgrades. Review and merge as appropriate.

- Security
  - We run `npm audit` in CI and weekly. For deeper scanning you can enable Snyk by adding `SNYK_TOKEN` to repository secrets.

- Build
  - Run `npm ci && npm run build` to verify changes.

If anything else is unclear, open an issue or ping the maintainer.
