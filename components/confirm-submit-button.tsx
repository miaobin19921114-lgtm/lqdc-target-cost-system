'use client';

import type React from 'react';

type Props = {
  children: string;
  message: string;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
  title?: string;
  name?: string;
  value?: string;
};

export function ConfirmSubmitButton({ children, message, className = 'btn', disabled, style, title, name, value }: Props) {
  return <button
    type="submit"
    name={name}
    value={value}
    className={className}
    disabled={disabled}
    title={title}
    style={style}
    onClick={(event) => {
      if (disabled) return;
      if (!window.confirm(message)) event.preventDefault();
    }}
  >
    {children}
  </button>;
}
