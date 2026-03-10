/**
 * PeriodCreateModal - Form fields components
 */
import React from 'react';
import styles from './PeriodCreateModal.module.css';

interface FieldSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
  required,
  placeholder = 'Select...',
}: FieldSelectProps) {
  return (
    <>
      <label className="fw-600" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </>
  );
}

interface FieldInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date';
  disabled?: boolean;
  required?: boolean;
}

export function FieldInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  disabled,
  required,
}: FieldInputProps) {
  return (
    <>
      <label className="fw-600" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`rounded-6 border bg-surface-2 text-primary ${styles.formControl}`}
      />
    </>
  );
}

interface FieldTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
}

export function FieldTextarea({
  id,
  label,
  value,
  onChange,
  rows = 5,
  disabled,
}: FieldTextareaProps) {
  return (
    <>
      <label className="fw-600" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        disabled={disabled}
        className={`rounded-6 border bg-surface-2 text-primary ${styles.textarea}`}
      />
    </>
  );
}
