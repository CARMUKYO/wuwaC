import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

/**
 * GitHub Actions workflows: every file parses, every action is pinned to a
 * full commit SHA, and the game-data sync keeps its write token away from
 * npm. js-yaml is a devDependency without @types (deliberately), so it is
 * loaded through createRequire with a narrow type for the one function used.
 */
const require = createRequire(import.meta.url);
const { load } = require('js-yaml') as { load: (text: string) => unknown };

const dir = new URL('../.github/workflows/', import.meta.url);
const files = readdirSync(dir).filter((name) => name.endsWith('.yml'));

interface Step {
  uses?: string;
  run?: string;
}
interface Job {
  permissions?: Record<string, string>;
  needs?: string;
  if?: string;
  steps: Step[];
}
interface Workflow {
  on: Record<string, unknown>;
  permissions?: Record<string, string>;
  concurrency?: { group: string };
  jobs: Record<string, Job>;
}

function workflow(name: string): Workflow {
  return load(readFileSync(new URL(name, dir), 'utf8')) as Workflow;
}

describe('workflow files', () => {
  it.each(files)('%s parses and pins every action to a full commit SHA', (name) => {
    const parsed = workflow(name);
    expect(Object.keys(parsed.jobs).length).toBeGreaterThan(0);
    for (const job of Object.values(parsed.jobs)) {
      for (const step of job.steps) {
        if (step.uses !== undefined) expect(step.uses).toMatch(/^actions\/[a-z-]+@[0-9a-f]{40}$/);
      }
    }
  });
});

describe('sync-gamedata.yml', () => {
  const sync = workflow('sync-gamedata.yml');

  it('runs weekly and on demand, one run at a time, read-only by default', () => {
    expect(Object.keys(sync.on).sort()).toEqual(['schedule', 'workflow_dispatch']);
    expect(sync.permissions).toEqual({ contents: 'read' });
    expect(sync.concurrency?.group).toBe('gamedata-sync');
  });

  it('works on the weekly cron: never reads github.event.repository (absent from schedule payloads)', () => {
    const text = readFileSync(new URL('sync-gamedata.yml', dir), 'utf8');
    expect(text).not.toContain('github.event.repository');
    const runs = sync.jobs['open-pr'].steps.map((s) => s.run ?? '').join('\n');
    expect(runs).toContain('gh api "repos/$GITHUB_REPOSITORY" --jq .default_branch');
  });

  it('proposes a PR only for real data changes, not a timestamp-only resync', () => {
    const detect = sync.jobs.sync.steps.find((s) => (s.run ?? '').includes('changed='));
    expect(detect?.run).toContain('scripts/gamedata-summary.ts --changed');
  });

  it('syncs and runs every gate in a read-only job', () => {
    const job = sync.jobs.sync;
    expect(job.permissions).toEqual({ contents: 'read' });
    const runs = job.steps.map((s) => s.run ?? '').join('\n');
    for (const command of ['npm ci', 'npm run sync', 'npm run lint', 'npm run test', 'npm run build', 'scripts/gamedata-summary.ts']) {
      expect(runs).toContain(command);
    }
  });

  it('opens the PR from a write job that runs no npm and never auto-merges', () => {
    const job = sync.jobs['open-pr'];
    expect(job.needs).toBe('sync');
    expect(job.permissions).toEqual({ contents: 'write', 'pull-requests': 'write' });
    const runs = job.steps.map((s) => s.run ?? '').join('\n');
    expect(runs).not.toMatch(/\bnpm\b|\bnpx\b|\bnode\b|\byarn\b|\bpnpm\b/);
    expect(runs).toContain('gh pr create');
    expect(runs).not.toMatch(/gh pr merge|--auto/);
    expect(job.steps.map((s) => s.uses?.split('@')[0]).filter(Boolean)).toEqual([
      'actions/checkout',
      'actions/download-artifact',
    ]);
  });
});

describe('origin move: two deploy modes, one repo of record', () => {
  it('opens game-data sync PRs only from wuwa-opt/wuwaC, never the old moved repo', () => {
    const sync = workflow('sync-gamedata.yml');
    for (const job of Object.values(sync.jobs)) {
      expect(job.if).toContain("github.repository == 'wuwa-opt/wuwaC'");
    }
  });

  it('deploy builds moved mode from the MOVED_TO repo variable, and keeps least privilege', () => {
    const deploy = workflow('deploy.yml');
    const build = deploy.jobs.build.steps.find((s) => s.run === 'npm run build') as
      | (Step & { env?: Record<string, string> })
      | undefined;
    expect(build?.env).toEqual({ VITE_MOVED_TO: '${{ vars.MOVED_TO }}' });
    expect(deploy.permissions).toEqual({ contents: 'read' });
    expect(deploy.jobs.build.permissions).toBeUndefined();
    expect(deploy.jobs.deploy.permissions).toEqual({ pages: 'write', 'id-token': 'write' });
  });
});
