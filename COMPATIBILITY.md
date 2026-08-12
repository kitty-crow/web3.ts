# Web3.js compatibility contract

`web3.ts` is maintained as a security-focused continuation of the sunset Web3.js 4.x codebase. Its primary compatibility requirement is stronger than ordinary semantic-versioning compatibility: an application that can use the corresponding upstream Web3.js package must be able to use this fork as a drop-in vendor replacement without source changes.

## Frozen compatibility surface

The following are treated as compatibility-sensitive unless an upstream behaviour is itself a security vulnerability:

- npm package names, package entry points and export maps
- CommonJS and ESM loading behaviour
- public JavaScript APIs and callable signatures
- exported TypeScript names, types, generics and overloads
- property names, enumerable shapes and return-value representations
- events, subscription behaviour and provider request semantics
- accepted valid input formats
- errors and rejection behaviour for valid inputs
- documented defaults
- supported deprecated and legacy behaviour
- browser-facing bundles and Node.js-facing packages
- the upstream minimum Node.js engine declaration

Internal implementation details, CI, repository automation, development tooling and dependency patch versions may change when they do not alter that surface.

## Security fixes

Security fixes are allowed to reject hostile or malformed inputs that upstream accepted accidentally, but only when all of the following are true:

1. the old behaviour creates a concrete security or correctness risk;
2. valid upstream-compatible inputs retain their previous result and side effects;
3. a regression test covers the hostile input;
4. compatibility tests cover the neighbouring valid cases;
5. the change is documented in the security audit or changelog.

Where a protection can be additive, such as a request timeout, input-size limit or KDF resource limit, the legacy behaviour remains the default unless preserving it would leave a concrete vulnerability exploitable by default.

## Dependency policy

Patch and minor dependency updates are not automatically assumed compatible. Runtime dependency updates require tests at the Web3.js public boundary. Major dependency upgrades must be isolated behind compatibility code when necessary so their breaking changes do not become Web3.js breaking changes.

The lockfile should be refreshed regularly to obtain patched versions already allowed by existing compatible ranges. Raising a minimum dependency floor is appropriate when older versions inside a published range are known-vulnerable and the new floor remains API-compatible.

## Compatibility testing

The target test strategy has four layers:

1. the complete inherited upstream unit and integration suites;
2. package-loading and public-export tests for CommonJS, ESM and browser builds;
3. frozen compatibility vectors for deterministic Web3.js behaviours such as ABI coding, signing, recovery, keystore handling, formatting and provider errors;
4. differential tests that execute the same vectors against the archived upstream baseline and this fork, normalise intentionally nondeterministic fields, and fail on an unapproved difference.

Security regression tests are permanent. In particular, vulnerabilities already fixed by upstream before sunset remain part of the fork's regression corpus.

## Node.js versions

The historical Node.js engine floor remains part of the compatibility contract. End-of-life Node.js releases may therefore appear in compatibility-only test lanes. They are not recommended deployment targets and are not considered secure merely because the fork continues to load on them.

Repository automation, dependency scanning, release generation and other maintainer-side tooling should run on a currently supported Node.js LTS release.

## Review rule

A proposed change that cannot explain why it is backwards compatible is not ready to merge. When compatibility and code cleanliness conflict, compatibility wins.
