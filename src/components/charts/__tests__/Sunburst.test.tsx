import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppSunburst } from '../Sunburst';

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

describe('AppSunburst', () => {
  it('renders without crashing', () => {
    const { container } = render(<AppSunburst data={mockData} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });

  it('renders with center content', () => {
    const { container } = render(
      <AppSunburst data={mockData} centerContent={<text>Total</text>} />
    );
    expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
  });
});
