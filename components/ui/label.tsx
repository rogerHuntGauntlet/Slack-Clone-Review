import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label(props: LabelProps) {
  return (
    <label
      {...props}
      className={`block text-sm font-medium text-gray-700 mb-1 ${props.className || ''}`}
    />
  );
} 