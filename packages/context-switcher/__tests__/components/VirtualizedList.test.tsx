import React from 'react';
import { render, screen } from '@testing-library/react';
import { VirtualizedList } from '../../src/components/VirtualizedList';

describe('VirtualizedList', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
  }));

  it('renders only visible items', () => {
    render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        itemHeight={48}
        height={400}
      />
    );

    // With 400px height and 48px item height, ~8-9 items visible
    // react-window renders visible items + small buffer
    // Test that not all 100 items are in DOM
    const visibleItems = screen.queryAllByText(/Item \d+/);
    expect(visibleItems.length).toBeLessThan(20); // Includes buffer
    expect(visibleItems.length).toBeGreaterThan(0);
  });

  it('accepts custom itemHeight', () => {
    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        itemHeight={64}
        height={400}
      />
    );

    // Check container exists with proper structure
    expect(container.querySelector('[style]')).toBeTruthy();
  });

  it('renders empty list', () => {
    const { container } = render(
      <VirtualizedList
        items={[]}
        renderItem={(item: { name: string }) => <div>{item.name}</div>}
        itemHeight={48}
        height={400}
      />
    );

    // Should render container even with no items
    expect(container.querySelector('[style]')).toBeTruthy();
  });

  it('renders with default props', () => {
    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
      />
    );

    expect(container.firstChild).toBeTruthy();
  });

  it('accepts custom className', () => {
    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        className="custom-list"
      />
    );

    expect(container.querySelector('.custom-list')).toBeTruthy();
  });

  it('handles single item', () => {
    const singleItem = [{ id: '1', name: 'Single Item' }];

    render(
      <VirtualizedList
        items={singleItem}
        renderItem={(item) => <div>{item.name}</div>}
      />
    );

    expect(screen.getByText('Single Item')).toBeInTheDocument();
  });

  it('handles large lists efficiently', () => {
    const largeList = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Item ${i}`,
    }));

    const startTime = performance.now();

    render(
      <VirtualizedList
        items={largeList}
        renderItem={(item) => <div>{item.name}</div>}
        itemHeight={48}
        height={400}
      />
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render quickly even with 10k items
    // Note: This is a rough check, actual time varies by environment
    expect(renderTime).toBeLessThan(1000); // 1 second max
  });
});
