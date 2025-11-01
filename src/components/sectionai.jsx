// import { useState } from 'react';

// export default function AIResumeAssistant({ section, onAction }) {
//     const [customPrompt, setCustomPrompt] = useState('');
//     const [isProcessing, setIsProcessing] = useState(false);
//     const [activeButton, setActiveButton] = useState(null);

//     const handleAction = (action) => {
//         if (isProcessing) return;

//         setActiveButton(action);
//         setIsProcessing(true);

//         // Simulate API call
//         setTimeout(() => {
//             console.log(`AI Action: ${action} for ${section}`);
//             setIsProcessing(false);
//             setActiveButton(null);

//             // Call the parent's onAction if provided
//             if (onAction) {
//                 onAction(action, customPrompt);
//             }
//         }, 1000);
//     };

//     const handleCustomPrompt = (e) => {
//         if (e.key === 'Enter' && customPrompt.trim()) {
//             handleAction('custom');
//         }
//     };

//     const actionButtons = [
//         { id: 'fix_grammar', label: 'Fix Grammar', icon: '✏️' },
//         { id: 'expand', label: 'More Words', icon: '➕' },
//         { id: 'shorten', label: 'Reduce Words', icon: '➖' },
//         { id: 'refine_tone', label: 'Refine Tone', icon: '🎨' },
//     ];

//     return (
//         <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
//             <div className="flex items-center gap-2 mb-2">
//                 <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
//                     <span className="text-blue-600 text-xs">AI</span>
//                 </div>
//                 <h3 className="text-xs font-medium text-gray-700">AI Assistant</h3>
//             </div>

//             <div className="grid grid-cols-2 gap-1.5 mb-2">
//                 {actionButtons.map(({ id, label, icon }) => (
//                     <button
//                         key={id}
//                         onClick={() => handleAction(id)}
//                         disabled={isProcessing}
//                         className={`flex items-center justify-center gap-1 px-2 py-1.5 bg-white border rounded-lg text-xs font-medium ${activeButton === id
//                             ? 'text-blue-600 border-blue-300 bg-blue-50'
//                             : 'text-gray-700 hover:bg-gray-50'
//                             }`}
//                     >
//                         <span>{icon}</span>
//                         <span>{label}</span>
//                     </button>
//                 ))}
//             </div>

//             <div className="relative">
//                 <input
//                     type="text"
//                     value={customPrompt}
//                     onChange={(e) => setCustomPrompt(e.target.value)}
//                     onKeyDown={handleCustomPrompt}
//                     placeholder={`Custom instruction for ${section}...`}
//                     className="w-full pr-8 pl-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-200"
//                     disabled={isProcessing}
//                 />
//                 <button
//                     onClick={() => customPrompt.trim() && handleAction('custom')}
//                     disabled={isProcessing || !customPrompt.trim()}
//                     className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-blue-500 hover:text-blue-700 disabled:opacity-30"
//                     title="Send custom prompt"
//                 >
//                     <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//                         <path d="m22 2-7 20-4-9-9-4Z" />
//                         <path d="M22 2 11 13" />
//                     </svg>
//                 </button>
//             </div>
//         </div>
//     );
// }
