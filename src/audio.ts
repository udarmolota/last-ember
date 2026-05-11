export let audioCtx: AudioContext | null = null

export function initAudio() {
  if (audioCtx) return audioCtx
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!Ctx) return null
  audioCtx = new Ctx()
  return audioCtx
}

export function playBeep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.07) {
  const ctx = initAudio()
  if (!ctx) return
  if (ctx.state === 'suspended') ctx.resume()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  gain.gain.setValueAtTime(volume, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + duration)
}

export const SFX = {
  click: () => playBeep(620, 0.07, 'square', 0.045),
  msg:   () => playBeep(440, 0.045, 'sine', 0.045),
  up:    () => { playBeep(420, 0.06, 'sine', 0.045); setTimeout(() => playBeep(820, 0.06, 'sine', 0.04), 55) },
  down:  () => playBeep(260, 0.12, 'sawtooth', 0.04),
  warn:  () => playBeep(180, 0.16, 'sawtooth', 0.045),
}

document.addEventListener('pointerdown', () => {
  const ctx = initAudio()
  if (ctx && ctx.state === 'suspended') ctx.resume()
}, { once: true })

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement
  if (t.closest('button,.qb,.cpc,.hbtn,.btab,.bcat,.bb,.mb2,.cc,.tile,#phint,.cds'))
    SFX.click()
}, true)