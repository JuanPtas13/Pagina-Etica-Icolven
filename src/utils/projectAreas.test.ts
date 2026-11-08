import { describe, expect, it } from 'vitest';
import { getProjectArea, isProjectAreaCategory, PROJECT_AREAS } from './projectAreas';

describe('project areas', () => {
  it('defines the three general areas', () => {
    expect(PROJECT_AREAS.map((area) => area.label)).toEqual(['Ética', 'Filosofía', 'Gabinete']);
  });

  it('matches labels regardless of accents or case', () => {
    expect(getProjectArea('ETICA')).toBe('etica');
    expect(getProjectArea('filosofia')).toBe('filosofia');
    expect(getProjectArea('Gabinete')).toBe('gabinete');
  });

  it('returns no area for an unrelated or missing category', () => {
    expect(getProjectArea('Ciencias')).toBe('');
    expect(getProjectArea(null)).toBe('');
  });

  it('identifies categories reserved for project areas', () => {
    expect(isProjectAreaCategory('Ética')).toBe(true);
    expect(isProjectAreaCategory('filosofia')).toBe(true);
    expect(isProjectAreaCategory('Gabinete')).toBe(true);
    expect(isProjectAreaCategory('Ciencias')).toBe(false);
  });
});
