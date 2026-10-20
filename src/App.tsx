import { useEffect } from 'react'
import { useGame } from '@/state/store'
import { TitleScreen } from '@/screens/TitleScreen'
import { VowsScreen } from '@/screens/VowsScreen'
import { HomeScreen } from '@/screens/HomeScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { CodexScreen } from '@/screens/CodexScreen'
import { OverworldScreen } from '@/screens/OverworldScreen'
import { DashboardScreen } from '@/screens/DashboardScreen'
import { BattleScreen } from '@/screens/BattleScreen'
import { LabScreen } from '@/screens/LabScreen'
import { LessonScreen } from '@/screens/LessonScreen'
import { VillageScreen } from '@/screens/VillageScreen'
import { Button } from '@/ui/Button'
import { Panel } from '@/ui/Panel'

/** A stored save that will not parse. Never silently discarded. */
function CorruptScreen() {
  const { corruptReason, startFresh } = useGame()
  return (
    <div className="screen">
      <h1 className="screen-title">Your save could not be read</h1>
      <Panel id="corrupt" tone="warn">
        <p>Yahrah found a save on this device but could not make sense of it.</p>
        <p className="notice notice-bad">{corruptReason}</p>
        <p className="footnote">
          Nothing has been deleted. If you have an exported save file, you can import it from
          Settings after starting fresh.
        </p>
      </Panel>
      <Button full variant="danger" onClick={() => void startFresh()}>
        Start a new save
      </Button>
    </div>
  )
}

export function App() {
  const { screen, boot, init, ready } = useGame()

  useEffect(() => {
    void init()
  }, [init])

  if (!ready) {
    return (
      <main className="shell">
        <p className="subtitle" role="status">
          Weaving…
        </p>
      </main>
    )
  }

  if (boot === 'corrupt') {
    return (
      <main className="shell">
        <CorruptScreen />
      </main>
    )
  }

  return (
    <main className="shell">
      {screen === 'title' && <TitleScreen />}
      {screen === 'vows' && <VowsScreen />}
      {screen === 'home' && <HomeScreen />}
      {screen === 'settings' && <SettingsScreen />}
      {screen === 'codex' && <CodexScreen />}
      {screen === 'overworld' && <OverworldScreen />}
      {screen === 'dashboard' && <DashboardScreen />}
      {screen === 'battle' && <BattleScreen />}
      {screen === 'lab' && <LabScreen />}
      {screen === 'lesson' && <LessonScreen />}
      {screen === 'village' && <VillageScreen />}
    </main>
  )
}
