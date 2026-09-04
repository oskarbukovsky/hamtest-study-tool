'use client'

import { useEffect, useMemo, useState } from 'react'
import data from '../data/questions.json'

type Answer = { answerId: string; text: string; isCorrect: boolean }
type Question = { questionId: string; questionCode: string; text: string; topicId: string; points: number; answers: Answer[] }
type Topic = { topicId: string; name: string; questionCount: number }
type TopicGroup = { topicGroupId: string; name: string; topics: Topic[] }
type Settings = { autoNext: boolean; delay: number; mode: 'random' | 'sequential'; shuffleAnswers: boolean }

const questions = data.questions as Question[]
const groups = data.groupedTopics as TopicGroup[]
const allTopics = groups.flatMap((group) => group.topics)
const defaultSettings: Settings = { autoNext: false, delay: 2, mode: 'sequential', shuffleAnswers: false }

function shuffle<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5) }

export default function Page() {
  const [view, setView] = useState<'practice' | 'settings'>('practice')
  const [topicId, setTopicId] = useState('all')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [randomOrder, setRandomOrder] = useState<number[]>([])

  useEffect(() => { try { const saved = localStorage.getItem('radiocards-settings'); if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) }) } catch {} }, [])
  useEffect(() => { localStorage.setItem('radiocards-settings', JSON.stringify(settings)) }, [settings])

  const filtered = useMemo(() => topicId === 'all' ? questions : questions.filter((question) => question.topicId === topicId), [topicId])
  const order = settings.mode === 'random' ? randomOrder : filtered.map((_, i) => i)
  const currentPosition = order.length ? order[index % order.length] : 0
  const question = filtered[currentPosition]
  const topic = allTopics.find((item) => item.topicId === question?.topicId)
  const answered = selected !== null
  const progress = filtered.length ? ((index % filtered.length) / filtered.length) * 100 : 0
  const answers = useMemo(() => settings.shuffleAnswers && question ? shuffle(question.answers) : question?.answers ?? [], [question, settings.shuffleAnswers, index])

  useEffect(() => { setRandomOrder(shuffle(filtered.map((_, i) => i))) }, [filtered.length, topicId])
  useEffect(() => { if (!answered || !settings.autoNext) return; const timer = window.setTimeout(() => next(), settings.delay * 1000); return () => window.clearTimeout(timer) }, [answered, settings.autoNext, settings.delay])

  function choose(answer: Answer) { if (answered) return; setSelected(answer.answerId); if (answer.isCorrect) setScore((value) => value + 1) }
  function next() { setIndex((value) => (value + 1) % Math.max(filtered.length, 1)); setSelected(null) }
  function reset() { setIndex(0); setSelected(null); setScore(0); if (settings.mode === 'random') setRandomOrder(shuffle(filtered.map((_, i) => i))) }
  function changeTopic(value: string) { setTopicId(value); setIndex(0); setSelected(null); setScore(0) }
  function updateSettings(patch: Partial<Settings>) { setSettings((value) => ({ ...value, ...patch })); setIndex(0); setSelected(null); setScore(0) }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">A</span><div><strong>radio<span>cards</span></strong><small>studijní režim</small></div></div>
      <div className="sidebar-label">TÉMATA</div>
      <nav className="topic-list" aria-label="Výběr tématu">
        <button className={`topic-button ${topicId === 'all' ? 'active' : ''}`} onClick={() => changeTopic('all')}><span>Všechna témata</span><b>{questions.length}</b></button>
        {groups.map((group) => <div key={group.topicGroupId} className="topic-group"><div className="group-title">{group.name}</div>{group.topics.map((item) => <button key={item.topicId} className={`topic-button ${topicId === item.topicId ? 'active' : ''}`} onClick={() => changeTopic(item.topicId)}><span>{item.name}</span><b>{item.questionCount}</b></button>)}</div>)}
      </nav>
      <div className="sidebar-footer"><span className="status-dot" />Data načtena z hamtestu</div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div><div className="eyebrow">{view === 'practice' ? 'PROCVIČOVÁNÍ' : 'PŘIZPŮSOBENÍ'}</div><h1>{view === 'practice' ? (topicId === 'all' ? 'Všechna témata' : topic?.name) : 'Nastavení'}</h1></div><div className="top-actions"><button className="settings-button" onClick={() => setView(view === 'practice' ? 'settings' : 'practice')}>{view === 'practice' ? 'Nastavení' : 'Zpět k procvičování'}</button>{view === 'practice' && <button className="reset-button" onClick={reset}>Začít znovu <span>↻</span></button>}</div></header>
      {view === 'settings' ? <SettingsPanel settings={settings} update={updateSettings} /> : <div className="content">
        <div className="session-meta"><span>Otázka <strong>{index + 1}</strong> z {filtered.length}</span><span className="score">Skóre <strong>{score}</strong></span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(progress, 2)}%` }} /></div>
        {question && <div className="question-card"><div className="question-number">{String(index + 1).padStart(2, '0')} <span>·</span> {topic?.name}</div><h2>{question.text}</h2><p className="hint">Vyberte správnou odpověď</p><div className="answers" role="group" aria-label="Možnosti odpovědi">{answers.map((answer, answerIndex) => { const isSelected = selected === answer.answerId; const state = !answered ? '' : answer.isCorrect ? 'correct' : isSelected ? 'wrong' : 'dimmed'; return <button disabled={answered} key={answer.answerId} className={`answer-card ${state}`} onClick={() => choose(answer)} aria-pressed={isSelected}><span className="answer-letter">{String.fromCharCode(65 + answerIndex)}</span><span>{answer.text}</span>{answered && answer.isCorrect && <span className="answer-icon">✓</span>}{answered && isSelected && !answer.isCorrect && <span className="answer-icon">×</span>}</button> })}</div><p className="sr-only" aria-live="polite">{answered ? (question.answers.find((answer) => answer.answerId === selected)?.isCorrect ? 'Správná odpověď' : 'Nesprávná odpověď') : ''}</p><button className="next-button" onClick={next} disabled={!answered || settings.autoNext}>Další otázka <span>→</span></button></div>}
        <footer className="workspace-footer"><span>Jedna otázka. Jedna správná odpověď.</span><span>{questions.length} otázek celkem</span></footer>
      </div>}
    </section>
  </main>
}

function SettingsPanel({ settings, update }: { settings: Settings; update: (patch: Partial<Settings>) => void }) {
  return <div className="settings-panel"><div className="settings-intro"><div className="eyebrow">PREFERENCE</div><h2>Jak chcete procvičovat?</h2><p>Nastavení se uloží automaticky pro příště.</p></div><div className="setting-row"><div><strong>Automaticky další otázka</strong><span>Po zodpovězení přejde aplikace dál.</span></div><div className="segmented"><button className={settings.autoNext ? 'selected' : ''} onClick={() => update({ autoNext: true })}>Ano</button><button className={!settings.autoNext ? 'selected' : ''} onClick={() => update({ autoNext: false })}>Ne</button></div></div><div className="setting-row"><div><strong>Prodleva</strong><span>Čas před automatickým přechodem.</span></div><select value={settings.delay} onChange={(event) => update({ delay: Number(event.target.value) })} disabled={!settings.autoNext}><option value={1}>1 sekunda</option><option value={2}>2 sekundy</option><option value={3}>3 sekundy</option><option value={5}>5 sekund</option><option value={10}>10 sekund</option></select></div><div className="setting-row"><div><strong>Režim otázek</strong><span>Určuje pořadí, ve kterém se otázky zobrazí.</span></div><div className="segmented"><button className={settings.mode === 'sequential' ? 'selected' : ''} onClick={() => update({ mode: 'sequential' })}>Sekvenční</button><button className={settings.mode === 'random' ? 'selected' : ''} onClick={() => update({ mode: 'random' })}>Náhodný</button></div></div><div className="setting-row"><div><strong>Promíchat odpovědi</strong><span>Pořadí odpovědí se u každé otázky změní.</span></div><div className="segmented"><button className={settings.shuffleAnswers ? 'selected' : ''} onClick={() => update({ shuffleAnswers: true })}>Ano</button><button className={!settings.shuffleAnswers ? 'selected' : ''} onClick={() => update({ shuffleAnswers: false })}>Ne</button></div></div></div>
}
