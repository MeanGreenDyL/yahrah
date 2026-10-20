import { useRef, useState } from 'react'
import { useGame } from '@/state/store'
import { Panel } from '@/ui/Panel'
import { Button } from '@/ui/Button'
import { chiptune } from '@/audio/chiptune'

export function SettingsScreen() {
  const { save, setSettings, go, exportText, importFrom, backend } = useGame()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const download = () => {
    const blob = new Blob([exportText()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yahrah-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Save exported.')
    setError(null)
  }

  const upload = async (file: File) => {
    try {
      await importFrom(await file.text())
      setMessage('Save imported.')
      setError(null)
    } catch (err) {
      setError((err as Error).message)
      setMessage(null)
    }
  }

  return (
    <div className="screen">
      <h1 className="screen-title">Settings</h1>

      <Panel id="audio" title="Sound">
        <div className="setting-row">
          <label htmlFor="audio-toggle">Chiptune audio</label>
          <input
            id="audio-toggle"
            type="checkbox"
            checked={save.settings.audio}
            onChange={(e) => {
              setSettings({ audio: e.target.checked })
              // Confirm audibly that it worked, now we are inside a gesture.
              if (e.target.checked) chiptune.play('confirm')
            }}
          />
        </div>
        <p className="footnote">
          Off by default. All sound is generated in the browser — there are no audio files in this
          game.
        </p>
      </Panel>

      <Panel id="motion" title="Motion">
        <div className="setting-row">
          <label htmlFor="motion-select">Animation</label>
          <select
            id="motion-select"
            value={save.settings.motion}
            onChange={(e) =>
              setSettings({ motion: e.target.value as 'auto' | 'full' | 'reduced' })
            }
          >
            <option value="auto">Follow my device</option>
            <option value="full">Full</option>
            <option value="reduced">Reduced</option>
          </select>
        </div>
      </Panel>

      <Panel id="text" title="Text size">
        <div className="setting-row">
          <label htmlFor="text-scale">Scale</label>
          <input
            id="text-scale"
            type="range"
            min="0.8"
            max="1.6"
            step="0.1"
            value={save.settings.textScale}
            onChange={(e) => setSettings({ textScale: Number(e.target.value) })}
          />
          <span aria-hidden="true">{save.settings.textScale.toFixed(1)}x</span>
        </div>
      </Panel>

      <Panel id="save" title="Your save">
        <p className="footnote">
          Stored on this device only ({backend}). Nothing is uploaded anywhere — Yahrah has no
          server and makes no network calls.
        </p>
        <div className="button-row">
          <Button onClick={download}>Export save</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}>
            Import save
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
        {message && <p className="notice notice-good">{message}</p>}
        {error && <p className="notice notice-bad">{error}</p>}
      </Panel>

      <Button variant="ghost" full onClick={() => go(save.profile.vowsAccepted ? 'home' : 'title')}>
        Back
      </Button>
    </div>
  )
}
