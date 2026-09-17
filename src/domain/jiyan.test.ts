import { describe, expect, it } from 'vitest';
import { loadBundledSnapshot } from '../data/index.ts';
import { JIYAN_OUTRO_LANCE_MV, JIYAN_S5_OUTRO_MULTIPLIER, jiyanOutroLanceSpec } from './jiyan.ts';

const snapshot = loadBundledSnapshot();
const jiyan = snapshot.characters.find((c) => c.id === 'jiyan')!;
const outro = jiyan.skills.find((s) => s.kind === 'outro')!;
const basic = jiyan.skills.find((s) => s.kind === 'basic')!;

describe('jiyanOutroLanceSpec', () => {
  it('matches Jiyan outro blocks with an empty motion name only', () => {
    expect(jiyanOutroLanceSpec('jiyan', outro, '')).toEqual({ motionValue: JIYAN_OUTRO_LANCE_MV });
    expect(jiyanOutroLanceSpec('jiyan', outro, 'Lance')).toBeNull();
    expect(jiyanOutroLanceSpec('jiyan', basic, '')).toBeNull();
    expect(jiyanOutroLanceSpec('yinlin', outro, '')).toBeNull();
    expect(jiyanOutroLanceSpec(undefined, outro, '')).toBeNull();
  });

  it('pins the prose motion value (313.40% of ATK, skill 1001109)', () => {
    expect(JIYAN_OUTRO_LANCE_MV).toBeCloseTo(3.134, 10);
    expect(outro.description ?? '').toContain('313.40%');
  });

  it('folds the S5 +120% outro multiplier into the motion value', () => {
    expect(JIYAN_S5_OUTRO_MULTIPLIER).toBeCloseTo(2.2, 10);
    expect(jiyanOutroLanceSpec('jiyan', outro, '', 4)).toEqual({ motionValue: JIYAN_OUTRO_LANCE_MV });
    expect(jiyanOutroLanceSpec('jiyan', outro, '', 5)?.motionValue).toBeCloseTo(
      JIYAN_OUTRO_LANCE_MV * 2.2,
      10,
    );
    expect(jiyanOutroLanceSpec('jiyan', outro, '', 6)?.motionValue).toBeCloseTo(
      JIYAN_OUTRO_LANCE_MV * 2.2,
      10,
    );
  });
});
