# Security policy

This repository is a security-maintained fork of the sunset Web3.js 4.x codebase.

## Compatibility is a security invariant

The fork is intended to remain a drop-in replacement for upstream Web3.js 4.x. Security maintenance must not casually break existing consumers.

Unless an upstream behaviour is itself the vulnerability being fixed, changes must preserve:

- published package names and entry points
- CommonJS and ESM imports and exports
- public JavaScript and TypeScript APIs
- public types and overloads
- return values, object shapes and event semantics
- supported legacy and deprecated behaviour
- the upstream Node.js engine contract
- normal error behaviour for valid inputs

A dependency upgrade is not considered safe merely because it removes a known advisory. It must also pass the compatibility test suite and the existing upstream tests.

Behavioural security fixes for malformed or hostile inputs require regression tests that demonstrate unchanged behaviour for valid upstream-compatible inputs.

## Supported maintenance branch

Security maintenance targets the `4.x` line. The archived upstream release remains the compatibility baseline.

The `engines` declaration is part of that baseline. Older Node.js releases may be retained as compatibility targets even after they are end-of-life. That does not make those Node.js releases secure or recommended for new deployments. Maintainer tooling and release automation should use a currently supported Node.js LTS release.

## Reporting a vulnerability

Please do not publish exploitable details in a normal GitHub issue before a fix is available.

Use GitHub private vulnerability reporting for this repository when the **Report a vulnerability** option is available in the Security tab. If private reporting is unavailable, contact the repository maintainer privately through the contact information on the maintainer's GitHub profile and include `web3.ts security` in the subject or first line.

A useful report includes the affected package and version, an impact description, a minimal reproducer, the expected security property, and whether the issue also exists in archived upstream Web3.js.

## Security maintenance rules

Security changes should be small, auditable and independently testable. Avoid unrelated refactors in a security patch. Runtime dependency changes should stay within the existing compatible major version whenever possible. If a safe fix requires a breaking dependency major, preserve the public Web3.js contract with an adapter or compatibility layer rather than passing the breakage to consumers.

Previously fixed Web3.js vulnerabilities remain permanent regression-test targets. New advisories affecting direct or transitive dependencies are triaged according to whether they are shipped at runtime, used only by development or CI tooling, or unreachable in this repository.

Release and publishing credentials must never be available to untrusted pull-request code. GitHub Actions should use least-privilege permissions and immutable action commit SHAs for security-sensitive workflows.
