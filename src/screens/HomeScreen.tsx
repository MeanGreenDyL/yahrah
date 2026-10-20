import { useEffect } from 'react'
import { useState } from 'react'
import { useGame } from '@/state/store'
import { Panel } from '@/ui/Panel'
import { Meter } from '@/ui/Meter'
import { Menu } from '@/ui/Menu'
import { Button } from '@/ui/Button'
import { VILLAGES, rankForLevel } from '@/world'
import { xpIntoLevel, xpForNextLevel } from '@/engine/progression'

export function HomeScreen() {
  const { save, go, markPlayedToday, beginDailySession } = useGame()
  const [nothingDue, setNothingDue] = useState(false)
  const rank = rankForLevel(save.profile.level)

  // Opening the home screen counts as showing up today.
  useEffect(() => {
    markPlayedToday()
  }, [markPlayedToday])

  return (
    <div className="screen">
      <header className="home-header">
        <div>
          <h1 className="screen-title">{save.profile.name}</h1>
          <p className="subtitle">
            {rank.name} <span className="gloss">({rank.gloss})</span>
          </p>
        </div>
        <div className="streak" title="Days in a row">
          <span className="streak-count">{save.streak.current}</span>
          <span className="streak-label">day streak</span>
        </div>
      </header>

      <Panel id="xp">
        <Meter
          label={`Level ${save.profile.level}`}
          value={xpIntoLevel(save.profile.xp)}
          max={xpForNextLevel(save.profile.level)}
          tone="xp"
        />
      </Panel>

      <Panel id="villages" title="The Seven Villages">
        <Menu
          label="Villages"
          items={VILLAGES.map((v) => ({
            id: v.id,
            label: v.name,
            hint: v.status === 'open' ? v.teaches : 'Sealed for now',
            disabled: v.status !== 'open',
          }))}
          onSelect={(id) => go(id === 'hakumura' ? 'village' : 'overworld')}
        />
      </Panel>

      <Button
        full
        onClick={() => {
          const started = beginDailySession()
          if (!started) setNothingDue(true)
        }}
      >
        Today's training
      </Button>
      {nothingDue && (
        <p className="notice notice-good">
          Nothing is due today — everything you have studied is still fresh. Travel to a village
          for new ground.
        </p>
      )}

      <div className="button-row">
        <Button variant="ghost" onClick={() => go('overworld')}>
          Travel
        </Button>
        <Button variant="ghost" onClick={() => go('dashboard')}>
          Progress
        </Button>
      </div>

      <div className="button-row">
        <Button variant="ghost" onClick={() => go('codex')}>
          Codex
        </Button>
        <Button variant="ghost" onClick={() => go('settings')}>
          Settings
        </Button>
      </div>
    </div>
  )
}
