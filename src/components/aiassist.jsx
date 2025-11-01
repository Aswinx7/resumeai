import { useState } from 'react';

export default function AIResumeAssistant({ section, onAction }) {
    const [customPrompt, setCustomPrompt] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeButton, setActiveButton] = useState(null);

    const handleAction = async (action) => {
        if (isProcessing) return;

        setActiveButton(action);
        setIsProcessing(true);

        try {
            let prompt = '';
            const currentContent = document.querySelector('.rich-editor')?.innerText || '';
            
            if (!currentContent.trim()) {
                throw new Error('Please enter some text first');
            }
            
            // Define prompts based on action
            switch(action) {
                case 'fix_grammar':
                    prompt = `Fix any grammar, spelling, and punctuation errors in the following text. Keep the same meaning and tone. Only return the corrected text.\n\n${currentContent}`;
                    break;
                case 'expand':
                    prompt = `Expand and elaborate on the following text to make it more detailed and comprehensive while maintaining the original meaning and tone. Only return the expanded text.\n\n${currentContent}`;
                    break;
                case 'shorten':
                    prompt = `Make the following text more concise while preserving the key information and meaning. Only return the shortened text.\n\n${currentContent}`;
                    break;
                case 'refine_tone':
                    prompt = `Refine the following text to have a more professional and polished tone. Make it sound more impressive and engaging. Only return the refined text.\n\n${currentContent}`;
                    break;
                case 'custom':
                    if (!customPrompt.trim()) return;
                    prompt = `${customPrompt}\n\nHere's the current text to work with:\n${currentContent}`;
                    break;
                default:
                    setIsProcessing(false);
                    setActiveButton(null);
                    return;
            }

            // Import the AI function dynamically to avoid loading it if not used
            const { generateSectionContent } = await import('../lib/ai');
            const result = await generateSectionContent(prompt);
            
            // Call the parent's onAction with the result
            if (onAction) {
                onAction(action, result);
            }

        } catch (error) {
            console.error('AI processing error:', error);
            // Fallback to the original approach if the API call fails
            if (onAction) {
                onAction(action, customPrompt);
            }
        } finally {
            setIsProcessing(false);
            setActiveButton(null);
            setCustomPrompt(''); // Clear the custom prompt after use
        }
    };

    const handleCustomPrompt = (e) => {
        if (e.key === 'Enter' && customPrompt.trim()) {
            handleAction('custom');
        }
    };

    // Debug: Log environment variables (remove this in production)
    console.log('Environment variables:', import.meta.env);
    console.log('API Key exists:', !!import.meta.env.VITE_GEMINI_API_KEY);
    console.log('API Key value:', import.meta.env.VITE_GEMINI_API_KEY ? '***' + import.meta.env.VITE_GEMINI_API_KEY.slice(-4) : 'Not set');

    const actionButtons = [
        { id: 'fix_grammar', label: 'Fix Grammar', icon: '✏️' },
        { id: 'expand', label: 'More Words', icon: '➕' },
        { id: 'shorten', label: 'Reduce Words', icon: '➖' },
        { id: 'refine_tone', label: 'Refine Tone', icon: '🎨' },
    ];

    // Check if the AI API key is configured
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
        console.error('Warning: VITE_GEMINI_API_KEY is not set. AI features will not work.');
        return (
            <div className="mt-3 bg-yellow-50 rounded-xl p-3 border border-yellow-100 text-sm text-yellow-800">
                <p>AI features are disabled. Please set the VITE_GEMINI_API_KEY in your .env file.</p>
                <p className="mt-2 text-xs">(Check the browser console for debugging information)</p>
            </div>
        );
    }

    return (
        <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 text-xs">AI</span>
                </div>
                <h3 className="text-xs font-medium text-gray-700">AI Assistant</h3>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-2">
                {actionButtons.map(({ id, label, icon }) => (
                    <button
                        key={id}
                        onClick={() => handleAction(id)}
                        disabled={isProcessing}
                        className={`flex items-center justify-center gap-1 px-2 py-1.5 bg-white border rounded-lg text-xs font-medium ${activeButton === id
                            ? 'text-blue-600 border-blue-300 bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <span>{icon}</span>
                        <span>{label}</span>
                    </button>
                ))}
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={handleCustomPrompt}
                    placeholder={`Custom instruction for ${section}...`}
                    className="w-full pr-8 pl-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-200"
                    disabled={isProcessing}
                />
                <button
                    onClick={() => customPrompt.trim() && handleAction('custom')}
                    disabled={isProcessing || !customPrompt.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-blue-500 hover:text-blue-700 disabled:opacity-30"
                    title="Send custom prompt"
                >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
