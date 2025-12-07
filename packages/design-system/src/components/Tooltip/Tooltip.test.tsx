import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('shows tooltip on hover', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByRole('button');
    await user.hover(button);

    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
  });

  it('hides tooltip on unhover', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByRole('button');
    await user.hover(button);

    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });

    await user.unhover(button);

    await waitFor(() => {
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });
  });

  it('shows tooltip on focus', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Tooltip content">
        <button>Focus me</button>
      </Tooltip>
    );

    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
  });

  it('hides tooltip on blur', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Tooltip content="Tooltip content">
          <button>Focus me</button>
        </Tooltip>
        <button>Other button</button>
      </>
    );

    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });

    await user.tab();

    await waitFor(() => {
      expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
    });
  });

  it('adds aria-describedby to trigger when open', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );

    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('aria-describedby');

    await user.hover(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-describedby');
      const tooltipId = button.getAttribute('aria-describedby');
      expect(screen.getByText('Tooltip content')).toHaveAttribute('id', tooltipId);
    });
  });

  it('has role="tooltip"', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );

    await user.hover(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('supports different placements', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Bottom tooltip" placement="bottom">
        <button>Hover me</button>
      </Tooltip>
    );

    await user.hover(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Bottom tooltip')).toBeInTheDocument();
    });
  });

  it('respects delay prop', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Delayed tooltip" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    await user.hover(screen.getByRole('button'));

    // Should not appear immediately
    expect(screen.queryByText('Delayed tooltip')).not.toBeInTheDocument();

    // Should appear after delay
    await waitFor(
      () => {
        expect(screen.getByText('Delayed tooltip')).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('applies custom className', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Styled tooltip" className="custom-tooltip">
        <button>Hover me</button>
      </Tooltip>
    );

    await user.hover(screen.getByRole('button'));

    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip.className).toContain('custom-tooltip');
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Tooltip content="Accessible tooltip">
        <button>Hover me</button>
      </Tooltip>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
