import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Heading } from './Heading';

expect.extend(toHaveNoViolations);

describe('Heading', () => {
  it('renders h1 by default', () => {
    render(<Heading>Title</Heading>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders h2 when level is 2', () => {
    render(<Heading level={2}>Subtitle</Heading>);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders h3 when level is 3', () => {
    render(<Heading level={3}>Section</Heading>);
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
  });

  it('renders h4 when level is 4', () => {
    render(<Heading level={4}>Subsection</Heading>);
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
  });

  it('renders h5 when level is 5', () => {
    render(<Heading level={5}>Minor heading</Heading>);
    expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
  });

  it('renders h6 when level is 6', () => {
    render(<Heading level={6}>Smallest heading</Heading>);
    expect(screen.getByRole('heading', { level: 6 })).toBeInTheDocument();
  });

  it('supports as prop for custom element', () => {
    render(<Heading as="span">Title</Heading>);
    const element = screen.getByText('Title');
    expect(element.tagName).toBe('SPAN');
  });

  it('preserves semantic level with as prop', () => {
    const { container } = render(<Heading level={2} as="div">Title</Heading>);
    const element = container.firstChild as HTMLElement;
    expect(element.tagName).toBe('DIV');
    expect(element.className).toContain('2');
  });

  it('forwards ref to element', () => {
    const ref = jest.fn();
    render(<Heading ref={ref}>Title</Heading>);
    expect(ref).toHaveBeenCalled();
    expect(ref.mock.calls[0][0]).toBeInstanceOf(HTMLHeadingElement);
  });

  it('applies custom className', () => {
    const { container } = render(<Heading className="custom-class">Title</Heading>);
    const element = container.firstChild as HTMLElement;
    expect(element.className).toContain('custom-class');
  });

  it('spreads additional props', () => {
    render(<Heading data-testid="custom-heading">Title</Heading>);
    expect(screen.getByTestId('custom-heading')).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('has no accessibility violations (h1)', async () => {
      const { container } = render(<Heading level={1}>Main Title</Heading>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (h3 with as prop)', async () => {
      const { container } = render(<Heading level={3} as="div">Section Title</Heading>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations (nested content)', async () => {
      const { container} = render(
        <Heading level={2}>
          Complex <em>heading</em> content
        </Heading>
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
