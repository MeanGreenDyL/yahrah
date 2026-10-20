import { useGame } from '@/state/store'
import { Menu } from '@/ui/Menu'
import { Sprite } from '@/ui/Sprite'
import { CREST } from '@/ui/crest'
import { rankForLevel } from '@/world'

export function TitleScreen() {
  const { save, go, acceptVows } = useGame()
  const rank = rankForLevel(save.profile.level)

  return (
    <div className="screen screen-centred">
      <div className="crest">
        <Sprite data={CREST} scale={6} label="The crest of Yahrah: four threads bound at an eye" />
      </div>
      <h1 className="title">YAHRAH</h1>
      <p className="subtitle">Wardens of the Weave</p>

      <p className="title-rank">
        {save.profile.name} &middot; {rank.name} <span className="gloss">({rank.gloss})</span>
      </p>

      <Menu
        label="Main menu"
        items={[
          save.profile.vowsAccepted
            ? { id: 'continue', label: 'Continue', hint: `Level ${save.profile.level}` }
            : { id: 'begin', label: 'Begin your training' },
          { id: 'codex', label: 'Codex', hint: 'Lore and glossary' },
          { id: 'settings', label: 'Settings' },
        ]}
        onSelect={(id) => {
          if (id === 'begin') {
            go('vows')
          } else if (id === 'continue') {
            acceptVows()
          } else if (id === 'codex') {
            go('codex')
          } else {
            go('settings')
          }
        }}
      />
    </div>
  )
}
