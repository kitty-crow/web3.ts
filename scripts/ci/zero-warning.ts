/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js. If not, see <http://www.gnu.org/licenses/>.
*/

const argv = Bun.argv.slice(2);
if (argv[0] === '--') argv.shift();

if (argv.length === 0) {
	console.error('Usage: bun scripts/ci/zero-warning.ts -- <command> [args...]');
	process.exit(2);
}

const warningPatterns = [
	/\bDeprecationWarning\b/i,
	/\bExperimentalWarning\b/i,
	/\[DEP\d+\]/,
	/^\s*(?:npm|yarn|bun)?\s*WARN(?:ING)?(?:\s|:)/i,
	/^\s*warning(?:\s|:)/i,
	/^\s*deprecation(?:\s+warning)?\s*:/i,
	/^\s*deprecated(?:\s|:)/i,
	/\b(?:is|was|has been|will be)\s+deprecated\b/i,
	/\bwarnings?\s*[:=]\s*[1-9]\d*\b/i,
];

const benignWarningLines = [
	/^\s*0\s+warnings?\b/i,
	/^\s*no\s+warnings?\b/i,
	/\bwarnings?\s*[:=]\s*0\b/i,
];

const ansiPattern = /\x1B(?:[@-_][0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\x1B\\))/g;
const findings = new Set<string>();

const inspectLine = (line: string, source: 'stdout' | 'stderr') => {
	const clean = line.replace(ansiPattern, '').trimEnd();
	if (clean.length === 0 || benignWarningLines.some(pattern => pattern.test(clean))) return;
	if (warningPatterns.some(pattern => pattern.test(clean))) findings.add(`${source}: ${clean}`);
};

const pump = async (
	stream: ReadableStream<Uint8Array>,
	destination: NodeJS.WriteStream,
	source: 'stdout' | 'stderr',
) => {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let pending = '';

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		destination.write(value);
		pending += decoder.decode(value, { stream: true });
		const lines = pending.split(/\r?\n/);
		pending = lines.pop() ?? '';
		for (const line of lines) inspectLine(line, source);
	}

	pending += decoder.decode();
	if (pending.length > 0) inspectLine(pending, source);
};

console.log(`$ ${argv.join(' ')}`);

const child = Bun.spawn(argv, {
	stdin: 'inherit',
	stdout: 'pipe',
	stderr: 'pipe',
	env: process.env,
});

await Promise.all([
	pump(child.stdout, process.stdout, 'stdout'),
	pump(child.stderr, process.stderr, 'stderr'),
]);

const exitCode = await child.exited;
if (exitCode !== 0) {
	console.error(`Command exited with code ${exitCode}: ${argv.join(' ')}`);
	process.exit(exitCode);
}

if (findings.size > 0) {
	console.error('\nZero-warning gate rejected diagnostic output:');
	for (const finding of findings) console.error(`  ${finding}`);
	process.exit(1);
}

console.log('Zero-warning gate passed.');
