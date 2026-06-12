import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppTreemap } from '../Treemap';

const mockData = [
  {
    name: 'root',
    size: 1000,
    children: [
      { name: 'child1', size: 600 },
      { name: 'child2', size: 400 },
    ],
  },
];

describe('AppTreemap', () => {
  it('renders without crashing', () => {
    const { container } = render(<AppTreemap data={mockData} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with custom height', () => {
    const { container } = render(<AppTreemap data={mockData} height={400} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
