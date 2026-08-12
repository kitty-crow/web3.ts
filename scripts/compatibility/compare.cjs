'use strict';

const fs = require('fs');
const assert = require('assert');

const [baselinePath, forkPath] = process.argv.slice(2);
if (!baselinePath || !forkPath) {
	throw new Error('Usage: node compare.cjs <baseline.json> <fork.json>');
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const fork = JSON.parse(fs.readFileSync(forkPath, 'utf8'));

assert.deepStrictEqual(
	fork.vectors,
	baseline.vectors,
	'The fork changed a deterministic upstream Web3.js compatibility vector.',
);

const missingExports = baseline.exports.filter(name => !fork.exports.includes(name));
assert.deepStrictEqual(
	missingExports,
	[],
	`The fork removed upstream exports: ${missingExports.join(', ')}`,
);

process.stdout.write(
	`Compatibility vectors match. Preserved ${baseline.exports.length} upstream exports; fork exposes ${fork.exports.length} exports.\n`,
);
