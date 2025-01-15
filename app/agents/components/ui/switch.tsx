'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';

interface SwitchProps extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function Switch({ checked, onCheckedChange, ...props }: SwitchProps) {
  return (
    <SwitchPrimitives.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        ${checked ? 'bg-blue-600' : 'bg-gray-700'}
      `}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={`
          pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg
          ring-0 transition-transform duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0.5'}
        `}
      />
    </SwitchPrimitives.Root>
  );
} 