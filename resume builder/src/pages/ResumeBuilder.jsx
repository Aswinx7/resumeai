import { useMemo, useState } from 'react'
import { generateSectionContent } from '../lib/ai'
import {
  LuUser,
  LuBookOpen,
  LuBriefcase,
  LuFolderGit2,
  LuWrench,
  LuAward,
  LuSlidersHorizontal,
  LuLayoutTemplate
} from 'react-icons/lu'

const emptyResume = {
  personal: { fullName: '', title: '', email: '', phone: '', location: '' },
  summary: '',
  skills: '',
  experience: [{ company: '', role: '', period: '', details: '' }],
  education: [{ school: '', degree: '', period: '', details: '' }],
  projects: [{ name: '', link: '', details: '' }],
  certifications: [{ name: '', org: '', year: '' }],
  awards: [{ name: '', issuer: '', year: '' }],
  hobbies: ''
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

export default function ResumeBuilder() {
  const [resume, setResume] = useState(emptyResume)
  const [template, setTemplate] = useState('basic')
  const [loadingKey, setLoadingKey] = useState('')
  const [tab, setTab] = useState('personal')
  const [theme, setTheme] = useState({ font: 'sans', accent: '#2563eb' })

  const tabs = useMemo(() => ([
    { id: 'personal', label: 'Personal Details', icon: LuUser },
    { id: 'education', label: 'Education', icon: LuBookOpen },
    { id: 'experience', label: 'Work Experience', icon: LuBriefcase },
    { id: 'projects', label: 'Projects', icon: LuFolderGit2 },
    { id: 'skills', label: 'Skills', icon: LuWrench },
    { id: 'certifications', label: 'Certifications', icon: LuAward },
    { id: 'awards', label: 'Awards', icon: LuAward },
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

  const genExperienceBullets = async (idx) => {
    try {
      setLoadingKey(`exp-${idx}`)
      const exp = resume.experience[idx]
      const prompt = `Write 3-5 bullet points (concise, impact-driven) for the role ${exp.role} at ${exp.company}. Include metrics if reasonable.`
      const text = await generateSectionContent(prompt)
      upDeep('experience', idx, 'details', text)
    } finally { setLoadingKey('') }
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar */}
      <aside className="col-span-12 md:col-span-3 lg:col-span-2">
        <div className="bg-white rounded-2xl shadow p-2 sticky top-4">
          {tabs.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm mb-1 ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <Icon className="shrink-0" />
                <span>{t.label}</span>
              </button>
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
            </div>
          </div>
        )}

        {tab === 'skills' && (
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <SectionHeader title="Skills (comma separated)" />
            <input className="w-full border rounded-xl px-3 py-2" value={resume.skills} onChange={(e) => up('skills', e.target.value)} placeholder="React, Tailwind, Firebase, REST" />
          </div>
        )}

        {tab === 'experience' && (
          <div className="bg-white rounded-2xl shadow p-4 space-y-3">
            <SectionHeader title="Work Experience" />
            {resume.experience.map((exp, idx) => (
              <div key={idx} className="border rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <input className="border rounded-xl px-3 py-2" placeholder="Company" value={exp.company} onChange={(e) => upDeep('experience', idx, 'company', e.target.value)} />
                  <input className="border rounded-xl px-3 py-2" placeholder="Role" value={exp.role} onChange={(e) => upDeep('experience', idx, 'role', e.target.value)} />
                  <input className="border rounded-xl px-3 py-2 col-span-2" placeholder="Period (e.g., 2022 - Present)" value={exp.period} onChange={(e) => upDeep('experience', idx, 'period', e.target.value)} />
                </div>
                <SectionHeader title="Details" action="AI bullets" onAction={() => genExperienceBullets(idx)} loading={loadingKey === `exp-${idx}`} />
                <textarea rows={4} className="w-full border rounded-xl px-3 py-2" value={exp.details} onChange={(e) => upDeep('experience', idx, 'details', e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => addRow('experience', { company: '', role: '', period: '', details: '' })} className="text-sm text-blue-600">Add</button>
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
            <SectionHeader title="Education" />
            {resume.education.map((ed, idx) => (
              <div key={idx} className="border rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <input className="border rounded-xl px-3 py-2" placeholder="School" value={ed.school} onChange={(e) => upDeep('education', idx, 'school', e.target.value)} />
                  <input className="border rounded-xl px-3 py-2" placeholder="Degree" value={ed.degree} onChange={(e) => upDeep('education', idx, 'degree', e.target.value)} />
                  <input className="border rounded-xl px-3 py-2 col-span-2" placeholder="Period" value={ed.period} onChange={(e) => upDeep('education', idx, 'period', e.target.value)} />
                </div>
                <textarea rows={3} className="w-full border rounded-xl px-3 py-2" placeholder="Details" value={ed.details} onChange={(e) => upDeep('education', idx, 'details', e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => addRow('education', { school: '', degree: '', period: '', details: '' })} className="text-sm text-blue-600">Add</button>
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
            <SectionHeader title="Projects" />
            {resume.projects.map((p, idx) => (
              <div key={idx} className="border rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <input className="border rounded-xl px-3 py-2" placeholder="Project Name" value={p.name} onChange={(e) => upDeep('projects', idx, 'name', e.target.value)} />
                  <input className="border rounded-xl px-3 py-2" placeholder="Link" value={p.link} onChange={(e) => upDeep('projects', idx, 'link', e.target.value)} />
                </div>
                <textarea rows={3} className="w-full border rounded-xl px-3 py-2" placeholder="Details" value={p.details} onChange={(e) => upDeep('projects', idx, 'details', e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => addRow('projects', { name: '', link: '', details: '' })} className="text-sm text-blue-600">Add</button>
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
            <SectionHeader title="Certifications" />
            {resume.certifications.map((c, idx) => (
              <div key={idx} className="border rounded-xl p-3 space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  <input className="border rounded-xl px-3 py-2" placeholder="Name" value={c.name} onChange={(e) => upDeep('certifications', idx, 'name', e.target.value)} />
                  <input className="border rounded-xl px-3 py-2" placeholder="Organization" value={c.org} onChange={(e) => upDeep('certifications', idx, 'org', e.target.value)} />
                  <input className="border rounded-xl px-3 py-2" placeholder="Year" value={c.year} onChange={(e) => upDeep('certifications', idx, 'year', e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => addRow('certifications', { name: '', org: '', year: '' })} className="text-sm text-blue-600">Add</button>
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
            <SectionHeader title="Awards" />
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
      <section className="col-span-12 md:col-span-4 lg:col-span-5">
        <div className="bg-gray-100 rounded-2xl p-4 shadow-inner">
          <div className={`mx-auto bg-white shadow-xl rounded-xl p-8`} style={{ width: 794, minHeight: 1123, fontFamily: theme.font === 'serif' ? 'Georgia, Times, serif' : 'Inter, ui-sans-serif, system-ui', '--accent': theme.accent }}>
            {template === 'basic' ? (
              <BasicTemplate data={resume} accent={theme.accent} />
            ) : (
              <ModernTemplate data={resume} accent={theme.accent} />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function Section({ title, children, accent }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold tracking-wide uppercase mb-2" style={{ color: accent }}>{title}</h3>
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

function Header({ personal }) {
  return (
    <div className="mb-4 border-b pb-2">
      <h1 className="text-2xl font-bold">{personal.fullName || 'Your Name'}</h1>
      <div className="text-gray-600">{personal.title || 'Title'}</div>
      <div className="text-xs text-gray-500">{[personal.email, personal.phone, personal.location].filter(Boolean).join(' • ')}</div>
    </div>
  )
}

function BasicTemplate({ data, accent }) {
  const { personal, summary, skills, experience, education, projects, certifications, awards, hobbies } = data
  return (
    <div>
      <Header personal={personal} />
      {summary && (
        <Section title="Summary" accent={accent}><p>{summary}</p></Section>
      )}
      {skills && (
        <Section title="Skills" accent={accent}><p>{skills}</p></Section>
      )}
      {experience?.length > 0 && (
        <Section title="Experience" accent={accent}>
          {experience.map((e, i) => (
            <div key={i} className="mb-3">
              <div className="font-medium">{e.role} • {e.company}</div>
              <div className="text-xs text-gray-500 mb-1">{e.period}</div>
              <Bullets text={e.details} />
            </div>
          ))}
        </Section>
      )}
      {education?.length > 0 && (
        <Section title="Education" accent={accent}>
          {education.map((ed, i) => (
            <div key={i} className="mb-3">
              <div className="font-medium">{ed.degree} • {ed.school}</div>
              <div className="text-xs text-gray-500 mb-1">{ed.period}</div>
              <p className="text-sm">{ed.details}</p>
            </div>
          ))}
        </Section>
      )}
      {projects?.length > 0 && (
        <Section title="Projects" accent={accent}>
          {projects.map((p, i) => (
            <div key={i} className="mb-3">
              <div className="font-medium">
                {p.name} {p.link && (<a href={p.link} className="text-blue-600 ml-1" target="_blank" rel="noreferrer">(link)</a>)}
              </div>
              <p className="text-sm">{p.details}</p>
            </div>
          ))}
        </Section>
      )}
      {certifications?.length > 0 && (
        <Section title="Certifications" accent={accent}>
          <ul className="list-disc pl-5">
            {certifications.map((c, i) => (
              <li key={i}>{c.name} • {c.org} {c.year && `(${c.year})`}</li>
            ))}
          </ul>
        </Section>
      )}
      {awards?.length > 0 && (
        <Section title="Awards" accent={accent}>
          <ul className="list-disc pl-5">
            {awards.map((a, i) => (
              <li key={i}>{a.name} • {a.issuer} {a.year && `(${a.year})`}</li>
            ))}
          </ul>
        </Section>
      )}
      {hobbies && (
        <Section title="Hobbies" accent={accent}><p>{hobbies}</p></Section>
      )}
    </div>
  )
}

function ModernTemplate({ data, accent }) {
  const { personal, summary, skills, experience, education } = data
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 border-r pr-4">
        <h2 className="text-xl font-bold mb-1">{personal.fullName || 'Your Name'}</h2>
        <div className="text-gray-600 mb-2">{personal.title || 'Title'}</div>
        <div className="text-xs text-gray-500 mb-4">{[personal.email, personal.phone, personal.location].filter(Boolean).join(' • ')}</div>
        {skills && (
          <Section title="Skills" accent={accent}><p>{skills}</p></Section>
        )}
      </div>
      <div className="col-span-2">
        {summary && (
          <Section title="Summary" accent={accent}><p>{summary}</p></Section>
        )}
        {experience?.length > 0 && (
          <Section title="Experience" accent={accent}>
            {experience.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="font-medium">{e.role} • {e.company}</div>
                <div className="text-xs text-gray-500 mb-1">{e.period}</div>
                <Bullets text={e.details} />
              </div>
            ))}
          </Section>
        )}
        {education?.length > 0 && (
          <Section title="Education" accent={accent}>
            {education.map((ed, i) => (
              <div key={i} className="mb-3">
                <div className="font-medium">{ed.degree} • {ed.school}</div>
                <div className="text-xs text-gray-500 mb-1">{ed.period}</div>
                <p className="text-sm">{ed.details}</p>
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  )
}
