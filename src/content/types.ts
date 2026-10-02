export type Lang = 'en' | 'mk';

/** Language-independent facts about a monument. Order = scroll order. */
export interface MonumentMeta {
  id: string;
  /** Which side of the frame the story text sits on; the monument is framed on the other side. */
  text: 'left' | 'right';
}

export interface Stat {
  value: string;
  label: string;
}

export interface MonumentText {
  name: string;
  /** Name in the other language; used only as schema.org alternateName, never shown on the page. */
  altName: string;
  /** Where in the centre it stands, e.g. "Macedonia Square". */
  place: string;
  tagline: string;
  paragraphs: string[];
  stats: Stat[];
}

export interface SiteText {
  lang: Lang;
  htmlLang: string;
  title: string;
  description: string;
  ogImageAlt: string;
  ogLocale: string;
  skipLink: string;
  brand: string;
  brandSub: string;
  switchLabel: string;
  switchName: string;
  menu: { open: string; close: string; title: string };
  loading: string;
  hero: {
    chapter: string;
    lines: string[];
    lead: string;
    cta: string;
    note: string;
    stats: Stat[];
    vertical: string;
  };
  chapterWord: string;
  railLabel: string;
  outro: { lines: string[]; body: string; note: string; top: string };
  footer: string;
  noWebgl: string;
  monuments: Record<string, MonumentText>;
}
