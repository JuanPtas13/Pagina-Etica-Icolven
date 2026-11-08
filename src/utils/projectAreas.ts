import { normalizeText } from './format';

export const PROJECT_AREAS = [
  { value: 'etica', label: 'Ética' },
  { value: 'filosofia', label: 'Filosofía' },
  { value: 'gabinete', label: 'Gabinete' },
] as const;

export type ProjectArea = (typeof PROJECT_AREAS)[number]['value'];

export function getProjectArea(categoryName: string | null | undefined): ProjectArea | '' {
  const normalizedName = normalizeText(categoryName ?? '');
  return PROJECT_AREAS.find((area) => normalizeText(area.label) === normalizedName)?.value ?? '';
}

export function isProjectAreaCategory(categoryName: string | null | undefined): boolean {
  return getProjectArea(categoryName) !== '';
}
