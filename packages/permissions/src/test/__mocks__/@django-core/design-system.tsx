import React from 'react';

export const Modal = ({ children, isOpen, onClose, title }: any) => (
  isOpen ? (
    <div data-testid="modal">
      <div data-testid="modal-header">
        {title}
        <button onClick={onClose} data-testid="modal-close">Close</button>
      </div>
      <div data-testid="modal-body">{children}</div>
    </div>
  ) : null
);

export const Grid = ({ children, ...props }: any) => <div data-testid="grid" {...props}>{children}</div>;
export const Text = ({ children, ...props }: any) => <span data-testid="text" {...props}>{children}</span>;
export const Badge = ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>;
export const Stack = ({ children, ...props }: any) => <div data-testid="stack" {...props}>{children}</div>;
export const Heading = ({ children, ...props }: any) => <h2 data-testid="heading" {...props}>{children}</h2>;
export const Box = ({ children, ...props }: any) => <div data-testid="box" {...props}>{children}</div>;
export const Button = ({ children, ...props }: any) => <button data-testid="button" {...props}>{children}</button>;
export const Select = ({ options, ...props }: any) => (
  <select data-testid="select" {...props}>
    {options.map((opt: any) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);
export const Spinner = () => <div data-testid="spinner">Loading...</div>;
export const Card = ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>;
