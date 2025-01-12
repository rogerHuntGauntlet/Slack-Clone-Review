import { useState } from 'react'
import { Dialog } from '@headlessui/react'
import { X } from 'lucide-react'

interface AccessModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AccessModal({ isOpen, onClose, onSuccess }: AccessModalProps) {
  const [selectedTab, setSelectedTab] = useState<'founder' | 'riddle' | 'payment'>('founder')

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-gray-900 p-6 border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-semibold text-white">
              Get Access
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setSelectedTab('founder')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'founder'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Founder Code
            </button>
            <button
              onClick={() => setSelectedTab('riddle')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'riddle'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Solve Riddle
            </button>
            <button
              onClick={() => setSelectedTab('payment')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === 'payment'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Payment
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-gray-800 rounded-lg p-6">
            {selectedTab === 'founder' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Enter Founder Code</h3>
                <p className="text-gray-400">
                  Enter your exclusive founder code to get lifetime access. Only 500 slots available.
                </p>
                {/* Founder code form will go here */}
              </div>
            )}

            {selectedTab === 'riddle' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">Solve the Riddle</h3>
                <p className="text-gray-400">
                  What has keys, but no locks; space, but no room; and you can enter, but not go in?
                </p>
                {/* Riddle form will go here */}
              </div>
            )}

            {selectedTab === 'payment' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">One-time Payment</h3>
                <p className="text-gray-400">
                  Get immediate lifetime access with a one-time payment of $1,000.
                </p>
                {/* Payment button will go here */}
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
} 