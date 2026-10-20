import { useGame } from '@/state/store'
import { Panel } from '@/ui/Panel'
import { Button } from '@/ui/Button'
import { CLANS, RANKS, VILLAGES, WORLD, THREE_VOWS } from '@/world'

/**
 * The encyclopedia. For now it holds the world's own terms; creature,
 * tool and glossary entries join it as content lands.
 */
export function CodexScreen() {
  const { go, save } = useGame()

  return (
    <div className="screen">
      <h1 className="screen-title">Codex</h1>

      <Panel id="codex-world" title="The Weave">
        <p>
          <strong>{WORLD.weave}</strong> — the living net of light and signal that carries
          everything in Yahrah. A tear in it is a <strong>{WORLD.rift}</strong>.
        </p>
        <p>
          <strong>{WORLD.threats}</strong> — shadow-things that pour through a Sakeme. Each one
          wears the shape of a real attack.
        </p>
        <p>
          <strong>{WORLD.wards}</strong> — the defences you equip. <strong>{WORLD.tools}</strong> —
          the real instruments of the trade, earned as you go.
        </p>
      </Panel>

      <Panel id="codex-clans" title="Clans">
        {CLANS.map((clan) => (
          <p key={clan.id}>
            <strong>{clan.name}</strong> <span className="gloss">({clan.gloss})</span> —{' '}
            {clan.blurb}
          </p>
        ))}
      </Panel>

      <Panel id="codex-ranks" title="Ranks">
        <ul className="plain-list">
          {RANKS.map((rank) => (
            <li key={rank.id}>
              <strong>{rank.name}</strong> <span className="gloss">({rank.gloss})</span> — from
              level {rank.fromLevel}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="codex-villages" title="Villages">
        <ul className="plain-list">
          {VILLAGES.map((v) => (
            <li key={v.id}>
              <strong>{v.name}</strong> — {v.epithet}. {v.teaches}.
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="codex-vows" title="The Three Vows">
        {THREE_VOWS.map((vow) => (
          <div className="vow" key={vow.id}>
            <strong>{vow.title}</strong>
            <span>{vow.text}</span>
          </div>
        ))}
      </Panel>

      <Button variant="ghost" full onClick={() => go(save.profile.vowsAccepted ? 'home' : 'title')}>
        Back
      </Button>
    </div>
  )
}
