import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from './DataTable';

interface TestRow {
  id: string;
  name: string;
  age: number;
}

const columns: Column<TestRow>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name, sortable: true },
  { key: 'age', header: 'Age', render: (r) => r.age, sortable: true, sortFn: (a, b) => a.age - b.age },
];

const data: TestRow[] = [
  { id: '1', name: 'Alice', age: 30 },
  { id: '2', name: 'Bob', age: 25 },
  { id: '3', name: 'Charlie', age: 35 },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
  });

  it('renders row data', () => {
    render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('shows empty message when no data', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(r) => r.id} emptyMessage="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('shows default empty message', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(r) => r.id} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(r) => r.id} loading />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('calls onRowClick when row is clicked', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Alice'));
    expect(onRowClick).toHaveBeenCalledWith(data[0]);
  });

  it('sorts by column header click', () => {
    const { container } = render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} />);
    // Click Age header to sort
    fireEvent.click(screen.getByText('Age'));
    const rows = container.querySelectorAll('tbody tr');
    // After sort asc by age: Bob(25), Alice(30), Charlie(35)
    expect(rows[0]).toHaveTextContent('Bob');
    expect(rows[2]).toHaveTextContent('Charlie');
  });

  it('toggles sort direction on double click', () => {
    const { container } = render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} />);
    const ageHeader = screen.getByText('Age');
    fireEvent.click(ageHeader); // asc
    fireEvent.click(ageHeader); // desc
    const rows = container.querySelectorAll('tbody tr');
    // Desc by age: Charlie(35), Alice(30), Bob(25)
    expect(rows[0]).toHaveTextContent('Charlie');
    expect(rows[2]).toHaveTextContent('Bob');
  });
});
