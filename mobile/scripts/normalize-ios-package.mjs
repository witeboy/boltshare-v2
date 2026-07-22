import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packagePath = resolve('ios/App/CapApp-SPM/Package.swift');
const source = await readFile(packagePath, 'utf8');
const normalized = source.replaceAll('\\', '/');

if (normalized !== source) await writeFile(packagePath, normalized, 'utf8');
