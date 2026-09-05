const marker = (name, sha) => `<!-- repair2-release-${name}: ${sha} -->`;

/**
 * @typedef {object} ChangedFile
 * @property {string} status
 * @property {string} path
 * @property {string} [previousPath]
 */

/**
 * @typedef {object} ReleaseCommit
 * @property {string} sha
 * @property {string} shortSha
 * @property {string} subject
 * @property {string} body
 * @property {string} authorName
 * @property {string} authoredAt
 * @property {ChangedFile[]} changedFiles
 */

/**
 * @typedef {object} ReleaseNoteContext
 * @property {{
 *   previousVersion: string,
 *   version: string,
 *   tag: string,
 *   prerelease: boolean
 * }} app
 * @property {{
 *   baseBranch: string,
 *   headBranch: string,
 *   baseSha: string,
 *   headSha: string,
 *   remoteUrl: string,
 *   repositoryUrl: string | null,
 *   compareUrl: string | null
 * }} git
 * @property {ReleaseCommit[]} commits
 * @property {{
 *   changed: boolean,
 *   name: string,
 *   previousVersion: string,
 *   version: string,
 *   commits: ReleaseCommit[],
 *   changedFiles: ChangedFile[]
 * }} sdk
 * @property {{
 *   changedFiles: ChangedFile[],
 *   files: number,
 *   insertions: number,
 *   deletions: number,
 *   binaryFiles: number
 * }} changes
 */

const SDK_BASE_URL = "https://www.npmjs.com/package/";

const CollectingConventions = {
  feat: "새로운 기능",
  fix: "버그 픽스"
};

/**
 * @param {ReleaseNoteContext} context
 * @returns {string}
 */
export function genDefaultReleaseNote(context) {
  let releaseNote = `# RepairV${context.app.version}`;
  if (context.sdk.changed) {
    const SDK_URL = `${SDK_BASE_URL}${context.sdk.name}`;
    releaseNote += `\n\n## [Plugin SDK](${SDK_URL})\n- [${context.sdk.version}](${SDK_URL}/v/${context.sdk.version}) 배포`;
  }
  releaseNote += `\n\n## Relase Note`;

  const collected = Object.fromEntries(Object.keys(CollectingConventions).map((k) => [k, []]));
  const others = [];

  context.commits.forEach((c) => {
    const trimmedBody = c.body.trim().toLowerCase();
    if (trimmedBody.endsWith("#nn") || trimmedBody.endsWith("#nonote")) return;

    const arr = c.subject.split(/\s*:\s*/, 2);
    const [convention, subject] =
      arr.length >= 2 && !arr[0].trim().match(/[^a-zA-Z]/)
        ? [arr.shift().toLowerCase().trim(), arr.join(":")]
        : [null, c.subject];

    const note = `- ${commitToLink(context.git.repositoryUrl, c)} ${subject}`;

    (convention && Object.hasOwn(collected, convention) ? collected[convention] : others).push(
      note
    );
  });

  Object.entries(collected).map(([k, notes]) => {
    if (notes.length <= 0) return;

    releaseNote += `\n### ${CollectingConventions[k]}\n${notes.join("\n")}`;
  });

  if (others.length > 0) releaseNote += `\n### 변경 사항\n${others.join("\n")}`;

  return releaseNote;
}

/**
 * @param {string | null} repoUrl
 * @param {ReleaseCommit} commit
 * @returns {string}
 */
function commitToLink(repoUrl, commit) {
  if (repoUrl) return `[\`${commit.shortSha}\`](${repoUrl}/commit/${commit.sha})`;
  return `\`${commit.shortSha}\``;
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
