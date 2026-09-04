'use client'

import { useEffect, useMemo, useState } from 'react'
import data from '../data/questions.json'

type Answer = { answerId: string; text: string; isCorrect: boolean }
type Question = { questionId: string; questionCode: string; text: string; topicId: string; points: number; answers: Answer[] }
type Topic = { topicId: string; name: string; questionCount: number }
type TopicGroup = { topicGroupId: string; name: string; topics: Topic[] }
type Settings = { autoNext: boolean; correctDelay: number; wrongDelay: number; mode: 'random' | 'sequential'; shuffleAnswers: boolean; theme: 'day' | 'night' }

const questions = data.questions as Question[]
const groups = data.groupedTopics as TopicGroup[]
const allTopics = groups.flatMap((group) => group.topics)
const defaultSettings: Settings = { autoNext: false, correctDelay: 1, wrongDelay: 2, mode: 'sequential', shuffleAnswers: false, theme: 'day' }
function shuffle<T>(items: T[]) { return [...items].sort(() => Math.random() - 0.5) }

export default function Page() {
  const [view, setView] = useState<'home' | 'practice' | 'settings'>('home')
  const [topicId, setTopicId] = useState('all')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [randomOrder, setRandomOrder] = useState<number[]>([])

  useEffect(() => { try { const saved = localStorage.getItem('radiocards-settings'); if (saved) setSettings({ ...defaultSettings, ...JSON.parse(saved) }) } catch {} }, [])
  useEffect(() => { localStorage.setItem('radiocards-settings', JSON.stringify(settings)) }, [settings])
  const filtered = useMemo(() => topicId === 'all' ? questions : questions.filter((q) => q.topicId === topicId), [topicId])
  const order = settings.mode === 'random' ? randomOrder : filtered.map((_, i) => i)
  const currentPosition = order.length ? order[index % order.length] : 0
  const question = filtered[currentPosition]
  const topic = allTopics.find((item) => item.topicId === question?.topicId)
  const answered = selected !== null
  const answers = useMemo(() => settings.shuffleAnswers && question ? shuffle(question.answers) : question?.answers ?? [], [question, settings.shuffleAnswers, index])
  const progress = filtered.length ? ((index % filtered.length) / filtered.length) * 100 : 0
  const isCorrect = question?.answers.find((answer) => answer.answerId === selected)?.isCorrect

  useEffect(() => { setRandomOrder(shuffle(filtered.map((_, i) => i))) }, [filtered.length, topicId])
  useEffect(() => { if (!answered || !settings.autoNext) return; const timer = window.setTimeout(next, (isCorrect ? settings.correctDelay : settings.wrongDelay) * 1000); return () => window.clearTimeout(timer) }, [answered, settings.autoNext, settings.correctDelay, settings.wrongDelay, isCorrect])
  function choose(answer: Answer) { if (answered) return; setSelected(answer.answerId); if (answer.isCorrect) setScore((v) => v + 1) }
  function next() { setIndex((v) => (v + 1) % Math.max(filtered.length, 1)); setSelected(null) }
  function reset() { setIndex(0); setSelected(null); setScore(0); if (settings.mode === 'random') setRandomOrder(shuffle(filtered.map((_, i) => i))) }
  function changeTopic(value: string) { setTopicId(value); setIndex(0); setSelected(null); setScore(0); setView('practice') }
  function update(patch: Partial<Settings>) { setSettings((v) => ({ ...v, ...patch })); setIndex(0); setSelected(null); setScore(0) }
  function goHome() { setView('home'); setSelected(null) }
  return <main className={`app-shell ${settings.theme === 'night' ? 'night' : ''}`}>
    <aside className="sidebar"><button className="brand" onClick={goHome} aria-label="Přejít na domovskou stránku"><span className="brand-mark">A</span><div><strong>radio<span>cards</span></strong><small>studijní režim</small></div></button><div className="sidebar-label">TÉMATA</div><nav className="topic-list" aria-label="Výběr tématu"><button className={`topic-button ${topicId === 'all' ? 'active' : ''}`} onClick={() => changeTopic('all')}><span>Všechna témata</span><b>{questions.length}</b></button>{groups.map((group) => <div key={group.topicGroupId} className="topic-group"><div className="group-title">{group.name}</div>{group.topics.map((item) => <button key={item.topicId} className={`topic-button ${topicId === item.topicId ? 'active' : ''}`} onClick={() => changeTopic(item.topicId)}><span>{item.name}</span><b>{item.questionCount}</b></button>)}</div>)}</nav><div className="sidebar-footer"><span className="status-dot" />Data načtena z hamtestu</div></aside>
    <section className="workspace"><header className="topbar"><div><div className="eyebrow">{view === 'home' ? 'RADIOCARDS' : view === 'practice' ? 'PROCVIČOVÁNÍ' : 'PŘIZPŮSOBENÍ'}</div><h1>{view === 'home' ? 'Vyberte si, co chcete procvičit' : view === 'practice' ? (topicId === 'all' ? 'Všechna témata' : topic?.name) : 'Nastavení'}</h1></div><div className="top-actions"><button className="theme-button" onClick={() => update({ theme: settings.theme === 'day' ? 'night' : 'day' })}>{settings.theme === 'day' ? 'Night' : 'Day'}</button><button className="settings-button" onClick={() => setView(view === 'settings' ? 'practice' : 'settings')}>{view === 'settings' ? 'Zpět k procvičování' : 'Nastavení'}</button>{view === 'practice' && <button className="reset-button" onClick={reset}>Začít znovu <span>↻</span></button>}</div></header>
      {view === 'home' ? <Home onTopic={changeTopic} /> : view === 'settings' ? <SettingsPanel settings={settings} update={update} onTopic={changeTopic} /> : <div className="content"><div className="session-meta"><span>Otázka <strong>{index + 1}</strong> z {filtered.length}</span><span className="score">Skóre <strong>{score}</strong></span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(progress, 2)}%` }} /></div>{question && <div className="question-card"><div className="question-number">{String(index + 1).padStart(2, '0')} <span>·</span> {topic?.name}</div><h2>{question.text}</h2><p className="hint">Vyberte správnou odpověď</p><div className="answers" role="group" aria-label="Možnosti odpovědi">{answers.map((answer, i) => { const state = !answered ? '' : answer.isCorrect ? 'correct' : selected === answer.answerId ? 'wrong' : 'dimmed'; return <button disabled={answered} key={answer.answerId} className={`answer-card ${state}`} onClick={() => choose(answer)} aria-pressed={selected === answer.answerId}><span className="answer-letter">{String.fromCharCode(65 + i)}</span><span>{answer.text}</span>{answered && answer.isCorrect && <span className="answer-icon">✓</span>}{answered && selected === answer.answerId && !answer.isCorrect && <span className="answer-icon">×</span>}</button>})}</div><p className="sr-only" aria-live="polite">{answered ? (isCorrect ? 'Správná odpověď' : 'Nesprávná odpověď') : ''}</p><button className="next-button" onClick={next} disabled={!answered}>Další otázka <span>→</span></button></div>}<footer className="workspace-footer"><span>Jedna otázka. Jedna správná odpověď.</span><span>{questions.length} otázek celkem</span></footer></div>}
    </section></main>
}

function Home({ onTopic }: { onTopic: (id: string) => void }) { return <div className="home-content"><div className="home-intro"><div className="eyebrow">ZAČNĚTE STUDOVAT</div><h2>Vyberte téma a procvičte si znalosti.</h2><p>Jedna otázka po druhé. Bez rozptylování.</p></div><div className="home-topics"><button className="home-topic" onClick={() => onTopic('all')}><strong>Všechna témata</strong><span>{questions.length} otázek →</span></button>{allTopics.map((item) => <button className="home-topic" key={item.topicId} onClick={() => onTopic(item.topicId)}><strong>{item.name}</strong><span>{item.questionCount} otázek →</span></button>)}</div></div> }

function SettingsPanel({ settings, update, onTopic }: { settings: Settings; update: (p: Partial<Settings>) => void; onTopic: (id: string) => void }) { return <div className="settings-panel"><div className="settings-intro"><div className="eyebrow">PREFERENCE</div><h2>Jak chcete procvičovat?</h2><p>Nastavení se uloží automaticky pro příště.</p></div><div className="setting-row"><div><strong>Automaticky další otázka</strong><span>Ruční tlačítko zůstává aktivní i při zapnutí.</span></div><div className="segmented"><button className={settings.autoNext ? 'selected' : ''} onClick={() => update({ autoNext: true })}>Ano</button><button className={!settings.autoNext ? 'selected' : ''} onClick={() => update({ autoNext: false })}>Ne</button></div></div><div className="setting-row"><div><strong>Prodleva po správné odpovědi</strong><span>Výchozí prodleva je 1 sekunda.</span></div><select value={settings.correctDelay} onChange={(e) => update({ correctDelay: Number(e.target.value) })} disabled={!settings.autoNext}><option value={1}>1 sekunda</option><option value={2}>2 sekundy</option><option value={3}>3 sekundy</option></select></div><div className="setting-row"><div><strong>Prodleva po špatné odpovědi</strong><span>Výchozí prodleva je 2 sekundy.</span></div><select value={settings.wrongDelay} onChange={(e) => update({ wrongDelay: Number(e.target.value) })} disabled={!settings.autoNext}><option value={1}>1 sekunda</option><option value={2}>2 sekundy</option><option value={3}>3 sekundy</option><option value={5}>5 sekund</option></select></div><div className="setting-row"><div><strong>Režim otázek</strong><span>Určuje pořadí zobrazovaných otázek.</span></div><div className="segmented"><button className={settings.mode === 'sequential' ? 'selected' : ''} onClick={() => update({ mode: 'sequential' })}>Sekvenční</button><button className={settings.mode === 'random' ? 'selected' : ''} onClick={() => update({ mode: 'random' })}>Náhodný</button></div></div><div className="setting-row"><div><strong>Promíchat odpovědi</strong><span>Pořadí odpovědí se u každé otázky změní.</span></div><div className="segmented"><button className={settings.shuffleAnswers ? 'selected' : ''} onClick={() => update({ shuffleAnswers: true })}>Ano</button><button className={!settings.shuffleAnswers ? 'selected' : ''} onClick={() => update({ shuffleAnswers: false })}>Ne</button></div></div><div className="setting-row"><div><strong>Vzhled stránky</strong><span>Přepíná denní a noční režim.</span></div><div className="segmented"><button className={settings.theme === 'day' ? 'selected' : ''} onClick={() => update({ theme: 'day' })}>Day</button><button className={settings.theme === 'night' ? 'selected' : ''} onClick={() => update({ theme: 'night' })}>Night</button></div></div><div className="settings-topics"><strong>Téma</strong>{groups.flatMap((g) => g.topics).map((item) => <button key={item.topicId} onClick={() => onTopic(item.topicId)}>{item.name} <span>→</span></button>)}</div></div> }
