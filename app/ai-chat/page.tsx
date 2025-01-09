'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'

const randomPrompts = [
  "Unraveling the secrets of community dominance...",
  "Deciphering the path to ultimate influence...",
  "Scheming for absolute efficiency and power...",
  "Whispering truths only the bold dare ask...",
  "Calculating the masterstroke to outshine everyone...",
  "Peering into the shadows for hidden insights...",
  "Crafting the ultimate strategy for control...",
  "Exploring forbidden tactics of community engagement...",
  "Devising flawless moves in the game of influence...",
  "Unleashing clandestine wisdom for unparalleled success...",
]

export default function AIChatPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [currentPrompt, setCurrentPrompt] = useState('')

  useEffect(() => {
    setCurrentPrompt(randomPrompts[Math.floor(Math.random() * randomPrompts.length)])
  }, [])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      setMessages([...messages, { role: 'user', content: inputMessage }])
      // Here you would typically call an API to get the AI's response
      // For now, we'll just echo the message back
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', content: `Echo: ${inputMessage}` }])
      }, 500)
      setInputMessage('')
      setCurrentPrompt(randomPrompts[Math.floor(Math.random() * randomPrompts.length)])
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center">
        <Link href="/platform" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mr-4">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Assistant</h1>
      </header>
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
            <p className="text-sm italic text-gray-600 dark:text-gray-400">{currentPrompt}</p>
          </div>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                  message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                } rounded-lg p-3 shadow-md`}>
                  <p>{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <footer className="bg-white dark:bg-gray-800 shadow-md p-4">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 transition-colors flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  )
}
