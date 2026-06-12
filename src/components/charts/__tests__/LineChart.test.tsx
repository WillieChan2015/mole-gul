import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppLineChart } from '../LineChart';

const mockData = [
  { timestamp: '10:00', cpu: 45, memory: 60 },
  { timestamp: '10:01', cpu: 50, memory: 62 },
  { timestamp: '10:02', cpu: 48, memory: 61 },
];

const mockLines = [
  { dataKey: 'cpu', name: 'CPU', color: '#1976d2' },
  { dataKey: 'memory', name: 'Memory', color: '#4caf50' },
];

describe('AppLineChart', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <AppLineChart
        data={mockData}
        lines={mockLines}
        xAxisKey="timestamp"
      />
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with custom height', () => {
    const { container } = render(
      <AppLineChart
        data={mockData}
        lines={mockLines}
        xAxisKey="timestamp"
        height={300}
      />
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
