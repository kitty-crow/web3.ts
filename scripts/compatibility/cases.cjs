'use strict';

const path = require('path');

const modulePath = process.env.WEB3_MODULE
	? path.resolve(process.env.WEB3_MODULE)
	: 'web3';
// eslint-disable-next-line import/no-dynamic-require, global-require
const web3Module = require(modulePath);
const { Web3 } = web3Module;
const web3 = new Web3();

const privateKey = '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318';
const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const message = 'web3.ts compatibility vector';
const signed = web3.eth.accounts.sign(message, privateKey);

const abiTypes = ['uint256', 'address', 'bytes', 'string', 'bool', 'uint256[]'];
const abiValues = [
	'12345678901234567890',
	account.address,
	'0x1234abcd',
	'compatibility',
	true,
	['1', '2', '3', '999999999999999999'],
];
const encodedParameters = web3.eth.abi.encodeParameters(abiTypes, abiValues);
const decodedParameters = web3.eth.abi.decodeParameters(abiTypes, encodedParameters);

const vectors = {
	utils: {
		toWei: web3.utils.toWei('1.2345', 'ether'),
		fromWei: web3.utils.fromWei('1234500000000000000', 'ether'),
		keccak256: web3.utils.keccak256('0x1234abcd'),
		utf8ToHex: web3.utils.utf8ToHex('Web3.js compatibility ✓'),
		hexToUtf8: web3.utils.hexToUtf8('0x576562332e6a7320636f6d7061746962696c69747920e29c93'),
		checksumAddress: web3.utils.toChecksumAddress('0x52908400098527886e0f7030069857d2e4169ee7'),
		isAddress: web3.utils.isAddress(account.address),
	},
	accounts: {
		address: account.address,
		privateKey: account.privateKey,
		accountKeys: Object.keys(account).sort(),
		messageHash: signed.messageHash,
		v: signed.v,
		r: signed.r,
		s: signed.s,
		signature: signed.signature,
		recovered: web3.eth.accounts.recover(message, signed.signature),
	},
	abi: {
		encodedParameters,
		decoded: [
			String(decodedParameters[0]),
			String(decodedParameters[1]),
			String(decodedParameters[2]),
			String(decodedParameters[3]),
			Boolean(decodedParameters[4]),
			Array.from(decodedParameters[5], value => String(value)),
		],
		functionSignature: web3.eth.abi.encodeFunctionSignature('transfer(address,uint256)'),
		eventSignature: web3.eth.abi.encodeEventSignature('Transfer(address,address,uint256)'),
	},
};

const result = {
	exports: Object.keys(web3Module).sort(),
	vectors,
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
