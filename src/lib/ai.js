import { GoogleGenerativeAI } from '@google/generative-ai'



const apiKey = import.meta.env.VITE_GEMINI_API_KEY
let model

function getModel() {
  if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY')
  if (!model) {
    const genAI = new GoogleGenerativeAI(apiKey)
    model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  }
  return model
}

export async function generateSectionContent(prompt) {
  const m = getModel()
  const res = await m.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
  const text = res.response.text()
  return text
}

export async function generateCoverLetter({ role, company, highlights, resumeText, tone = 'professional' }) {
  const m = getModel()
  const prompt = `Write a ${tone} cover letter for the role "${role}" at "${company}". Use the candidate highlights: ${highlights}. Base it on this resume:\n${resumeText}. Keep it concise (200-300 words).`
  const res = await m.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
  return res.response.text()
}
