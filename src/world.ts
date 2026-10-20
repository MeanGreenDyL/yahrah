/**
 * The world of Yahrah. All original: no borrowed characters, place names,
 * art or music. Village names follow a hidden-village naming convention
 * (invented roots + the common Japanese suffix -mura, "village").
 */

export const WORLD = {
  land: 'Yahrah',
  /** The living network that carries everything in Yahrah. */
  weave: 'the Ori',
  /** A tear in the Ori, through which hostile code pours. */
  rift: 'Sakeme',
  /** Manifested threats - the collectibles you battle and catalogue. */
  threats: 'Kagemono',
  /** Defensive constructs you equip as a loadout - the security controls. */
  wards: 'Mamori',
  /** Real industry tools, earned as cards. Real names, original art. */
  tools: 'Dougu',
  /** The in-game ethics charter, shown on first run and never skippable. */
  charter: 'The Three Vows',
} as const

/** Rank ladder. The player begins as an Itoshi. */
export const RANKS = [
  { id: 'itoshi', name: 'Itoshi', gloss: 'Threadbearer', fromLevel: 1 },
  { id: 'oribe', name: 'Oribe', gloss: 'Weaver', fromLevel: 6 },
  { id: 'kagemi', name: 'Kagemi', gloss: 'Shadowreader', fromLevel: 14 },
  { id: 'tatenushi', name: 'Tatenushi', gloss: 'Wardmaster', fromLevel: 25 },
  { id: 'orinushi', name: 'Orinushi', gloss: 'Weavemaster', fromLevel: 40 },
] as const

/** The three clans. You pledge to one, and may re-pledge later. */
export const CLANS = [
  {
    id: 'akazora',
    name: 'Akazora',
    gloss: 'Red Sky',
    discipline: 'offence',
    blurb: 'They test the walls so the walls can be trusted. Recon, exploitation, reporting.',
  },
  {
    id: 'aoyane',
    name: 'Aoyane',
    gloss: 'Blue Roof',
    discipline: 'defence',
    blurb: 'They keep the roof on. Detection engineering, monitoring, response, forensics.',
  },
  {
    id: 'fujizome',
    name: 'Fujizome',
    gloss: 'Wisteria-Dyed',
    discipline: 'both',
    blurb: 'Dyed by both skies. They attack, then write the detection for what they just did.',
  },
] as const

/**
 * The seven hidden villages. Each maps to a Security+ domain and the CSF 2.0
 * Functions it exercises. Only Hakumura is built out so far.
 */
export const VILLAGES = [
  {
    id: 'hakumura',
    name: 'Hakumura',
    epithet: 'The Village Hidden in First Light',
    element: 'signal',
    domainId: 'SP.1',
    teaches: 'General Security Concepts',
    status: 'open',
  },
  {
    id: 'kazanmura',
    name: 'Kazanmura',
    epithet: 'The Village Hidden in the Emberfall',
    element: 'ember',
    domainId: 'SP.2',
    teaches: 'Threats, Vulnerabilities and Mitigations',
    status: 'planned',
  },
  {
    id: 'tetsumura',
    name: 'Tetsumura',
    epithet: 'The Village Hidden in the Iron Reach',
    element: 'iron',
    domainId: 'SP.3',
    teaches: 'Security Architecture',
    status: 'planned',
  },
  {
    id: 'yoimura',
    name: 'Yoimura',
    epithet: 'The Village Hidden in the Long Night',
    element: 'shade',
    domainId: 'SP.4',
    teaches: 'Security Operations',
    status: 'planned',
  },
  {
    id: 'fumimura',
    name: 'Fumimura',
    epithet: 'The Village Hidden in the Thousand Writs',
    element: 'writ',
    domainId: 'SP.5',
    teaches: 'Security Program Management and Oversight',
    status: 'planned',
  },
  {
    id: 'reimura',
    name: 'Reimura',
    epithet: 'The Village Hidden in the Thinking Fog',
    element: 'mind',
    domainId: 'SP.2',
    teaches: 'AI and machine-learning security',
    status: 'planned',
  },
  {
    id: 'zenimura',
    name: 'Zenimura',
    epithet: 'The Village Hidden in the Coin Vault',
    element: 'coin',
    domainId: 'SP.1',
    teaches: 'Cryptography, blockchain and wallet security',
    status: 'planned',
  },
] as const

/** The Three Vows: the ethics charter every lab brief refers back to. */
export const THREE_VOWS = [
  {
    id: 'mandate',
    title: 'The Vow of Mandate',
    text: 'I act only where I am authorised. Permission is given in writing, by someone with the standing to give it, before I begin.',
  },
  {
    id: 'bounds',
    title: 'The Vow of Bounds',
    text: 'I stay inside the scope I was given. What lies outside it is not mine to touch, however easy the door.',
  },
  {
    id: 'telling',
    title: 'The Vow of Telling',
    text: 'What I find, I report — to the ones who can fix it, in time for them to fix it. I do not trade on a weakness, and I do not hoard it.',
  },
] as const

export type Village = (typeof VILLAGES)[number]
export type Clan = (typeof CLANS)[number]
export type Rank = (typeof RANKS)[number]

/** The rank held at a given level. */
export function rankForLevel(level: number): Rank {
  let held: Rank = RANKS[0]
  for (const rank of RANKS) if (level >= rank.fromLevel) held = rank
  return held
}
