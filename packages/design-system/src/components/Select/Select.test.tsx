import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Select } from './Select';

const mockOptions = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
  { value: '4', label: 'Option 4', disabled: true },
];

describe('Select', () => {
  const defaultProps = {
    options: mockOptions,
    onChange: jest.fn(),
  };

  it('renders with placeholder', () => {
    render(<Select {...defaultProps} placeholder="Choose an option" />);
    expect(screen.getByRole('button')).toHaveTextContent('Choose an option');
  });

  it('renders with selected value', () => {
    render(<Select {...defaultProps} value="2" />);
    expect(screen.getByRole('button')).toHaveTextContent('Option 2');
  });

  it('opens dropdown on button click', async () => {
    const user = userEvent.setup();
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Select {...defaultProps} />
        <button>Outside</button>
      </div>
    );

    const button = screen.getByRole('button', { name: /select/i });
    await user.click(button);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByText('Outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onChange when option is selected', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Select {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.click(screen.getByText('Option 2'));

    expect(onChange).toHaveBeenCalledWith('2');
  });

  it('navigates with arrow keys', async () => {
    const user = userEvent.setup();
    render(<Select {...defaultProps} />);

    const button = screen.getByRole('button');
    await user.click(button);

    const listbox = screen.getByRole('listbox');

    await user.keyboard('{ArrowDown}');
    expect(listbox).toHaveAttribute('aria-activedescendant');

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');
    expect(listbox).toHaveAttribute('aria-activedescendant');
  });

  it('selects with Enter key', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Select {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByRole('button'));
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes with Escape key', async () => {
    const user = userEvent.setup();
    render(<Select {...defaultProps} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('navigates to first option with Home key', async () => {
    const user = userEvent.setup();
    render(<Select {...defaultProps} />);

    await user.click(screen.getByRole('button'));
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Home}');

    const listbox = screen.getByRole('listbox');
    const activeId = listbox.getAttribute('aria-activedescendant');
    expect(activeId).toContain('option-0');
  });

  it('navigates to last option with End key', async () => {
    const user = userEvent.setup();
    render(<Select {...defaultProps} />);

    await user.click(screen.getByRole('button'));
    await user.keyboard('{End}');

    const listbox = screen.getByRole('listbox');
    const activeId = listbox.getAttribute('aria-activedescendant');
    expect(activeId).toContain('option-3');
  });

  it('does not select disabled options', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<Select {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByRole('button'));

    const disabledOption = screen.getByText('Option 4');
    await user.click(disabledOption);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows selected indicator', async () => {
    const user = userEvent.setup();
    render(<Select {...defaultProps} value="2" />);

    await user.click(screen.getByRole('button'));

    const options = screen.getAllByRole('option');
    const selectedOption = options.find(opt => opt.getAttribute('aria-selected') === 'true');
    expect(selectedOption).toHaveTextContent('Option 2');
    expect(selectedOption).toHaveTextContent('✓');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Select {...defaultProps} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('has proper ARIA attributes', async () => {
    const user = userEvent.setup();
    render(<Select {...defaultProps} aria-label="Select an option" />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-haspopup', 'listbox');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Select {...defaultProps} aria-label="Test select" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
