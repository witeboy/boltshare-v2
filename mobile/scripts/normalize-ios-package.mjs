import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

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

async function verifyArtwork() {
  const artworkPaths = [
    'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',
    'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png',
    'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png',
    'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png',
  ];

  await Promise.all(
    artworkPaths.map((artworkPath) => access(resolve(artworkPath))),
  );

  console.log('Using committed BoltShare iOS icon and launch artwork.');
}

await normalizeSwiftPackage();
await normalizeXcodeIdentity();
await verifyArtwork();
