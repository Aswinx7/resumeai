import { useMemo, useState, useEffect, useRef } from 'react'
import { generateSectionContent } from '../lib/ai'
import {
  LuUser,
  LuBookOpen,
  LuBriefcase,
  LuFolderGit2,
  LuWrench,
  LuAward,
  LuSlidersHorizontal,
  LuLayoutTemplate,
  LuBold,
  LuItalic,
  LuUnderline,
  LuList,
  LuLink,
  LuPencil,
  LuCalendar
} from 'react-icons/lu'
import { LuMail, LuPhone, LuMapPin, LuLinkedin, LuGithub, LuGlobe } from 'react-icons/lu'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LuGripVertical, LuEye, LuEyeOff } from 'react-icons/lu'

const emptyResume = {
  personal: { fullName: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '' },
  summary: '',
  skills: '',
  experience: [{ company: '', role: '', start: '', end: '', details: '' }],
  education: [{ school: '', degree: '', start: '', end: '', details: '' }],
  projects: [{ name: '', link: '', start: '', end: '', details: '' }],
  certifications: [{ name: '', org: '', start: '', end: '' }],
  awards: [{ name: '', issuer: '', year: '' }],
  certificationsTitle: 'Certifications',
  awardsTitle: 'Awards',
  achievementsTitle: 'Achievements',
  achievements: '',
  hobbies: ''
}

function dateRange(start, end) {
  const s = (start || '').trim()
  const e = (end || '').trim()
  if (s && e) return `${s} – ${e}`
  if (s && !e) return `${s} – Present`
  if (!s && e) return e
  return ''
}

// very small allowlist sanitizer to prevent unsafe HTML
function sanitizeHtml(html) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html || '', 'text/html')
    const allowedTags = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'UL', 'OL', 'LI', 'P', 'BR', 'DIV', 'SPAN'])
    const walk = (node) => {
      const children = Array.from(node.childNodes)
      for (const child of children) {
        if (child.nodeType === 1) {
          const el = child
          if (!allowedTags.has(el.tagName)) {
            // replace disallowed element with its children
            while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el)
            el.remove()
            continue
          }
          // strip all attrs except href on A
          const attrs = Array.from(el.attributes)
          for (const a of attrs) {
            if (el.tagName === 'A' && a.name.toLowerCase() === 'href') {
              try {
                const u = new URL(a.value, window.location.origin)
                if (!/^https?:$/.test(u.protocol)) el.removeAttribute(a.name)
                else el.setAttribute('rel', 'noreferrer')
                el.setAttribute('target', '_blank')
              } catch { el.removeAttribute(a.name) }
            } else {
              el.removeAttribute(a.name)
            }
          }
          walk(el)
        } else if (child.nodeType === 8) {
          // remove comments
          child.remove()
        }
      }
    }
    walk(doc.body)
    // prune empty list items and lists to avoid stray bullets
    Array.from(doc.body.querySelectorAll('li')).forEach(li => {
      const text = (li.textContent || '').replace(/\u200B/g, '').trim()
      if (!text) {
        const onlyBr = Array.from(li.childNodes).every(n => n.nodeType === 1 && n.tagName === 'BR')
        if (onlyBr || li.children.length === 0) li.remove()
      }
    })
    Array.from(doc.body.querySelectorAll('ul,ol')).forEach(list => {
      if (list.querySelectorAll('li').length === 0) list.remove()
    })
    return doc.body.innerHTML
  } catch {
    return ''
  }
}

function SanitizedHtml({ html, small }) {
  const safe = sanitizeHtml(html)
  const cls = (small ? 'text-sm ' : '') + 'rich-content'
  return (
    <div className={cls} dangerouslySetInnerHTML={{ __html: safe }} />
  )
}

function RichEditorWithToolbar({ value, onChange, placeholder }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const isHtml = /<\w+[^>]*>/.test(value || '')
    const maybeMarked = /\*\*|__|\* |^- |\[(.+?)\]\((https?:\/\/[^\s)]+)\)/m.test(value || '')
    let incoming = value || ''
    if (!isHtml && maybeMarked) {
      const converted = markdownishToHtml(incoming)
      const safe = sanitizeHtml(converted)
      if (safe !== sanitizeHtml(el.innerHTML)) {
        el.innerHTML = safe
      }
      // persist converted HTML so markers don't reappear
      if (sanitizeHtml(incoming) !== safe) onChange(safe)
    } else {
      const safe = sanitizeHtml(incoming)
      if (sanitizeHtml(el.innerHTML) !== safe) {
        el.innerHTML = safe
      }
    }
  }, [value])
  function exec(cmd, arg = null) {
    // focus and exec editing command
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    const html = sanitizeHtml(ref.current?.innerHTML || '')
    onChange(html)
  }
  function ensureSelectionInEditor() {
    const el = ref.current
    if (!el) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(r)
      return
    }
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer)) {
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(true)
      sel.removeAllRanges()
      sel.addRange(r)
    }
  }
  function execList() {
    const el = ref.current
    if (!el) return
    ensureSelectionInEditor()
    // If empty, insert a blank line to allow list toggling to take effect
    if (!el.innerHTML || el.innerHTML === '<br>' || el.textContent === '') {
      el.innerHTML = '<p><br></p>'
      const sel = window.getSelection()
      const r = document.createRange()
      r.selectNodeContents(el)
      r.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(r)
    }
    ref.current.focus()
    document.execCommand('insertUnorderedList', false, null)
    const html = sanitizeHtml(ref.current?.innerHTML || '')
    onChange(html)
  }
  function onInput() {
    const html = sanitizeHtml(ref.current?.innerHTML || '')
    onChange(html)
  }
  function onPaste(e) {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData).getData('text')
    document.execCommand('insertText', false, text)
  }
  function addLink() {
    const url = window.prompt('Enter URL (https://...)', 'https://')
    if (!url) return
    try {
      const u = new URL(url)
      if (!/^https?:$/.test(u.protocol)) return
      exec('createLink', u.toString())
    } catch { /* ignore invalid url */ }
  }
  return (
    <div>
      <div className="flex items-center gap-1 mb-1 text-gray-600">
        <button type="button" className="p-1 hover:text-gray-900" onClick={() => exec('bold')} title="Bold"><LuBold /></button>
        <button type="button" className="p-1 hover:text-gray-900" onClick={() => exec('italic')} title="Italic"><LuItalic /></button>
        <button type="button" className="p-1 hover:text-gray-900" onClick={() => exec('underline')} title="Underline"><LuUnderline /></button>
        <button type="button" className="p-1 hover:text-gray-900" onClick={execList} title="Bullets"><LuList /></button>
        <button type="button" className="p-1 hover:text-gray-900" onClick={addLink} title="Link"><LuLink /></button>
      </div>
      <div
        ref={ref}
        className="w-full border rounded-xl px-3 py-2 min-h-[96px] focus:outline-none rich-editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={onInput}
        onPaste={onPaste}
        suppressContentEditableWarning
        style={{ whiteSpace: 'pre-wrap' }}
      />
    </div>
  )
}

function SectionHeader({ title, action, onAction, loading }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-gray-800">{title}</h3>
      {action && (
        <button disabled={loading} onClick={onAction} className="text-sm text-blue-600 hover:underline disabled:opacity-60">
          {loading ? 'Generating…' : action}
        </button>
      )}
    </div>
  )
}

function DateInput({ value, onChange, placeholder }) {
  const monthRef = useRef(null)
  function openPicker() {
    if (monthRef.current?.showPicker) monthRef.current.showPicker()
    else monthRef.current?.focus()
  }
  function onMonthChange(e) {
    const v = e.target.value // YYYY-MM
    if (!v) return
    const [y, m] = v.split('-')
    const d = new Date(Number(y), Number(m) - 1, 1)
    const formatted = d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
    onChange(formatted)
  }
  return (
    <div className="relative">
      <input
        className="border rounded-xl px-3 py-2 w-full"
        placeholder={placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
        title="Pick month"
      >
        <LuCalendar />
      </button>
      <input
        ref={monthRef}
        type="month"
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        onChange={onMonthChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}

function InlineFormatted({ text }) {
  if (!text) return null
  const parts = []
  let remaining = text
  const linkRe = /\[(.+?)\]\((https?:\/\/[^\s)]+)\)/
  while (remaining.length > 0) {
    const m = remaining.match(linkRe)
    if (!m) {
      parts.push(remaining)
      break
    }
    if (m.index > 0) parts.push(remaining.slice(0, m.index))
    parts.push({ type: 'link', text: m[1], href: m[2] })
    remaining = remaining.slice(m.index + m[0].length)
  }
  function renderInline(str) {
    const withBold = []
    const boldRe = /\*\*(.+?)\*\*/g
    let last = 0
    let bm
    while ((bm = boldRe.exec(str))) {
      if (bm.index > last) withBold.push(str.slice(last, bm.index))
      withBold.push({ type: 'b', text: bm[1] })
      last = bm.index + bm[0].length
    }
    if (last < str.length) withBold.push(str.slice(last))
    const withItalic = []
    const italRe = /\*(.+?)\*/g
    withBold.forEach(seg => {
      if (typeof seg !== 'string') { withItalic.push(seg); return }
      let l = 0, im
      while ((im = italRe.exec(seg))) {
        if (im.index > l) withItalic.push(seg.slice(l, im.index))
        withItalic.push({ type: 'i', text: im[1] })
        l = im.index + im[0].length
      }
      if (l < seg.length) withItalic.push(seg.slice(l))
    })

    // One-time migration: convert any legacy marker text in details fields to HTML
    useEffect(() => {
      const isHtml = (s) => /<\w+[^>]*>/.test(s || '')
      const maybeMarked = (s) => /\*\*|__|^\s*[-*]\s+|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/m.test(s || '')
      let changed = false
      const next = { ...resume }
      next.experience = (next.experience || []).map(it => {
        const d = it.details || ''
        if (!isHtml(d) && maybeMarked(d)) { changed = true; return { ...it, details: sanitizeHtml(markdownishToHtml(d)) } }
        return it
      })
      next.education = (next.education || []).map(it => {
        const d = it.details || ''
        if (!isHtml(d) && maybeMarked(d)) { changed = true; return { ...it, details: sanitizeHtml(markdownishToHtml(d)) } }
        return it
      })
      next.projects = (next.projects || []).map(it => {
        const d = it.details || ''
        if (!isHtml(d) && maybeMarked(d)) { changed = true; return { ...it, details: sanitizeHtml(markdownishToHtml(d)) } }
        return it
      })
      if (changed) setResume(next)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    const final = []
    const uRe = /__(.+?)__/g
    withItalic.forEach(seg => {
      if (typeof seg !== 'string') { final.push(seg); return }
      let l = 0, um
      while ((um = uRe.exec(seg))) {
        if (um.index > l) final.push(seg.slice(l, um.index))
        final.push({ type: 'u', text: um[1] })
        l = um.index + um[0].length
      }
      if (l < seg.length) final.push(seg.slice(l))
    })
    return final.map((seg, i) => {
      if (typeof seg === 'string') return <span key={i}>{seg}</span>
      if (seg.type === 'b') return <strong key={i}>{seg.text}</strong>
      if (seg.type === 'i') return <em key={i}>{seg.text}</em>
      if (seg.type === 'u') return <span key={i} style={{ textDecoration: 'underline' }}>{seg.text}</span>
      return <span key={i}>{seg.text}</span>
    })
  }
  return (
    <>
      {parts.map((p, idx) => {
        if (typeof p === 'string') return <span key={idx}>{renderInline(p)}</span>
        if (p.type === 'link') return <a key={idx} href={p.href} className="text-blue-600" target="_blank" rel="noreferrer">{p.text}</a>
        return null
      })}
    </>
  )
}

function RichBlock({ text, small }) {
  if (!text) return null
  const lines = text.split(/\r?\n/)
  const blocks = []
  let i = 0
  while (i < lines.length) {
    if (/^\s*[-\*]\s+/.test(lines[i])) {
      const items = []
      while (i < lines.length && /^\s*[-\*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-\*]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
    } else {
      const paragraph = [lines[i]]
      i++
      while (i < lines.length && lines[i].trim() && !/^\s*[-\*]\s+/.test(lines[i])) {
        paragraph.push(lines[i])
        i++
      }
      blocks.push({ type: 'p', text: paragraph.join(' ') })
      while (i < lines.length && !lines[i].trim()) i++
    }
  }
  return (
    <div className={small ? 'text-sm' : undefined}>
      {blocks.map((b, idx) => b.type === 'ul' ? (
        <ul key={idx} className="list-disc pl-5 space-y-1">
          {b.items.map((it, j) => (<li key={j}><InlineFormatted text={it} /></li>))}
        </ul>
      ) : (
        <p key={idx}><InlineFormatted text={b.text} /></p>
      ))}
    </div>
  )
}

// convert simple marker syntax to HTML once when migrating from old textareas
function markdownishToHtml(text) {
  if (!text) return ''
  // escape angle brackets to avoid accidental HTML
  let t = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // links [text](http...)
  t = t.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
  // bold, underline, italic (order matters to avoid conflicts)
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/__(.+?)__/g, '<u>$1</u>')
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>')
  // lists: lines starting with - or * become <li>
  const lines = t.split(/\r?\n/)
  const blocks = []
  let i = 0
  while (i < lines.length) {
    if (/^\s*(&#42;|-)\s+/.test(lines[i])) { // &#42; is * escaped
      const items = []
      while (i < lines.length && /^\s*(&#42;|-)\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*(&#42;|-)\s+/, ''))
        i++
      }
      blocks.push(`<ul>${items.map(it => `<li>${it}</li>`).join('')}</ul>`)
    } else {
      const para = [lines[i]]
      i++
      while (i < lines.length && lines[i].trim() && !/^\s*(&#42;|-)\s+/.test(lines[i])) { para.push(lines[i]); i++ }
      blocks.push(`<p>${para.join(' ')}</p>`)
      while (i < lines.length && !lines[i].trim()) i++
    }
  }
  return blocks.join('')
}

export default function ResumeBuilder() {
  const [resume, setResume] = useState(emptyResume)
  const [template, setTemplate] = useState('basic')
  const [loadingKey, setLoadingKey] = useState('')
  const [tab, setTab] = useState('personal')
  const [theme, setTheme] = useState({ font: 'sans', accent: '#2563eb' })
  const [scale, setScale] = useState(1)
  const [editingTitle, setEditingTitle] = useState({ certifications: false, awards: false, achievements: false })
  const previewAreaRef = useRef(null)
  const [sectionsOrder, setSectionsOrder] = useState([
    'summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'awards', 'achievements'
  ])
  const [visible, setVisible] = useState({
    summary: true,
    skills: true,
    experience: true,
    education: true,
    projects: true,
    certifications: true,
    awards: true,
    achievements: true,
    //hobbies: true,
  })

  const tabs = useMemo(() => ([
    { id: 'personal', label: 'Personal Details', icon: LuUser },
    { id: 'education', label: 'Education', icon: LuBookOpen },
    { id: 'experience', label: 'Work Experience', icon: LuBriefcase },
    { id: 'projects', label: 'Projects', icon: LuFolderGit2 },
    { id: 'skills', label: 'Skills', icon: LuWrench },
    { id: 'certifications', label: 'Certifications', icon: LuAward },
    { id: 'awards', label: 'Awards', icon: LuAward },
    { id: 'achievements', label: 'Achievements', icon: LuAward },
    { id: 'customize', label: 'Customize', icon: LuSlidersHorizontal },
    { id: 'templates', label: 'Templates', icon: LuLayoutTemplate },
  ]), [])

  const up = (path, value) => setResume((r) => ({ ...r, [path]: value }))
  const upDeep = (section, idx, key, value) => setResume((r) => ({ ...r, [section]: r[section].map((it, i) => i === idx ? { ...it, [key]: value } : it) }))
  const addRow = (section, row) => setResume((r) => ({ ...r, [section]: [...r[section], row] }))
  const delRow = (section, idx) => setResume((r) => ({ ...r, [section]: r[section].filter((_, i) => i !== idx) }))

  const genSummary = async () => {
    try {
      setLoadingKey('summary')
      const prompt = `Craft a 3-4 sentence professional summary for ${resume.personal.fullName || 'a candidate'} as ${resume.personal.title}. Highlight key skills: ${resume.skills}.`
      const text = await generateSectionContent(prompt)
      up('summary', text)
    } finally { setLoadingKey('') }
  }

  // Auto scale the A4 preview to fit available space while keeping aspect ratio
  useEffect(() => {
    const A4 = { w: 794, h: 1123 }
    function computeScale() {
      const el = previewAreaRef.current
      if (!el) return
      const padding = 16 // inner padding within gray container
      const availW = Math.max(0, el.clientWidth - padding * 2)
      const availH = Math.max(0, el.clientHeight - padding * 2)
      const s = Math.min(availW / A4.w, availH / A4.h)
      setScale(Number.isFinite(s) && s > 0 ? Math.min(s * 1.25, 1) : 1)
    }
    computeScale()
    const ro = new ResizeObserver(computeScale)
    if (previewAreaRef.current) ro.observe(previewAreaRef.current)
    window.addEventListener('resize', computeScale)
    return () => {
      window.removeEventListener('resize', computeScale)
      ro.disconnect()
    }
  }, [])


  return (
    <div className="global-zoom">
      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-10 md:col-span-4 lg:col-span-2">
          <div className="bg-white rounded-2xl shadow p-2 sticky top-4">
            {tabs.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-sm mb-1 cursor-pointer ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    {Icon ? <Icon className="shrink-0" /> : <span className="inline-block w-4 h-4 rounded bg-gray-300" />}
                    <span className="whitespace-nowrap">{t.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Editor */}
        <section className="col-span-12 md:col-span-5 lg:col-span-5 space-y-6">
          {tab === 'templates' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <SectionHeader title="Templates" />
              <select value={template} onChange={(e) => setTemplate(e.target.value)} className="w-full border rounded-md px-3 py-2">
                <option value="basic">Basic</option>
                <option value="modern">Modern</option>
              </select>
            </div>
          )}

          {tab === 'personal' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <SectionHeader title="Personal Details" />
              <div className="grid grid-cols-2 gap-3">
                <input className="border rounded-xl px-3 py-2" placeholder="Full Name" value={resume.personal.fullName} onChange={(e) => up('personal', { ...resume.personal, fullName: e.target.value })} />
                <input className="border rounded-xl px-3 py-2" placeholder="Title (e.g., Frontend Developer)" value={resume.personal.title} onChange={(e) => up('personal', { ...resume.personal, title: e.target.value })} />
                <input className="border rounded-xl px-3 py-2" placeholder="Email" value={resume.personal.email} onChange={(e) => up('personal', { ...resume.personal, email: e.target.value })} />
                <input className="border rounded-xl px-3 py-2" placeholder="Phone" value={resume.personal.phone} onChange={(e) => up('personal', { ...resume.personal, phone: e.target.value })} />
                <input className="border rounded-xl px-3 py-2 col-span-2" placeholder="Location" value={resume.personal.location} onChange={(e) => up('personal', { ...resume.personal, location: e.target.value })} />
                <input className="border rounded-xl px-3 py-2 col-span-2" placeholder="Website (https://...)" value={resume.personal.website} onChange={(e) => up('personal', { ...resume.personal, website: e.target.value })} />
                <input className="border rounded-xl px-3 py-2" placeholder="LinkedIn (username or URL)" value={resume.personal.linkedin} onChange={(e) => up('personal', { ...resume.personal, linkedin: e.target.value })} />
                <input className="border rounded-xl px-3 py-2" placeholder="GitHub (username or URL)" value={resume.personal.github} onChange={(e) => up('personal', { ...resume.personal, github: e.target.value })} />
              </div>
            </div>
          )}

          {tab === 'skills' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              {!visible.skills && (
                <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-3 py-2">
                  Skills is currently hidden in the preview. <button className="underline" onClick={() => setVisible(v => ({ ...v, skills: true }))}>Unhide</button>
                </div>
              )}
              <SectionHeader title="Skills (comma separated)" />
              <input className="w-full border rounded-xl px-3 py-2" value={resume.skills} onChange={(e) => up('skills', e.target.value)} placeholder="React, Tailwind, Firebase, REST" />
            </div>
          )}

          {tab === 'experience' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              {!visible.experience && (
                <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-3 py-2">
                  Experience is currently hidden in the preview. <button className="underline" onClick={() => setVisible(v => ({ ...v, experience: true }))}>Unhide</button>
                </div>
              )}
              <SectionHeader title="Work Experience" />
              {resume.experience.map((exp, idx) => (
                <div key={idx} className="border rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-xl px-3 py-2" placeholder="Company" value={exp.company} onChange={(e) => upDeep('experience', idx, 'company', e.target.value)} />
                    <input className="border rounded-xl px-3 py-2" placeholder="Role" value={exp.role} onChange={(e) => upDeep('experience', idx, 'role', e.target.value)} />
                    <DateInput placeholder="Start (e.g., Jan 2022)" value={exp.start || ''} onChange={(v) => upDeep('experience', idx, 'start', v)} />
                    <DateInput placeholder="End (e.g., Present)" value={exp.end || ''} onChange={(v) => upDeep('experience', idx, 'end', v)} />
                  </div>
                  <SectionHeader title="Details" />
                  <RichEditorWithToolbar
                    value={exp.details}
                    onChange={(v) => upDeep('experience', idx, 'details', v)}
                    placeholder="Details"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => addRow('experience', { company: '', role: '', start: '', end: '', details: '' })} className="text-sm text-blue-600">Add</button>
                    {resume.experience.length > 1 && (
                      <button onClick={() => delRow('experience', idx)} className="text-sm text-red-600">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'education' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              {!visible.education && (
                <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-3 py-2">
                  Education is currently hidden in the preview. <button className="underline" onClick={() => setVisible(v => ({ ...v, education: true }))}>Unhide</button>
                </div>
              )}
              <SectionHeader title="Education" />
              {resume.education.map((ed, idx) => (
                <div key={idx} className="border rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-xl px-3 py-2" placeholder="School" value={ed.school} onChange={(e) => upDeep('education', idx, 'school', e.target.value)} />
                    <input className="border rounded-xl px-3 py-2" placeholder="Degree" value={ed.degree} onChange={(e) => upDeep('education', idx, 'degree', e.target.value)} />
                    <DateInput placeholder="Start (e.g., 2020)" value={ed.start || ''} onChange={(v) => upDeep('education', idx, 'start', v)} />
                    <DateInput placeholder="End (e.g., 2024)" value={ed.end || ''} onChange={(v) => upDeep('education', idx, 'end', v)} />
                  </div>
                  <RichEditorWithToolbar
                    value={ed.details}
                    onChange={(v) => upDeep('education', idx, 'details', v)}
                    placeholder="Details"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => addRow('education', { school: '', degree: '', start: '', end: '', details: '' })} className="text-sm text-blue-600">Add</button>
                    {resume.education.length > 1 && (
                      <button onClick={() => delRow('education', idx)} className="text-sm text-red-600">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'projects' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              {!visible.projects && (
                <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-3 py-2">
                  Projects is currently hidden in the preview. <button className="underline" onClick={() => setVisible(v => ({ ...v, projects: true }))}>Unhide</button>
                </div>
              )}
              <SectionHeader title="Projects" />
              {resume.projects.map((p, idx) => (
                <div key={idx} className="border rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-xl px-3 py-2" placeholder="Project Name" value={p.name} onChange={(e) => upDeep('projects', idx, 'name', e.target.value)} />
                    <input className="border rounded-xl px-3 py-2" placeholder="Link" value={p.link} onChange={(e) => upDeep('projects', idx, 'link', e.target.value)} />
                    <DateInput placeholder="Start (e.g., Feb 2023)" value={p.start || ''} onChange={(v) => upDeep('projects', idx, 'start', v)} />
                    <DateInput placeholder="End (e.g., Jun 2023)" value={p.end || ''} onChange={(v) => upDeep('projects', idx, 'end', v)} />
                  </div>
                  <RichEditorWithToolbar
                    value={p.details}
                    onChange={(v) => upDeep('projects', idx, 'details', v)}
                    placeholder="Details"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => addRow('projects', { name: '', link: '', start: '', end: '', details: '' })} className="text-sm text-blue-600">Add</button>
                    {resume.projects.length > 1 && (
                      <button onClick={() => delRow('projects', idx)} className="text-sm text-red-600">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'certifications' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              {!visible.certifications && (
                <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-3 py-2">
                  Certifications is currently hidden in the preview. <button className="underline" onClick={() => setVisible(v => ({ ...v, certifications: true }))}>Unhide</button>
                </div>
              )}
              <div className="flex items-center justify-between">
                {!editingTitle.certifications ? (
                  <h3 className="font-semibold text-gray-800">{resume.certificationsTitle}</h3>
                ) : (
                  <input className="border rounded-xl px-3 py-1 text-sm" value={resume.certificationsTitle} onChange={(e) => up('certificationsTitle', e.target.value)} />
                )}
                <button
                  type="button"
                  onClick={() => setEditingTitle(s => ({ ...s, certifications: !s.certifications }))}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title={!editingTitle.certifications ? 'Edit title' : 'Done'}
                >
                  <LuPencil />
                </button>
              </div>
              {resume.certifications.map((c, idx) => (
                <div key={idx} className="border rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <input className="border rounded-xl px-3 py-2" placeholder="Name" value={c.name} onChange={(e) => upDeep('certifications', idx, 'name', e.target.value)} />
                    <input className="border rounded-xl px-3 py-2" placeholder="Organization" value={c.org} onChange={(e) => upDeep('certifications', idx, 'org', e.target.value)} />
                    <DateInput placeholder="Start (e.g., Jan 2022)" value={c.start || ''} onChange={(v) => upDeep('certifications', idx, 'start', v)} />
                    <DateInput placeholder="End (e.g., Present)" value={c.end || ''} onChange={(v) => upDeep('certifications', idx, 'end', v)} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addRow('certifications', { name: '', org: '', start: '', end: '' })} className="text-sm text-blue-600">Add</button>
                    {resume.certifications.length > 1 && (
                      <button onClick={() => delRow('certifications', idx)} className="text-sm text-red-600">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'awards' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              {!visible.awards && (
                <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-3 py-2">
                  Awards is currently hidden in the preview. <button className="underline" onClick={() => setVisible(v => ({ ...v, awards: true }))}>Unhide</button>
                </div>
              )}
              <div className="flex items-center justify-between">
                {!editingTitle.awards ? (
                  <h3 className="font-semibold text-gray-800">{resume.awardsTitle}</h3>
                ) : (
                  <input className="border rounded-xl px-3 py-1 text-sm" value={resume.awardsTitle} onChange={(e) => up('awardsTitle', e.target.value)} />
                )}
                <button
                  type="button"
                  onClick={() => setEditingTitle(s => ({ ...s, awards: !s.awards }))}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title={!editingTitle.awards ? 'Edit title' : 'Done'}
                >
                  <LuPencil />
                </button>
              </div>
              {resume.awards.map((a, idx) => (
                <div key={idx} className="border rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-3">
                    <input className="border rounded-xl px-3 py-2" placeholder="Name" value={a.name} onChange={(e) => upDeep('awards', idx, 'name', e.target.value)} />
                    <input className="border rounded-xl px-3 py-2" placeholder="Issuer" value={a.issuer} onChange={(e) => upDeep('awards', idx, 'issuer', e.target.value)} />
                    <input className="border rounded-xl px-3 py-2" placeholder="Year" value={a.year} onChange={(e) => upDeep('awards', idx, 'year', e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addRow('awards', { name: '', issuer: '', year: '' })} className="text-sm text-blue-600">Add</button>
                    {resume.awards.length > 1 && (
                      <button onClick={() => delRow('awards', idx)} className="text-sm text-red-600">Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'achievements' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              {!visible.achievements && (
                <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm px-3 py-2">
                  Achievements is currently hidden in the preview. <button className="underline" onClick={() => setVisible(v => ({ ...v, achievements: true }))}>Unhide</button>
                </div>
              )}
              <div className="flex items-center justify-between">
                {!editingTitle.achievements ? (
                  <h3 className="font-semibold text-gray-800">{resume.achievementsTitle}</h3>
                ) : (
                  <input className="border rounded-xl px-3 py-1 text-sm" value={resume.achievementsTitle} onChange={(e) => up('achievementsTitle', e.target.value)} />
                )}
                <button
                  type="button"
                  onClick={() => setEditingTitle(s => ({ ...s, achievements: !s.achievements }))}
                  className="p-1 text-gray-600 hover:text-gray-900"
                  title={!editingTitle.achievements ? 'Edit title' : 'Done'}
                >
                  <LuPencil />
                </button>
              </div>
              <RichEditorWithToolbar
                value={resume.achievements}
                onChange={(v) => up('achievements', v)}
                placeholder="Describe your notable achievements"
              />
            </div>
          )}

          {tab === 'customize' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <SectionHeader title="Customize" />
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-gray-700">Font
                  <select value={theme.font} onChange={(e) => setTheme(t => ({ ...t, font: e.target.value }))} className="mt-1 w-full border rounded-xl px-3 py-2">
                    <option value="sans">Sans Serif</option>
                    <option value="serif">Serif</option>
                  </select>
                </label>
                <label className="text-sm text-gray-700">Accent Color
                  <input type="color" value={theme.accent} onChange={(e) => setTheme(t => ({ ...t, accent: e.target.value }))} className="mt-1 h-10 w-full border rounded-xl p-1" />
                </label>
              </div>
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Section Order & Visibility</h4>
                <DndContext collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
                  if (!over || active.id === over.id) return
                  const oldIndex = sectionsOrder.indexOf(active.id)
                  const newIndex = sectionsOrder.indexOf(over.id)
                  setSectionsOrder((items) => arrayMove(items, oldIndex, newIndex))
                }}>
                  <SortableContext items={sectionsOrder} strategy={verticalListSortingStrategy}>
                    <ul className="space-y-2">
                      {sectionsOrder.map((id) => (
                        <SortableItem key={id} id={id}>
                          <div className="flex items-center justify-between gap-2 bg-gray-50 border rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2">
                              <LuGripVertical className="text-gray-400" />
                              <span className="capitalize text-sm">{id}</span>
                            </div>
                            <button
                              onClick={() => setVisible(v => ({ ...v, [id]: !v[id] }))}
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault() }}
                              onTouchStart={(e) => e.stopPropagation()}
                              className="text-gray-600 hover:text-gray-900"
                              title={visible[id] ? 'Hide' : 'Unhide'}
                            >
                              {visible[id] ? <LuEye /> : <LuEyeOff />}
                            </button>
                          </div>
                        </SortableItem>
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}

          {tab === 'personal' && (
            <div className="bg-white rounded-2xl shadow p-4 space-y-3">
              <SectionHeader title="Professional Summary" action="Generate with AI" onAction={genSummary} loading={loadingKey === 'summary'} />
              <textarea rows={4} className="w-full border rounded-xl px-3 py-2" value={resume.summary} onChange={(e) => up('summary', e.target.value)} />
            </div>
          )}
        </section>

        {/* Preview */}
        <section className="col-span-12 md:col-span-3 lg:col-span-5">
          <div ref={previewAreaRef} className="bg-gray-100 rounded-2xl p-4 shadow-inner h-[calc(98vh-180px)] overflow-auto flex items-start justify-center">
            <div className="preview-scale" style={{ width: 950, transform: `scale(${scale})`, transformOrigin: 'top center' }}>
              <div className={`bg-white shadow-xl rounded-xl p-8 print-area`} style={{ width: 800, minHeight: 1123, fontFamily: theme.font === 'serif' ? 'Georgia, Times, serif' : 'Inter, ui-sans-serif, system-ui', '--accent': theme.accent }}>
                {template === 'basic' ? (
                  <BasicTemplate data={resume} accent={theme.accent} order={sectionsOrder} visible={visible} />
                ) : (
                  <ModernTemplate data={resume} accent={theme.accent} order={sectionsOrder} visible={visible} />
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </li>
  )
}

function Section({ title, children, accent }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold tracking-wide uppercase mb-2" style={{ color: accent }}>{title}</h3>
      <div className="border-b mb-2" style={{ borderColor: accent, opacity: 0.6 }} />
      {children}
    </div>
  )
}

function Bullets({ text }) {
  if (!text) return null
  const items = text.split(/\n|•|\-/).map(s => s.trim()).filter(Boolean)
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}

function Header({ personal, accent }) {
  return (
    <div className="mb-4 pb-2" style={{ borderBottom: `1px solid ${accent}` }}>
      <h1 className="text-2xl font-bold text-center">{personal.fullName || 'Your Name'}</h1>
      <div className="text-gray-600 text-center">{personal.title || 'Title'}</div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
        {personal.email && (
          <span className="inline-flex items-center gap-1"><LuMail style={{ color: accent }} />{personal.email}</span>
        )}
        {personal.phone && (
          <span className="inline-flex items-center gap-1"><LuPhone style={{ color: accent }} />{personal.phone}</span>
        )}
        {personal.location && (
          <span className="inline-flex items-center gap-1"><LuMapPin style={{ color: accent }} />{personal.location}</span>
        )}
        {personal.website && (
          <span className="inline-flex items-center gap-1"><LuGlobe style={{ color: accent }} />{formatLink(personal.website)}</span>
        )}
        {personal.linkedin && (
          <span className="inline-flex items-center gap-1"><LuLinkedin style={{ color: accent }} />{formatLink(personal.linkedin, 'linkedin.com/in/')}</span>
        )}
        {personal.github && (
          <span className="inline-flex items-center gap-1"><LuGithub style={{ color: accent }} />{formatLink(personal.github, 'github.com/')}</span>
        )}
      </div>
    </div>
  )
}

function formatLink(value, hostHint) {
  if (!value) return ''
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${hostHint ? '' : ''}${value}`)
    return url.host + (url.pathname === '/' ? '' : url.pathname)
  } catch {
    return hostHint ? (value.startsWith('http') ? value : hostHint + value.replace(/^[@/]/, '')) : value
  }
}

function BasicTemplate({ data, accent, order, visible }) {
  const { personal, summary, skills, experience, education, projects, certifications, awards, hobbies } = data
  const renderers = {
    summary: () => summary && (<Section title="Summary" accent={accent}><p>{summary}</p></Section>),
    skills: () => skills && (<Section title="Skills" accent={accent}><p>{skills}</p></Section>),
    experience: () => (experience?.length > 0 && (
      <Section title="Experience" accent={accent}>
        {experience.map((e, i) => (
          <div key={i} className="mb-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-semibold">{e.company}</div>
                <div>{e.role}</div>
              </div>
              <div className="text-xs text-gray-500 ml-4">{dateRange(e.start, e.end)}</div>
            </div>
            <SanitizedHtml html={e.details} />
          </div>
        ))}
      </Section>
    )),
    education: () => (education?.length > 0 && (
      <Section title="Education" accent={accent}>
        {education.map((ed, i) => (
          <div key={i} className="mb-3">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-semibold">{ed.school}</div>
                <div>{ed.degree}</div>
              </div>
              <div className="text-xs text-gray-500 ml-4">{dateRange(ed.start, ed.end)}</div>
            </div>
            <SanitizedHtml html={ed.details} small />
          </div>
        ))}
      </Section>
    )),
    projects: () => (projects?.length > 0 && (
      <Section title="Projects" accent={accent}>
        {projects.map((p, i) => (
          <div key={i} className="mb-3">
            <div className="flex items-baseline justify-between">
              <div className="font-medium">
                {p.name} {p.link && (<a href={p.link} className="text-blue-600 ml-1" target="_blank" rel="noreferrer">(link)</a>)}
              </div>
              <div className="text-xs text-gray-500 ml-4">{dateRange(p.start, p.end)}</div>
            </div>
            <SanitizedHtml html={p.details} small />
          </div>
        ))}
      </Section>
    )),
    achievements: () => data.achievements && (
      <Section title={data.achievementsTitle || 'Achievements'} accent={accent}>
        <SanitizedHtml html={data.achievements} />
      </Section>
    ),
    certifications: () => (certifications?.length > 0 && (
      <Section title={data.certificationsTitle || 'Certifications'} accent={accent}>
        <ul className="list-disc pl-5">
          {certifications.map((c, i) => (
            <li key={i} className="mb-1">
              <div className="flex items-baseline justify-between">
                <div className="font-medium">{c.name}{c.org ? `, ${c.org}` : ''}</div>
                <div className="text-xs text-gray-500 ml-4">{dateRange(c.start, c.end)}</div>
              </div>
            </li>
          ))}
        </ul>
      </Section>
    )),
    awards: () => (awards?.length > 0 && (
      <Section title={data.awardsTitle || 'Awards'} accent={accent}>
        <ul className="list-disc pl-5">
          {awards.map((a, i) => (
            <li key={i}>{a.name}{a.issuer ? `, ${a.issuer}` : ''} {a.year && `(${a.year})`}</li>
          ))}
        </ul>
      </Section>
    )),
    hobbies: () => hobbies && (<Section title="Hobbies" accent={accent}><p>{hobbies}</p></Section>),
  }
  return (
    <div>
      <Header personal={personal} accent={accent} />
      {order.filter(id => visible[id]).map((id) => (
        <div key={id}>{renderers[id]?.()}</div>
      ))}
    </div>
  )
}

function ModernTemplate({ data, accent, order, visible }) {
  const { personal, summary, skills, experience, education, projects, certifications, awards, hobbies } = data
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 border-r pr-4">
        <h2 className="text-xl font-bold mb-1">{personal.fullName || 'Your Name'}</h2>
        <div className="text-gray-600 mb-2">{personal.title || 'Title'}</div>
        <div className="text-xs text-gray-500 mb-4">
          {[personal.email, personal.phone, personal.location].filter(Boolean).join(' • ')}
        </div>
        {visible.skills && skills && (
          <Section title="Skills" accent={accent}><p>{skills}</p></Section>
        )}
      </div>
      <div className="col-span-2">
        {order.filter(id => visible[id]).map((id) => (
          <div key={id}>
            {id === 'summary' && summary && (
              <Section title="Summary" accent={accent}><p>{summary}</p></Section>
            )}
            {id === 'experience' && experience?.length > 0 && (
              <Section title="Experience" accent={accent}>
                {experience.map((e, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="font-semibold">{e.company}</div>
                        <div>{e.role}</div>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">{dateRange(e.start, e.end)}</div>
                    </div>
                    <SanitizedHtml html={e.details} />
                  </div>
                ))}
              </Section>
            )}
            {id === 'education' && education?.length > 0 && (
              <Section title="Education" accent={accent}>
                {education.map((ed, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="font-semibold">{ed.school}</div>
                        <div>{ed.degree}</div>
                      </div>
                      <div className="text-xs text-gray-500 ml-4">{dateRange(ed.start, ed.end)}</div>
                    </div>
                    <SanitizedHtml html={ed.details} small />
                  </div>
                ))}
              </Section>
            )}
            {id === 'projects' && projects?.length > 0 && (
              <Section title="Projects" accent={accent}>
                {projects.map((p, i) => (
                  <div key={i} className="mb-3">
                    <div className="flex items-baseline justify-between">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500 ml-4">{dateRange(p.start, p.end)}</div>
                    </div>
                    <SanitizedHtml html={p.details} small />
                  </div>
                ))}
              </Section>
            )}
            {id === 'achievements' && data.achievements && (
              <Section title={data.achievementsTitle || 'Achievements'} accent={accent}>
                <SanitizedHtml html={data.achievements} />
              </Section>
            )}
            {id === 'certifications' && certifications?.length > 0 && (
              <Section title={data.certificationsTitle || 'Certifications'} accent={accent}>
                <ul className="list-disc pl-5">
                  {certifications.map((c, i) => (
                    <li key={i} className="mb-1">
                      <div className="flex items-baseline justify-between">
                        <div className="font-medium">{c.name}{c.org ? `, ${c.org}` : ''}</div>
                        <div className="text-xs text-gray-500 ml-4">{dateRange(c.start, c.end)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {id === 'awards' && awards?.length > 0 && (
              <Section title={data.awardsTitle || 'Awards'} accent={accent}>
                <ul className="list-disc pl-5">
                  {awards.map((a, i) => (
                    <li key={i}>{a.name}{a.issuer ? `, ${a.issuer}` : ''} {a.year && `(${a.year})`}</li>
                  ))}
                </ul>
              </Section>
            )}
            {id === 'hobbies' && hobbies && (
              <Section title="Hobbies" accent={accent}><p>{hobbies}</p></Section>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
