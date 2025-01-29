import React from 'react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <div className="relative">
      {children}
    </div>
  );
}

export function SelectTrigger({ children }: { children: React.ReactNode }) {
  return (
    <button className="w-full px-3 py-2 border border-gray-300 rounded-md flex items-center justify-between bg-white">
      {children}
      <span className="ml-2">▼</span>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-gray-500">{placeholder}</span>;
}

export function SelectContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
      {children}
    </div>
  );
}

export function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <button
      className="w-full px-3 py-2 text-left hover:bg-gray-100"
      onClick={() => {
        const select = document.querySelector('select');
        if (select) {
          select.value = value;
          select.dispatchEvent(new Event('change'));
        }
      }}
    >
      {children}
    </button>
  );
} 