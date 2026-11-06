import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { INDEX_PATH, parseIndex, renderTable, TABLE_PATH, serializeIndex } from './model.mjs';
import {
  git,
  sourcesAt,
  github,
  validateLocal,
  workingSources,
  reconcileRepository,
  writeGenerated,
} from './repository.mjs';

export function context(env = process.env) {
  const remote =
    env.GITHUB_REPOSITORY ??
    git('remote', 'get-url', 'origin')
      .replace(/^git@github\.com:|^https:\/\/github\.com\//, '')
      .replace(/\.git$/, '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(remote)) throw new Error('Set GITHUB_REPOSITORY=owner/repo');
  return { repository: remote, defaultBranch: env.DECISIONS_DEFAULT_BRANCH ?? 'main' };
}
export function main(args = process.argv.slice(2)) {
  const [mode = 'validate', ...flags] = args;
  const { repository, defaultBranch } = context();
  const base = flags.length ? flags[1] : undefined;
  if (flags.length && (flags.length !== 2 || flags[0] !== '--base'))
    throw new Error('Expected --base <full SHA>');
  if (mode === 'validate') {
    const { index } = validateLocal(repository, defaultBranch, base);
    // Generated mappings in a PR must also be verified against GitHub, not merely self-consistent.
    if (base && git('diff', '--name-only', base, '--', INDEX_PATH)) {
      // This PR's own newly added record is unmerged; only baseline records can be published.
      const expected = reconcileRepository(repository, defaultBranch, sourcesAt(base));
      if (serializeIndex(index) !== serializeIndex(expected))
        throw new Error('Metadata does not match original merged PRs');
    }
    console.log('Decision records, historical immutability and generated table validated.');
  } else if (mode === 'preview') {
    const index = parseIndex(readFileSync(INDEX_PATH, 'utf8'), repository, defaultBranch);
    process.stdout.write(renderTable(index));
  } else if (mode === 'reconcile' || mode === 'reconcile:check') {
    const actual = github(repository)('');
    if (actual.default_branch !== defaultBranch)
      throw new Error('Set DECISIONS_DEFAULT_BRANCH to the repository default branch');
    const index = reconcileRepository(repository, defaultBranch, workingSources());
    if (mode === 'reconcile:check') {
      if (
        !existsSync(INDEX_PATH) ||
        readFileSync(INDEX_PATH, 'utf8') !== serializeIndex(index) ||
        !existsSync(TABLE_PATH) ||
        readFileSync(TABLE_PATH, 'utf8') !== renderTable(index)
      )
        throw new Error('Reconciliation needed');
    } else {
      console.log(
        writeGenerated(index)
          ? 'Generated decision metadata and table updated.'
          : 'Already reconciled; no changes.'
      );
    }
  } else throw new Error('Use validate, preview, reconcile or reconcile:check');
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
