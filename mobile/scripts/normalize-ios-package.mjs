import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const IOS_BUNDLE_ID = 'com.boltshare.rcinc';
const APPLE_TEAM_ID = '7F6X98KNQ6';
const ADMOB_PACKAGE = '        .package(url: "https://github.com/capacitor-community/admob.git", exact: "8.0.0"),';
const ADMOB_PRODUCT = '                .product(name: "CapacitorCommunityAdmob", package: "admob"),';

async function normalizeSwiftPackage() {
  const packagePath = resolve('ios/App/CapApp-SPM/Package.swift');
  let source = (await readFile(packagePath, 'utf8')).replaceAll('\\', '/');

  // Remove any generated local/remote AdMob dependency and product first, then
  // add one deterministic remote SPM dependency used by Codemagic.
  source = source
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.includes('capacitor-community/admob')) return false;
      if (trimmed.startsWith('.package(') && trimmed.includes('CapacitorCommunityAdmob')) return false;
      if (trimmed.startsWith('.product(') && trimmed.includes('CapacitorCommunityAdmob')) return false;
      return true;
    })
    .join('\n');

  source = source.replace(
    /(\s*\.package\(url: "https:\/\/github\.com\/ionic-team\/capacitor-swift-pm\.git"[^\n]*\),)/,
    `$1\n${ADMOB_PACKAGE}`,
  );

  source = source.replace(
    /(\s*\.product\(name: "Cordova", package: "capacitor-swift-pm"\),)/,
    `$1\n${ADMOB_PRODUCT}`,
  );

  await writeFile(packagePath, source, 'utf8');
}

async function normalizeXcodeIdentity() {
  const projectPath = resolve('ios/App/App.xcodeproj/project.pbxproj');
  let source = await readFile(projectPath, 'utf8');

  source = source.replaceAll(
    'PRODUCT_BUNDLE_IDENTIFIER = app.rcinc.boltshare;',
    `PRODUCT_BUNDLE_IDENTIFIER = ${IOS_BUNDLE_ID};`,
  );

  source = source.replace(
    /DEVELOPMENT_TEAM = [A-Z0-9]+;/g,
    `DEVELOPMENT_TEAM = ${APPLE_TEAM_ID};`,
  );

  const teamLine = `CODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = ${APPLE_TEAM_ID};`;
  source = source.replaceAll(
    'CODE_SIGN_STYLE = Automatic;',
    teamLine,
  );

  // Prevent duplicate DEVELOPMENT_TEAM lines when the script runs repeatedly.
  source = source.replace(
    new RegExp(`(DEVELOPMENT_TEAM = ${APPLE_TEAM_ID};\\n\\s*)DEVELOPMENT_TEAM = ${APPLE_TEAM_ID};`, 'g'),
    `$1`,
  );

  await writeFile(projectPath, source, 'utf8');
}

async function installArtwork() {
  // Codespaces runs Linux and cannot import AppKit. The installer already
  // places validated PNG assets. Codemagic/macOS regenerates them from the
  // approved source outline on every signed build.
  if (process.platform !== 'darwin') {
    console.log('Using pre-generated BoltShare iOS artwork on this non-macOS environment.');
    return;
  }

  const scriptPath = resolve('scripts/generate-ios-artwork.swift');
  const { stdout, stderr } = await run('swift', [scriptPath], {
    cwd: resolve('.'),
    maxBuffer: 1024 * 1024,
  });
  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.warn(stderr.trim());
}

await normalizeSwiftPackage();
await normalizeXcodeIdentity();
await installArtwork();
