import { VILLAGES, THREE_VOWS, WORLD, CLANS } from './world'

/**
 * M0 shell. This is scaffolding that proves the stack, the lore and the
 * build pipeline hang together; the pixel UI kit, overworld and battle
 * engine replace it over M1-M3.
 */
export function App() {
  return (
    <main className="shell">
      <header>
        <h1 className="title">YAHRAH</h1>
        <p className="subtitle">Wardens of the Weave</p>
      </header>

      <section className="panel" aria-labelledby="world-heading">
        <h2 id="world-heading">The Land</h2>
        <p>
          Yahrah is a land of seven hidden villages, bound together by {WORLD.weave} — a living net
          of light and signal that carries everything anyone depends on.
        </p>
        <p>
          Where the Ori tears, a {WORLD.rift} opens, and {WORLD.threats} pour through: shadow-things
          with shapes borrowed from real attacks. You are an Itoshi, a threadbearer, and you will
          learn to read them, catch them, and close the tear behind them.
        </p>
      </section>

      <section className="panel" aria-labelledby="vows-heading">
        <h2 id="vows-heading">{WORLD.charter}</h2>
        {THREE_VOWS.map((vow) => (
          <div className="vow" key={vow.id}>
            <strong>{vow.title}</strong>
            <span>{vow.text}</span>
          </div>
        ))}
      </section>

      <section className="panel" aria-labelledby="clans-heading">
        <h2 id="clans-heading">The Three Clans</h2>
        {CLANS.map((clan) => (
          <p key={clan.id}>
            <strong>{clan.name}</strong> ({clan.gloss}) — {clan.blurb}
          </p>
        ))}
      </section>

      <section className="panel" aria-labelledby="villages-heading">
        <h2 id="villages-heading">The Seven Villages</h2>
        <ul className="villages">
          {VILLAGES.map((village) => (
            <li className="village" key={village.id}>
              <span>
                <span className="village-name">{village.name}</span>
                <span className="village-teaches">
                  {village.epithet} — {village.teaches}
                </span>
              </span>
              <span
                className={village.status === 'open' ? 'badge badge-open' : 'badge badge-planned'}
              >
                {village.status === 'open' ? 'OPEN' : 'SOON'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="footnote">
        Everything in Yahrah is simulated. No lab in this game touches a real network, host or
        account.
      </p>
    </main>
  )
}
