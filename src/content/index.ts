import { en } from './en';
import { mk } from './mk';
import type { Lang, SiteText } from './types';

export { MONUMENTS } from './monuments';
export type { Lang, SiteText, MonumentMeta, MonumentText, Stat } from './types';

export const SITES: Record<Lang, SiteText> = { en, mk };
