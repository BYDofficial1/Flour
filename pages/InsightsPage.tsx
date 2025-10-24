import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ai } from '../utils/gemini';
import type { Transaction } from '../types';
import type { TimeFilter } from '../App';
import TimeFilterControls from '../components/TimeFilterControls';
import { SparklesIcon } from '../components/icons/SparklesIcon';
import { WheatIcon } from '../components/icons/WheatIcon';
import { UserIcon } from '../components/icons/UserIcon';
import { ExclamationCircleIcon } from '../components/icons/ExclamationCircleIcon';

interface InsightsPageProps {
    transactions: Transaction[];
    timeFilter: TimeFilter;
    setTimeFilter: (filter: TimeFilter) => void;
}

interface Message {
    id: number;
    text: string;
    sender: 'user' | 'ai';
}

const PRESET_QUESTIONS = [
    "Who are my top 5 customers this month?",
    "What's my busiest day of the week?",
    "Give me a summary of my sales for 'Wheat Grinding' in the last 7 days."
];

const InsightsPage: React.FC<InsightsPageProps> = ({ transactions, timeFilter, setTimeFilter }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatResponse = (text: string) => {
        // Basic markdown-like formatting for display
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\n/g, '<br />'); // Newlines
    };

    const handleSendMessage = useCallback(async (question: string) => {
        if (!question.trim() || isLoading) return;

        const newUserMessage: Message = { id: Date.now(), text: question, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            // The `!ai` check at the top of the component prevents this from being called if ai is null.
            // Using ai! is safe here.
            
            // Pre-process data to create a concise summary for the model
            // This is more efficient than sending all raw data
            const dataSummary = JSON.stringify(transactions.slice(0, 100).map(t => ({
                customer: t.customerName,
                item: t.item,
                total: t.total,
                quantity: t.quantity,
                date: t.date,
            })), null, 2);

            const prompt = `You are a helpful business analyst for an Atta Chakki (flour mill) owner in India. Your tone should be friendly, encouraging, and easy to understand for someone who is not a data expert.

            Based on the following transaction data for the selected time period, please answer the user's question. 
            
            - When asked for top customers, list them with their total spending.
            - When asked for the busiest day, calculate it based on the number of transactions per day of the week (0=Sunday, 6=Saturday).
            - Always provide a brief, actionable insight with your answer.
            - Format your response using basic markdown (bolding with **text** and newlines).
            
            Transaction Data (first 100 records in JSON format):
            ${dataSummary}
            
            User's Question: "${question}"
            `;

            const response = await ai!.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const aiResponseText = response.text;
            const newAiMessage: Message = { id: Date.now() + 1, text: aiResponseText, sender: 'ai' };
            setMessages(prev => [...prev, newAiMessage]);

        } catch (error: any) {
            console.error("Error with Gemini API:", error);
            const errorMessage: Message = {
                id: Date.now() + 1,
                text: `Sorry, I couldn't get an answer for you. Please check your setup. 😤 Error: ${error.message}`,
                sender: 'ai',
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }

    }, [transactions, isLoading]);

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSendMessage(userInput);
    };

    if (!ai) {
        return (
            <div className="mt-4 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-bold text-slate-700">AI Business Insights</h2>
                     </div>
                     <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
                </div>
                
                <div className="bg-white rounded-xl shadow-lg border border-red-200/80 flex flex-col justify-center items-center text-center p-8" style={{ height: '70vh' }}>
                    <div className="bg-red-100 p-4 rounded-full w-fit">
                        <ExclamationCircleIcon className="text-red-500 h-10 w-10" />
                    </div>
                    <h3 className="text-xl font-semibold text-slate-800 mt-4">AI Service Not Configured</h3>
                    <p className="text-slate-600 mt-2 max-w-md">
                        To use the AI Insights feature, you need to set up your Gemini API key in your hosting environment (e.g., Vercel).
                    </p>
                    <div className="mt-4 bg-slate-100 p-4 rounded-lg text-left text-sm text-slate-700">
                        <p className="font-bold">How to fix this:</p>
                        <ol className="list-decimal list-inside mt-2 space-y-1">
                             <li>Go to your project settings on your hosting provider (like Vercel).</li>
                            <li>Add a new Environment Variable:</li>
                            <code className="block bg-slate-200 p-2 rounded mt-1 text-xs font-mono">API_KEY="your-gemini-api-key"</code>
                            <li>Replace <code className="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono">"your-gemini-api-key"</code> with your actual key from Google AI Studio.</li>
                            <li>Redeploy your application.</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-700">AI Business Insights</h2>
                 </div>
                 <TimeFilterControls timeFilter={timeFilter} setTimeFilter={setTimeFilter} />
            </div>
            
            <div className="bg-white rounded-xl shadow-lg border border-amber-200/50 flex flex-col" style={{ height: '70vh' }}>
                <div className="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
                    {messages.length === 0 && (
                        <div className="text-center h-full flex flex-col justify-center items-center">
                            <div className="bg-amber-100 p-4 rounded-full w-fit">
                                <SparklesIcon />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mt-4">Ask me anything!</h3>
                            <p className="text-slate-500 mt-2 max-w-sm">Get instant insights about your business. Try one of the suggestions below or ask your own question.</p>
                        </div>
                    )}
                    {messages.map(msg => (
                        <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                            {msg.sender === 'ai' && <div className="flex-shrink-0 w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center"><WheatIcon /></div>}
                            <div className={`max-w-md lg:max-w-lg p-3 rounded-lg ${msg.sender === 'user' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-800'}`}>
                                <p className="text-sm" dangerouslySetInnerHTML={{ __html: formatResponse(msg.text) }} />
                            </div>
                            {msg.sender === 'user' && <div className="flex-shrink-0 w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center"><UserIcon /></div>}
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex items-end gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center"><WheatIcon /></div>
                            <div className="max-w-xs p-3 rounded-lg bg-slate-100 text-slate-800">
                                <div className="flex items-center space-x-2">
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        </div>
                    )}
                     <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t bg-slate-50 rounded-b-xl">
                    <div className="flex flex-wrap gap-2 mb-3">
                        {PRESET_QUESTIONS.map(q => (
                            <button 
                                key={q}
                                onClick={() => handleSendMessage(q)}
                                disabled={isLoading}
                                className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full hover:bg-amber-200 disabled:opacity-50 transition-colors"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleFormSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            placeholder={isLoading ? "Thinking..." : "Ask about your sales, customers, etc."}
                            disabled={isLoading}
                            className="flex-1 w-full px-4 py-2 bg-white text-slate-800 placeholder-slate-400 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:bg-slate-100"
                        />
                        <button type="submit" disabled={isLoading || !userInput.trim()} className="px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg shadow-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:bg-amber-300 disabled:cursor-not-allowed transition-colors">
                            Send
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default InsightsPage;