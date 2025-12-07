import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Tabs, TabList, Tab, TabPanel } from './';

describe('Tabs', () => {
  const TestTabs = ({ onChange = jest.fn() }: { onChange?: (value: string) => void }) => (
    <Tabs defaultValue="tab1" onChange={onChange}>
      <TabList aria-label="Test tabs">
        <Tab value="tab1">Tab 1</Tab>
        <Tab value="tab2">Tab 2</Tab>
        <Tab value="tab3">Tab 3</Tab>
      </TabList>
      <TabPanel value="tab1">Content 1</TabPanel>
      <TabPanel value="tab2">Content 2</TabPanel>
      <TabPanel value="tab3">Content 3</TabPanel>
    </Tabs>
  );

  it('renders tabs and panels', () => {
    render(<TestTabs />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Content 1');
  });

  it('shows first tab selected by default', () => {
    render(<TestTabs />);

    const firstTab = screen.getByRole('tab', { name: 'Tab 1' });
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('switches tabs on click', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2);

    expect(tab2).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Content 2')).toBeInTheDocument();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('calls onChange when tab is clicked', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<TestTabs onChange={onChange} />);

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    await user.click(tab2);

    expect(onChange).toHaveBeenCalledWith('tab2');
  });

  it('navigates with arrow keys', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    tab1.focus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tab 3' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveFocus();
  });

  it('navigates backwards with left arrow', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    tab1.focus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Tab 3' })).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveFocus();
  });

  it('navigates to first tab with Home key', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    const tab3 = screen.getByRole('tab', { name: 'Tab 3' });
    await user.click(tab3);
    tab3.focus();

    await user.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: 'Tab 1' })).toHaveFocus();
  });

  it('navigates to last tab with End key', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    tab1.focus();

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'Tab 3' })).toHaveFocus();
  });

  it('handles disabled tabs', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(
      <Tabs defaultValue="tab1" onChange={onChange}>
        <TabList aria-label="Test tabs">
          <Tab value="tab1">Tab 1</Tab>
          <Tab value="tab2" disabled>Tab 2</Tab>
          <Tab value="tab3">Tab 3</Tab>
        </TabList>
        <TabPanel value="tab1">Content 1</TabPanel>
        <TabPanel value="tab2">Content 2</TabPanel>
        <TabPanel value="tab3">Content 3</TabPanel>
      </Tabs>
    );

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    expect(tab2).toBeDisabled();

    await user.click(tab2);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('links tabs to panels with ARIA attributes', () => {
    render(<TestTabs />);

    const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
    const panel1 = screen.getByRole('tabpanel');

    const panelId = panel1.getAttribute('id');
    const tabId = tab1.getAttribute('id');

    expect(tab1).toHaveAttribute('aria-controls', panelId);
    expect(panel1).toHaveAttribute('aria-labelledby', tabId);
  });

  it('manages focus with tabindex', () => {
    render(<TestTabs />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('tabindex', '0');
    expect(tabs[1]).toHaveAttribute('tabindex', '-1');
    expect(tabs[2]).toHaveAttribute('tabindex', '-1');
  });

  it('supports controlled mode', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    const { rerender } = render(
      <Tabs value="tab1" onChange={onChange}>
        <TabList aria-label="Test tabs">
          <Tab value="tab1">Tab 1</Tab>
          <Tab value="tab2">Tab 2</Tab>
        </TabList>
        <TabPanel value="tab1">Content 1</TabPanel>
        <TabPanel value="tab2">Content 2</TabPanel>
      </Tabs>
    );

    await user.click(screen.getByRole('tab', { name: 'Tab 2' }));
    expect(onChange).toHaveBeenCalledWith('tab2');

    // Manually update the controlled value
    rerender(
      <Tabs value="tab2" onChange={onChange}>
        <TabList aria-label="Test tabs">
          <Tab value="tab1">Tab 1</Tab>
          <Tab value="tab2">Tab 2</Tab>
        </TabList>
        <TabPanel value="tab1">Content 1</TabPanel>
        <TabPanel value="tab2">Content 2</TabPanel>
      </Tabs>
    );

    expect(screen.getByRole('tab', { name: 'Tab 2' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TestTabs />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
