import { useState, useCallback, useRef, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { tooltipStyles, darkTooltipStyles } from './tooltipStyles';

interface SunburstNode {
  name: string;
  size: number;
  children?: SunburstNode[];
}

interface AppSunburstProps {
  data: SunburstNode[];
  height?: number;
  centerContent?: React.ReactNode;
}

const COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

function flattenData(data: SunburstNode[], level = 0): Array<{ name: string; value: number; level: number }> {
  const result: Array<{ name: string; value: number; level: number }> = [];

  for (const node of data) {
    if (node.children && node.children.length > 0) {
      // 递归处理子节点，不添加父节点（避免数据重复计算）
      result.push(...flattenData(node.children, level + 1));
    } else {
      // 只添加叶子节点
      result.push({ name: node.name, value: node.size, level });
    }
  }

  return result;
}

export function AppSunburst({
  data,
  height = 400,
  centerContent,
}: AppSunburstProps) {
  const theme = useChartTheme();
  const currentTooltipStyles = theme.isDark ? darkTooltipStyles : tooltipStyles;
  const containerRef = useRef<HTMLDivElement>(null);
  const flatData = flattenData(data);
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
          transformOrigin: '50% 50%',
          transition: isDragging ? 'none' : 'transform 0.2s ease',
        }}
      >
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={flatData}
              cx="50%"
              cy="50%"
              innerRadius={20}
              outerRadius={80}
              paddingAngle={1}
              dataKey="value"
            >
              {flatData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[entry.level % COLORS.length]}
                  stroke={theme.colors.background}
                  strokeWidth={1}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={currentTooltipStyles.contentStyle}
              itemStyle={currentTooltipStyles.itemStyle}
              labelStyle={currentTooltipStyles.labelStyle}
            />
            {centerContent && (
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="central"
                fill={theme.colors.text}
                fontSize={theme.fontSize.large}
              >
                {centerContent}
              </text>
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
