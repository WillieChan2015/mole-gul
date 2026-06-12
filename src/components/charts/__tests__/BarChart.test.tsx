import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppBarChart } from '../BarChart';

const mockData = [
  { name: 'Category A', value1: 100, value2: 200 },
  { name: 'Category B', value1: 150, value2: 180 },
];

const mockBars = [
  { dataKey: 'value1', name: 'Value 1', color: '#1976d2' },
  { dataKey: 'value2', name: 'Value 2', color: '#4caf50' },
];

describe('AppBarChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AppBarChart
        data={mockData}
        bars={mockBars}
        xAxisKey="name"
      />
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders horizontal bar chart', () => {
    const { container } = render(
      <AppBarChart
        data={mockData}
        bars={mockBars}
        xAxisKey="name"
        direction="horizontal"
      />
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
