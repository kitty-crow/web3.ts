# Security audit and hardening record

Date: 2026-08-12

Branch: `agent/security-hardening-2026-08`

Compatibility baseline: `bf1691765bd9d4b0f7a4479e915207707d69226d`

Status: active hardening audit

## Purpose

This audit establishes the security baseline for `web3.ts`, a maintained continuation of the sunset Web3.js 4.x codebase.

The most important project invariant is backwards compatibility. A downstream project that can use the corresponding upstream Web3.js 4.x package must be able to use this fork as a drop-in vendor replacement without source changes. Security maintenance is therefore split into two categories:

1. changes that are invisible at the Web3.js public boundary, such as CI, dependency patch releases, static analysis and release hardening;
2. behavioural security fixes, which require differential compatibility tests and must preserve all valid upstream-compatible behaviour.

See `COMPATIBILITY.md` for the full contract.

## Scope

The audit covers:

- all packages in `packages/*`;
- provider boundaries for HTTP, WebSocket and IPC;
- account, signing and V3 keystore handling;
- ABI decoding of hostile or malformed data;
- shared utilities and previously disclosed Web3.js vulnerabilities;
- direct and transitive npm dependencies;
- repository build, test and release tooling;
- GitHub Actions permissions and third-party actions;
- security reporting and dependency-maintenance policy;
- compatibility with the archived upstream 4.x implementation.

This audit deliberately does not treat a dependency version bump as safe merely because an advisory disappears. Runtime dependency changes must also satisfy the compatibility gate.

## Compatibility gate

A differential compatibility workflow now builds both this fork and the immutable upstream-compatible baseline and executes the same deterministic vectors against each implementation.

The current vectors cover:

- CommonJS package loading and public exports;
- Web3 utility conversion, hashing, UTF-8/hex conversion and checksummed addresses;
- deterministic private-key account construction;
- message signing and recovery;
- ABI parameter encoding and decoding;
- function and event signatures.

The gate executes the built packages on:

- Node.js 24, used as the current maintainer runtime;
- Node.js 16, retained as a legacy compatibility runtime;
- Node.js 14, the upstream minimum engine contract.

At the first hardening checkpoint the fork matched the archived baseline on all three runtimes. Additive exports are allowed; removing an upstream export is not.

The complete inherited upstream unit and integration suites remain authoritative in addition to these differential vectors.

## Confirmed runtime vulnerability: `ws`

### Finding

`web3-providers-ws` declared:

```json
"ws": "^8.17.1"
```

The lockfile resolved an affected WebSocket implementation after Web3.js itself had already been sunset.

The `ws` 8.x line received 2026 security fixes including:

- `GHSA-96hv-2xvq-fx4p` / `CVE-2026-48779`, high severity memory-exhaustion denial of service caused by exceptionally small fragments and data chunks;
- a separate uninitialised-memory disclosure fixed in the maintained 8.x line.

### Fix

The runtime floor is now:

```json
"ws": "^8.21.1"
```

The lockfile was regenerated from the npm registry by GitHub Actions rather than manually editing integrity data. It currently resolves the direct 8.x dependency to a patched release.

This remains inside the existing `ws` 8.x major line and does not raise the Web3.js Node.js engine floor. The differential compatibility workflow remains green after the update.

## Historical Web3.js vulnerability retained as a permanent regression

`GHSA-2g4c-8fpm-c46v` / `CVE-2024-21505` was a high-severity prototype-pollution vulnerability in `web3-utils.mergeDeep()` affecting Web3.js releases before `web3-utils` 4.2.1.

The archived 4.x baseline already contains the upstream fix. The security fix clones the merge destination rather than mutating it directly.

Permanent regression tests have been added to ensure:

- `mergeDeep()` does not mutate the destination object;
- using `Object.prototype` as a destination cannot pollute subsequently created objects.

Previously fixed Web3.js vulnerabilities are considered permanent security requirements of this fork.

## V3 keystore handling

### Cryptographic primitive selection

The account package uses `ethereum-cryptography` primitives for AES, PBKDF2 and scrypt. It is not using the old CryptoJS PBKDF2 defaults associated with a separate critical CryptoJS advisory.

### MAC comparison hardening gap

Current V3 keystore decryption computes the expected MAC and compares it with the JSON keystore MAC using an ordinary JavaScript string inequality.

This should be replaced with a constant-time byte comparison while retaining the exact successful result and the existing `KeyDerivationError` failure contract.

Status: identified, source hardening still required.

### Hostile KDF work factors

A supplied keystore controls PBKDF2/scrypt work factors before key derivation. A malicious keystore can therefore request unusually expensive CPU or memory work.

A mandatory new default cap could reject unusual but previously valid upstream keystores, which would violate the compatibility contract. The compatible design is an additive resource-policy option with legacy-unlimited behaviour retained unless a concrete default-exploitable vulnerability requires otherwise.

Status: design constraint recorded; additive hardening remains to be implemented.

## Provider resource-exhaustion boundaries

### HTTP

The HTTP provider has no mandatory request timeout or response-size cap.

Adding a new mandatory timeout or size ceiling would break valid slow or very large RPC responses. Any protection must therefore be additive and default to legacy behaviour unless the existing default is demonstrated to be directly exploitable in the provider itself.

### WebSocket and IPC buffering

The shared chunk-response parser concatenates incomplete JSON data until it becomes parseable. A peer that continuously supplies incomplete data can therefore cause buffered data to grow.

The socket provider also keeps outstanding request state until a response, disconnect or other existing cleanup path occurs. It does not impose a general per-request expiry.

Compatible hardening candidates are:

- an opt-in maximum buffered-byte policy;
- an opt-in request timeout;
- explicit documentation for applications accepting untrusted RPC peers.

The default behaviour must remain compatible with upstream large and slow RPC traffic.

Status: identified; additive API design required.

## ABI hostile-input handling

The dynamic `bytes` decoder reads a 32-byte declared length and compares that length against the complete encoded buffer rather than explicitly against the payload remaining after the length word. `string` decoding delegates to the same path.

For malformed or truncated ABI data this can produce a different result from a strict remaining-payload bounds check.

Valid ABI behaviour must not change. Before tightening this check, regression vectors must cover valid boundary cases and the behavioural difference for malformed input must be documented as an intentional security/correctness fix.

Status: identified; change intentionally deferred until dedicated malformed-input differential tests are in place.

## Dependency audit

A registry-backed Yarn audit was captured after the first WebSocket refresh.

Two views were collected:

- the Yarn `--groups dependencies` view;
- the complete workspace dependency graph.

Important: Yarn Classic's production/dev classification is misleading in this monorepo because private workspaces used only for repository tooling have their own `dependencies`. Findings must therefore be traced to dependency paths before they are classified as shipped runtime exposure.

### Runtime package review

Confirmed during this pass:

- direct WebSocket runtime exposure was vulnerable and has been patched;
- the locked Zod release is 3.22.3, which is the first release after the historical email-validation ReDoS range and is not affected by that advisory;
- no reviewed advisory was found for the checked `ethereum-cryptography` 2.0.0, `cross-fetch` 4.0.0, `@adraffy/ens-normalize` 1.8.8 or `abitype` 0.7.1 versions in the GitHub Advisory Database at audit time;
- no reviewed advisory was returned for the aggregate `web3` 4.16.0 package itself at audit time. This does not make transitive dependencies automatically safe.

### Maintainer-tooling exposure

High/critical audit paths remain in inherited development and repository tooling. Observed families include old ESLint dependency chains, Lerna/Nx, TypeDoc/Handlebars, old command-line helpers, archive tooling and bundle-analysis tooling.

These dependencies are not a reason to alter the Web3.js runtime API. They must instead be upgraded, replaced or isolated as maintainer tooling and validated against the build/test/compatibility gates.

The old root `webpack-bundle-analyzer` chain is particularly notable because it carries an old `ws` 7.x dependency and Lodash dependency. The private `eslint-config-base-web3` workspace accounts for many of the findings that Yarn labels as production dependencies.

Status: active toolchain migration. Do not suppress these findings merely because they are maintainer-only.

## CI and supply-chain hardening completed

### Security policy

The inherited security policy was stale and referred reporters back to ChainSafe and older Web3.js lines. It has been replaced with a fork-specific policy that documents the compatibility invariant and private-reporting expectations.

### Dependabot configuration

A weekly Dependabot configuration now covers:

- npm lockfile maintenance;
- GitHub Actions updates.

Routine npm updates are configured as lockfile-only so automated maintenance does not casually rewrite public dependency contracts.

GitHub repository-level Dependabot alerts were disabled at audit start. The configuration file alone does not enable repository security alerts. Repository settings must enable the security feature.

### CodeQL

A pinned, least-privilege CodeQL JavaScript/TypeScript workflow has been added with the `security-extended` query suite.

Action references are immutable commit SHAs rather than mutable tags.

The CodeQL workflow itself completes successfully on the hardening branch. The integration token available to this audit cannot read the repository's code-scanning alert API, so a successful workflow must not be interpreted as proof that the alert set is empty. Alerts must be reviewed in the repository Security tab or with an integration granted code-scanning read permission.

### Canary publishing

The inherited canary workflow automatically attempted npm publication on every `4.x` push with an npm token.

It is now manual-only through `workflow_dispatch`, least-privilege, uses pinned official actions and exposes the npm token only to the explicit publish step.

### Documentation deployment

Inherited ChainSafe Cloudflare account/project deployment behaviour has been removed. The separate documentation workflow now builds documentation without sending fork credentials or artefacts to the old upstream infrastructure.

### Main build workflow

The inherited workflow mixed build/test work with deployment, pull-request commenting, broad repository caches, mutable action tags, ad-hoc package installation and third-party actions.

The hardening branch is replacing this with a least-privilege build/test workflow using pinned official actions. Failure logs are retained as short-lived workflow artefacts so future CI failures remain diagnosable without broad GitHub integration permissions.

## Repository security settings still required

At audit start:

- the `4.x` branch was not protected;
- Dependabot alerts were disabled;
- code-scanning alert contents were not readable through the connected integration.

Before treating `4.x` as a security-maintained release branch, repository settings should require at minimum:

- pull requests before merge;
- successful differential compatibility checks;
- successful build/unit/integration checks;
- successful CodeQL analysis;
- no force pushes or branch deletion for normal contributors;
- Dependabot alerts and security updates enabled;
- private vulnerability reporting enabled where available;
- release secrets restricted to explicitly authorised environments/workflows.

## Release and package identity

The npm package names and public package metadata are compatibility-sensitive. The repository may be branded as `web3.ts`, but published compatibility packages must retain the upstream names and entry points expected by downstream applications.

Repository-only metadata can be updated to point at the maintained fork as long as package resolution, exports and user code remain unaffected.

## Security maintenance cadence

For an archived dependency surface of this size, maintenance must be continuous rather than one-off.

Recommended controls:

- weekly npm and GitHub Actions dependency review;
- CodeQL on every security branch/PR and on a schedule;
- differential upstream compatibility on every PR;
- permanent regression tests for every fixed CVE/GHSA;
- explicit review of every runtime dependency change;
- regular audit of npm publishing permissions and GitHub Actions permissions;
- no unreviewed major dependency upgrades in published packages;
- no security fix merged when its compatibility impact is unknown.

## Current gate for merging this hardening branch

This branch is not ready to merge merely because individual security fixes are correct. It should merge only when:

1. build, type, browser/package and unit checks are green from clean installs;
2. local-node integration tests are green;
3. the differential compatibility gate is green on Node.js 14, 16 and the maintainer runtime;
4. the runtime WebSocket advisory is absent from the regenerated dependency graph;
5. critical/high maintainer-tooling findings have been upgraded, isolated or explicitly accepted with a documented reason;
6. CodeQL alerts have been reviewed;
7. repository security settings are enabled;
8. the audit status is changed from active hardening to completed.
