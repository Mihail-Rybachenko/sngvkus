import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Box } from '@mui/material';
import { COLORS } from '@/utils/constants';
import type { MicroElement } from '@/types';

interface MicroElementChartProps {
  elements: MicroElement[];
}

export const MicroElementChart: React.FC<MicroElementChartProps> = ({
  elements,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || elements.length === 0) return;

    // Очистка предыдущего графика
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Масштабирование
    const xScale = d3
      .scaleBand()
      .domain(elements.map((d) => d.name))
      .range([0, width])
      .padding(0.2);

    const maxValue = d3.max(elements, (d) => Math.max(d.value, d.norm)) || 0;
    const yScale = d3.scaleLinear().domain([0, maxValue * 1.2]).range([height, 0]);

    // Оси
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '12px');

    g.append('g')
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('fill', '#000')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -height / 2)
      .attr('text-anchor', 'middle')
      .text('Значение');

    // Подсветка дефицитных элементов
    elements.forEach((element, i) => {
      if (element.deficiency) {
        g.append('rect')
          .attr('x', xScale(element.name))
          .attr('y', 0)
          .attr('width', xScale.bandwidth())
          .attr('height', height)
          .attr('fill', '#ffebee')
          .attr('opacity', 0.3);
      }
    });

    // Столбцы для значений
    g.selectAll('.bar-value')
      .data(elements)
      .enter()
      .append('rect')
      .attr('class', 'bar-value')
      .attr('x', (d) => xScale(d.name) || 0)
      .attr('y', (d) => yScale(d.value))
      .attr('width', xScale.bandwidth() / 2 - 2)
      .attr('height', (d) => height - yScale(d.value))
      .attr('fill', COLORS.secondary)
      .attr('rx', 2);

    // Столбцы для норм
    g.selectAll('.bar-norm')
      .data(elements)
      .enter()
      .append('rect')
      .attr('class', 'bar-norm')
      .attr('x', (d) => (xScale(d.name) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.norm))
      .attr('width', xScale.bandwidth() / 2 - 2)
      .attr('height', (d) => height - yScale(d.norm))
      .attr('fill', COLORS.primary)
      .attr('rx', 2);

    // Линия нормы
    elements.forEach((element) => {
      if (element.deficiency) {
        g.append('line')
          .attr('x1', xScale(element.name) || 0)
          .attr('x2', (xScale(element.name) || 0) + xScale.bandwidth())
          .attr('y1', yScale(element.norm))
          .attr('y2', yScale(element.norm))
          .attr('stroke', COLORS.error)
          .attr('stroke-width', 2)
          .attr('stroke-dasharray', '5,5');
      }
    });

    // Легенда
    const legend = g
      .append('g')
      .attr('transform', `translate(${width - 150}, 10)`);

    const legendData = [
      { label: 'Значение', color: COLORS.secondary },
      { label: 'Норма', color: COLORS.primary },
      { label: 'Дефицит', color: COLORS.error },
    ];

    legendData.forEach((item, i) => {
      const legendRow = legend
        .append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow
        .append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color)
        .attr('rx', 2);

      legendRow
        .append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '12px')
        .text(item.label);
    });

    // Заголовок
    svg
      .append('text')
      .attr('x', width / 2 + margin.left)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Сравнение значений микроэлементов с нормой');
  }, [elements]);

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg ref={svgRef} width={800} height={400}></svg>
    </Box>
  );
};

