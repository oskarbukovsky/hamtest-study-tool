'use client'

import { useMemo, useState } from 'react'
import data from '../data/questions.json'

type Answer = { answerId: string; text: string; isCorrect: boolean }
type Question = { questionId: string; questionCode: string; text: string; topicId: string; points: number; answers: Answer[] }
type Topic = { topicId: string; name: string; questionCount: number }
type TopicGroup = { topicGroupId: string; name: string; topics: Topic[] }

const questions = data.questions as Question[]
const groups = data.groupedTopics as TopicGroup[]
const allTopics = groups.flatMap((group) => group.topics)

export default function Page() {
  const [topicId, setTopicId] = useState('all')
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [score, setScore] = useState(0)

  const filtered = useMemo(() => topicId === 'all' ? questions : questions.filter((question) => question.topicId === topicId), [topicId])
  const question = filtered[index % Math.max(filtered.length, 1)]
  const topic = allTopics.find((item) => item.topicId === question?.topicId)
  const answered = selected !== null
  const progress = filtered.length ? ((index % filtered.length) / filtered.length) * 100 : 0

  function choose(answer: Answer) {
    if (answered) return
    setSelected(answer.answerId)
    if (answer.isCorrect) setScore((value) => value + 1)
  }

  function next() {
    setIndex((value) => (value + 1) % filtered.length)
    setSelected(null)
  }

  function changeTopic(value: string) {
    setTopicId(value)
    setIndex(0)
    setSelected(null)
  }

  function reset() {
    setIndex(0)
    setSelected(null)
    setScore(0)
  }

  return (
    <main className="app-shell">
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
        <header className="topbar"><div><div className="eyebrow">PROCVIČOVÁNÍ</div><h1>{topicId === 'all' ? 'Všechna témata' : topic?.name}</h1></div><button className="reset-button" onClick={reset}>Začít znovu <span>↻</span></button></header>
        <div className="content">
          <div className="session-meta"><span>Otázka <strong>{index + 1}</strong> z {filtered.length}</span><span className="score">Skóre <strong>{score}</strong></span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(progress, 2)}%` }} /></div>
          {question && <div className="question-card">
            <div className="question-number">{String(index + 1).padStart(2, '0')} <span>·</span> {topic?.name}</div>
            <h2>{question.text}</h2>
            <p className="hint">Vyberte správnou odpověď</p>
            <div className="answers" role="group" aria-label="Možnosti odpovědi">{question.answers.map((answer, answerIndex) => { const isSelected = selected === answer.answerId; const state = !answered ? '' : answer.isCorrect ? 'correct' : isSelected ? 'wrong' : 'dimmed'; return <button key={answer.answerId} className={`answer-card ${state}`} onClick={() => choose(answer)} aria-pressed={isSelected}><span className="answer-letter">{String.fromCharCode(65 + answerIndex)}</span><span>{answer.text}</span>{answered && answer.isCorrect && <span className="answer-icon">✓</span>}{answered && isSelected && !answer.isCorrect && <span className="answer-icon">×</span>}</button> })}</div>
            {answered && <div className={`feedback ${question.answers.find((answer) => answer.answerId === selected)?.isCorrect ? 'feedback-correct' : 'feedback-wrong'}`}><strong>{question.answers.find((answer) => answer.answerId === selected)?.isCorrect ? 'Správně.' : 'Tentokrát ne.'}</strong><span>{question.answers.find((answer) => answer.isCorrect)?.text}</span></div>}
            <button className="next-button" onClick={next} disabled={!answered}>Další otázka <span>→</span></button>
          </div>}
          <footer className="workspace-footer"><span>Jedna otázka. Jedna správná odpověď.</span><span>{questions.length} otázek celkem</span></footer>
        </div>
      </section>
    </main>
  )
}
