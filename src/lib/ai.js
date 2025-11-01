const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

async function generateSectionContent(prompt) {
  if (!API_KEY) {
    throw new Error('Missing VITE_GEMINI_API_KEY environment variable');
  }

  try {
    // Using Gemini 1.5 Pro model
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to generate content');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Error in generateSectionContent:', error);
    throw error;
  }
}

async function generateCoverLetter({ role, company, highlights, resumeText, tone = 'professional' }) {
  const prompt = `Write a ${tone} cover letter for the role "${role}" at "${company}". Use the candidate highlights: ${highlights}. Base it on this resume:\n${resumeText}. Keep it concise (200-300 words).`;
  return generateSectionContent(prompt);
}

export { generateSectionContent, generateCoverLetter };
