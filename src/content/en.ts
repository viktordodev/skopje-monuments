import type { SiteText } from './types';

export const en: SiteText = {
  lang: 'en',
  htmlLang: 'en',
  title: 'Skopje — Nine Monuments of the Centre',
  description:
    'Nine landmarks of central Skopje, North Macedonia, in one interactive 3D scene — from the 6th-century Kale Fortress to the 66-metre Millennium Cross.',
  ogImageAlt: 'The Warrior on a Horse statue on Macedonia Square in Skopje, backlit by sun rays fanning across a violet sky.',
  ogLocale: 'en_US',
  skipLink: 'Skip to content',
  brand: 'Skopje',
  brandSub: 'From the square to the bazaar',
  switchLabel: 'Switch language',
  switchName: 'MK',
  menu: { open: 'Open chapters', close: 'Close chapters', title: 'Chapters' },
  loading: 'Sun is rising',
  hero: {
    chapter: 'Skopje, North Macedonia',
    lines: ['Built.', 'Shaken.', 'Rebuilt.'],
    lead: 'An earthquake wiped out Roman Scupi in 518; another devastated Skopje in 1963. Both times the city was rebuilt. Nine monuments from its centre carry that story — from the 6th-century walls of Kale to the bronze of the 2010s.',
    cta: 'Start at Macedonia Square',
    note: 'Real monuments. Imagined landscape.',
    vertical: 'SKOPJE',
    stats: [
      { value: 'VI', label: 'Century of Kale’s walls' },
      { value: '1469', label: 'Stone Bridge completed' },
      { value: '5:17', label: 'The 1963 earthquake' },
      { value: '66 m', label: 'Millennium Cross' },
    ],
  },
  chapterWord: 'Chapter',
  railLabel: 'Monuments',
  outro: {
    lines: ['The light goes.', 'The city stays.'],
    body: 'Skopje has been a Roman town, a Byzantine stronghold, an Ottoman trading city, a laboratory of Yugoslav architecture and, in the 2010s, the stage for a monumental makeover. Every layer is still standing within a short walk of the Stone Bridge.',
    note: 'Historical details are compiled from public encyclopaedic sources. The scene is an artistic interpretation.',
    top: 'Back to the square',
  },
  footer: 'Designed and built by Viktor Dodev with three.js.',
  noWebgl: 'Your browser cannot show the 3D scene, but the whole story is right here.',
  monuments: {
    warrior: {
      name: 'Warrior on a Horse',
      altName: 'Воин на коњ',
      place: 'Macedonia Square',
      tagline: 'A bronze rider rearing above the fountain at the heart of the square.',
      paragraphs: [
        'The centrepiece of Macedonia Square is a 12-metre bronze rider on a 10-metre column that doubles as a fountain, ringed by bronze soldiers and guarded by lions. Sculpted by Valentina Stevanovska and cast in Florence, it was unveiled on 8 September 2011, twenty years after the independence referendum.',
        'Its official name is simply “Warrior on a Horse”. A government minister said in 2010 that it was Alexander the Great, and the statue became part of the naming dispute with Greece. After the 2018 Prespa Agreement, a plaque was added stating that Alexander belongs to Hellenic civilisation.',
      ],
      stats: [
        { value: '12 m', label: 'Bronze rider' },
        { value: '10 m', label: 'Fountain column' },
        { value: '2011', label: 'Unveiled, 8 September' },
      ],
    },
    'porta-macedonia': {
      name: 'Porta Macedonia',
      altName: 'Порта Македонија',
      place: 'Pella Square',
      tagline: 'A triumphal arch for twenty years of independence.',
      paragraphs: [
        'Opened on 6 January 2012 and designed by Valentina Stevanovska, the 21-metre arch marks two decades of Macedonian independence. Some 193 square metres of marble reliefs show scenes from Macedonian history, and a lift and stairs lead up to a public roof.',
        'It is one of the best-known works of Skopje 2014, a government project that reshaped the centre with new monuments and neoclassical facades. Porta Macedonia cost €4.4 million and, like the whole project, drew both admiration and heated argument over cost and historical imagery.',
      ],
      stats: [
        { value: '21 m', label: 'Height' },
        { value: '193 m²', label: 'Marble reliefs' },
        { value: '2012', label: 'Opened, 6 January' },
      ],
    },
    'stone-bridge': {
      name: 'Stone Bridge',
      altName: 'Камен мост',
      place: 'Across the Vardar',
      tagline: 'Twelve arches between two Skopjes.',
      paragraphs: [
        'Built on Roman foundations between 1451 and 1469 under Sultan Mehmed II, the bridge joins the Old Bazaar to Macedonia Square. It is the emblem of the city and sits at the centre of Skopje’s coat of arms and flag.',
        'It has survived a great deal: an earthquake in 1555 that wrecked four of its piers, explosives laid by retreating German forces in 1944, and a refurbishment that closed it to walkers for over seven years from 1994.',
      ],
      stats: [
        { value: '1469', label: 'Completed under Mehmed II' },
        { value: '214 m', label: 'Long, 6 m wide' },
        { value: '12', label: 'Stone arches' },
      ],
    },
    'clock-tower': {
      name: 'Clock Tower',
      altName: 'Саат-кула',
      place: 'Old Bazaar',
      tagline: 'The bazaar’s timekeeper, heard across the whole city.',
      paragraphs: [
        'Raised between 1566 and 1572 beside the Sultan Murad Mosque, it is considered the first public clock tower in the Ottoman lands. Its clockwork was brought from the captured Hungarian town of Szigetvár, and its lower walls reuse a medieval defensive tower.',
        'The original was hexagonal with a wooden upper part. After the great fire of 1689 it kept its form until 1904, when it was rebuilt in brick to today’s height. The 1963 earthquake destroyed the mechanism; new clocks returned on 26 May 2008.',
      ],
      stats: [
        { value: '1572', label: 'Completed' },
        { value: '37 m', label: 'Height since 1904' },
        { value: '105', label: 'Steps to the clocks' },
      ],
    },
    'kursumli-an': {
      name: 'Kuršumli An',
      altName: 'Куршумли ан',
      place: 'Old Bazaar',
      tagline: 'An inn with a chimney for every room.',
      paragraphs: [
        'Kuršumli An was built around 1550 as a caravanserai in the Old Bazaar, the endowment of Muslihuddin Abdul Gani. Merchants’ goods filled its 28 ground-floor storerooms, while travellers slept in the 32 rooms above, each with its own fireplace, which is why chimneys line the roof. Its name comes from the lead (kurşun) that once covered its domes.',
        'Behind blank walls of stone laced with brick, two tiers of arches ring a courtyard with a fountain at its centre. In 1787 the inn became the provincial prison, and its cells held many revolutionaries in the last decades of Ottoman rule. Badly damaged in the 1963 earthquake, it was restored and now houses a collection of ancient stone monuments.',
      ],
      stats: [
        { value: '~1550', label: 'Built' },
        { value: '60', label: 'Rooms' },
        { value: '1787', label: 'Turned into a prison' },
      ],
    },
    kale: {
      name: 'Kale Fortress',
      altName: 'Скопско Кале',
      place: 'The hill above the river',
      tagline: 'The city’s oldest lookout, first to catch the light.',
      paragraphs: [
        'On the highest point above the Vardar, the fortress has watched over Skopje for around fifteen centuries. Its walls of yellow limestone and travertine were raised in the 6th century, partly from stones of the Roman city of Scupi, which an earthquake destroyed in 518.',
        'It has been a capital, a coronation site and a ruin. The 1963 earthquake brought down parts of it, and excavations since 2006 keep turning up the past — including the largest hoard of Byzantine coins ever found in Macedonia.',
      ],
      stats: [
        { value: 'VI', label: 'Century the walls rose' },
        { value: '1346', label: 'Coronation of Stefan Dušan' },
        { value: '2006', label: 'Excavations began' },
      ],
    },
    'mother-teresa': {
      name: 'Mother Teresa Memorial House',
      altName: 'Спомен-куќа на Мајка Тереза',
      place: 'Macedonia Street',
      tagline: 'Where a saint was born and baptised.',
      paragraphs: [
        'Anjezë Gonxhe Bojaxhiu was born in Skopje in 1910 and lived here until 1928, when she left to become Mother Teresa. The memorial house stands on Macedonia Street, on the site of the Sacred Heart of Jesus church where she was baptised — a church the 1963 earthquake destroyed.',
        'Designed by Vangel Božinovski, it opened on 30 January 2009: rough stone arches below, white cantilevered rooms above and a glass chapel on top. A small museum inside keeps part of her relics.',
      ],
      stats: [
        { value: '1910', label: 'Born in Skopje' },
        { value: '1928', label: 'Left the city' },
        { value: '2009', label: 'House opened' },
      ],
    },
    'old-station': {
      name: 'Old Railway Station',
      altName: 'Стара железничка станица',
      place: 'End of Macedonia Street',
      tagline: 'The clock that stopped at 5:17.',
      paragraphs: [
        'At 5:17 in the morning of 26 July 1963, the earthquake struck Skopje. The clock on the old railway station, rebuilt in 1940, stopped at that moment and has been kept that way ever since. The broken building became the Museum of the City of Skopje.',
        'The city rebuilt itself around new ideas. A new station and transport centre, built between 1971 and 1981 as part of the reconstruction plan led by Kenzo Tange, rests on earthquake-resistant concrete pillars.',
      ],
      stats: [
        { value: '5:17', label: 'The clock stopped' },
        { value: '1963', label: '26 July, the earthquake' },
        { value: '1940', label: 'Station rebuilt' },
      ],
    },
    'millennium-cross': {
      name: 'Millennium Cross',
      altName: 'Милениумски крст',
      place: 'Mount Vodno, above the centre',
      tagline: 'Lit by thousands of lights over the city.',
      paragraphs: [
        'On top of Mount Vodno, the 66-metre cross was completed in 2002 to mark two thousand years of Christianity in Macedonia. Its lattice frame recalls the Eiffel Tower, and it can be seen from almost anywhere in the centre.',
        'At night it is covered in thousands of lights. You can reach the summit by a 3.5-kilometre cable car, opened in 2011, and a lift inside the cross, added in 2018, climbs to the top.',
      ],
      stats: [
        { value: '66 m', label: 'Height' },
        { value: '2002', label: 'Completed' },
        { value: '3.5 km', label: 'Cable car' },
      ],
    },
  },
};
