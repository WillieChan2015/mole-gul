import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppPieChart } from '../PieChart';

const mockData = [
  { name: 'Category A', value: 400 },
  { name: 'Category B', value: 300 },
  { name: 'Category C', value: 300 },
];

describe('AppPieChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<AppPieChart data={mockData} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with center content', () => {
    const { container } = render(
      <AppPieChart
        data={mockData}
        centerContent={<text>1000</text>}
      />
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
