import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Treemap as RechartsTreemap,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { tooltipStyles, darkTooltipStyles } from './tooltipStyles';

interface TreeNode {
  name: string;
  size: number;
  children?: TreeNode[];
  path?: string;
}

interface AppTreemapProps {
  data: TreeNode[];
  height?: number;
  onDrillDown?: (node: TreeNode) => void;
}

const COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

function CustomizedContent(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  index?: number;
  backgroundColor?: string;
}) {
  const { x = 0, y = 0, width = 0, height = 0, name, size, index = 0, backgroundColor = '#fff' } = props;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: COLORS[index % COLORS.length],
          stroke: backgroundColor,
          strokeWidth: 2,
          opacity: 0.8,
        }}
      />
      {width > 50 && height > 30 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 10}
            textAnchor="middle"
            fill={backgroundColor}
            fontSize={12}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill={backgroundColor}
            fontSize={10}
          >
            {size?.toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
}

export function AppTreemap({
  data,
  height = 400,
  onDrillDown,
}: AppTreemapProps) {
  const theme = useChartTheme();
  const currentTooltipStyles = theme.isDark ? darkTooltipStyles : tooltipStyles;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 使用 useEffect + addEventListener 配合 { passive: false } 来正确阻止滚轮默认行为
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale((prev) => Math.min(Math.max(prev * delta, 0.5), 3));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <button
          onClick={() => setScale((prev) => Math.min(prev * 1.2, 3))}
          style={{
            width: 30,
            height: 30,
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: 4,
            background: theme.colors.background,
            color: theme.colors.text,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          +
        </button>
        <button
          onClick={() => setScale((prev) => Math.max(prev * 0.8, 0.5))}
          style={{
            width: 30,
            height: 30,
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: 4,
            background: theme.colors.background,
            color: theme.colors.text,
            cursor: 'pointer',
            fontSize: 16,
          }}
        >
          -
        </button>
        <button
          onClick={handleDoubleClick}
          style={{
            width: 30,
            height: 30,
            border: `1px solid ${theme.colors.grid}`,
            borderRadius: 4,
            background: theme.colors.background,
            color: theme.colors.text,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          ↺
        </button>
      </div>

      <div
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: '0 0',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <RechartsTreemap
            data={data as unknown as Array<Record<string, unknown>>}
            dataKey="size"
            aspectRatio={4 / 3}
            content={<CustomizedContent backgroundColor={theme.colors.background} />}
            onClick={onDrillDown ? (e) => onDrillDown(e as unknown as TreeNode) : undefined}
          >
            <Tooltip
              contentStyle={currentTooltipStyles.contentStyle}
              itemStyle={currentTooltipStyles.itemStyle}
              labelStyle={currentTooltipStyles.labelStyle}
            />
          </RechartsTreemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
