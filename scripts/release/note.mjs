const marker = (name, sha) => `<!-- repair2-release-${name}: ${sha} -->`;

export function genDefaultReleaseNote() {
  return "";
}

export function addReleaseMarkers(body, baseSha, headSha) {
  return `${body.trim()}\n\n${marker("base", baseSha)}\n${marker("head", headSha)}\n`;
}

export function parseReleaseMarkers(body = "") {
  const baseSha = body.match(/<!-- repair2-release-base: ([0-9a-f]{40}) -->/i)?.[1];
  const headSha = body.match(/<!-- repair2-release-head: ([0-9a-f]{40}) -->/i)?.[1];
  if (!baseSha || !headSha)
    throw new Error("Release PR body is missing its base/head SHA markers.");
  return { baseSha: baseSha.toLowerCase(), headSha: headSha.toLowerCase() };
}
