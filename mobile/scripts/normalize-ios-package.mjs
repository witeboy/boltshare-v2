import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const IOS_BUNDLE_ID = 'com.boltshare.rcinc';
const APPLE_TEAM_ID = '7F6X98KNQ6';
const ADMOB_PACKAGE_NAME = 'CapacitorCommunityAdmob';
const ADMOB_PACKAGE = `        .package(name: "${ADMOB_PACKAGE_NAME}", path: "../../../node_modules/@capacitor-community/admob"),`;
const ADMOB_PRODUCT = `                .product(name: "CapacitorCommunityAdmob", package: "${ADMOB_PACKAGE_NAME}"),`;

function removeSwiftFunction(source, signature) {
  const signatureIndex = source.indexOf(signature);
  if (signatureIndex === -1) return source;

  const openingBrace = source.indexOf('{', signatureIndex);
  if (openingBrace === -1) {
    throw new Error(`Unable to find opening brace for ${signature}`);
  }

  let depth = 0;
  let closingBrace = -1;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      closingBrace = index + 1;
      break;
    }
  }

  if (closingBrace === -1) {
    throw new Error(`Unable to find closing brace for ${signature}`);
  }

  const documentationStart = source.lastIndexOf('\n    /**', signatureIndex);
  const documentationEnd = documentationStart === -1
    ? -1
    : source.indexOf('*/', documentationStart) + 2;
  const documentationIsAdjacent = documentationStart !== -1
    && documentationEnd > 1
    && source.slice(documentationEnd, signatureIndex).trim() === '';
  const start = documentationIsAdjacent
    ? documentationStart
    : source.lastIndexOf('\n', signatureIndex);
  let end = closingBrace;
  while (source[end] === '\r' || source[end] === '\n') end += 1;
  return `${source.slice(0, start)}\n${source.slice(end)}`;
}

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

async function enforceNoTrackingAdMob() {
  const pluginPath = resolve('node_modules/@capacitor-community/admob/ios/Sources/AdMobPlugin/AdMobPlugin.swift');
  let source = await readFile(pluginPath, 'utf8');

  source = source.replace(
    /#if canImport\(AppTrackingTransparency\)\r?\nimport AppTrackingTransparency\r?\n#endif\r?\n/,
    '',
  );
  source = source
    .split('\n')
    .filter((line) => !line.includes('CAPPluginMethod(name: "trackingAuthorizationStatus"')
      && !line.includes('CAPPluginMethod(name: "requestTrackingAuthorization"'))
    .join('\n');
  source = removeSwiftFunction(source, '@objc func requestTrackingAuthorization');
  source = removeSwiftFunction(source, '@objc func trackingAuthorizationStatus');

  const requestConfigLine = '        self.setRequestConfiguration(call)';
  const disablePublisherIdLine = '        MobileAds.shared.requestConfiguration.setPublisherFirstPartyIDEnabled(false)';
  if (!source.includes(disablePublisherIdLine)) {
    if (!source.includes(requestConfigLine)) {
      throw new Error('Unable to locate AdMob request configuration');
    }
    source = source.replace(requestConfigLine, `${requestConfigLine}\n${disablePublisherIdLine}`);
  }

  const forbiddenTokens = [
    'AppTrackingTransparency',
    'ATTrackingManager',
    'trackingAuthorizationStatus',
    'requestTrackingAuthorization',
  ];
  for (const token of forbiddenTokens) {
    if (source.includes(token)) {
      throw new Error(`AdMob no-tracking patch left forbidden token: ${token}`);
    }
  }

  await writeFile(pluginPath, source, 'utf8');
}

async function normalizeXcodeIdentity() {
  const projectPath = resolve('ios/App/App.xcodeproj/project.pbxproj');
  let source = await readFile(projectPath, 'utf8');

  source = source.replaceAll(
    'PRODUCT_BUNDLE_IDENTIFIER = app.rcinc.boltshare;',
    `PRODUCT_BUNDLE_IDENTIFIER = ${IOS_BUNDLE_ID};`,
  );

  const projectLines = source.split(/\r?\n/);
  const normalizedLines = [];
  for (let index = 0; index < projectLines.length; index += 1) {
    const line = projectLines[index];
    if (!line.includes('CODE_SIGN_STYLE = Automatic;')) {
      normalizedLines.push(
        line.trim().startsWith('DEVELOPMENT_TEAM =')
          ? line.replace(/DEVELOPMENT_TEAM = [A-Z0-9]+;/, `DEVELOPMENT_TEAM = ${APPLE_TEAM_ID};`)
          : line,
      );
      continue;
    }

    normalizedLines.push(line);
    const indent = line.match(/^\s*/)?.[0] ?? '';
    let followingIndex = index + 1;
    while (
      followingIndex < projectLines.length
      && (
        projectLines[followingIndex].trim() === ''
        || projectLines[followingIndex].trim().startsWith('DEVELOPMENT_TEAM =')
      )
    ) {
      followingIndex += 1;
    }
    normalizedLines.push(`${indent}DEVELOPMENT_TEAM = ${APPLE_TEAM_ID};`);
    index = followingIndex - 1;
  }
  source = normalizedLines.join('\n');

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
await enforceNoTrackingAdMob();
await normalizeXcodeIdentity();
await verifyArtwork();
