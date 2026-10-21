import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { PlanFactPoint } from '../lib/analytics';
import { compactRub, money, ordersWord, signedMoney } from '../lib/format';
import { cx } from './ui';

const C = {
  plan: '#CAD2EA',
  fact: '#2F4FF0',
  neg: '#D14A3E',
  grid: '#EDEFE7',
  tick: '#8C9389',
};

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as PlanFactPoint;
  const diff = (p.fact - p.plan) * 100;
  return (
    <div className="chart-tip">
      <div className="chart-tip__title">{p.fullLabel}</div>
      {p.count === 0 ? (
        <div className="chart-tip__empty">Нет завершённых заказов</div>
      ) : (
        <>
          <div className="chart-tip__row">
            <span className="chart-tip__key chart-tip__key--plan" />
            План
            <b className="num">{money(p.plan * 100)}</b>
          </div>
          <div className="chart-tip__row">
            <span className="chart-tip__key chart-tip__key--fact" />
            Факт
            <b className="num">{money(p.fact * 100)}</b>
          </div>
          <div className={cx('chart-tip__diff', diff < 0 ? 'text-neg' : 'text-pos')}>
            {signedMoney(diff)} к плану · {p.count} {ordersWord(p.count)}
          </div>
        </>
      )}
    </div>
  );
}

export function ChartLegend() {
  return (
    <div className="legend" aria-hidden>
      <span>
        <i className="legend__key legend__key--plan" /> План
      </span>
      <span>
        <i className="legend__key legend__key--fact" /> Факт
      </span>
      <span>
        <i className="legend__key legend__key--neg" /> Факт ниже плана
      </span>
    </div>
  );
}

export function PlanFactChart({ data, height = 280 }: { data: PlanFactPoint[]; height?: number }) {
  const hasNegative = data.some((d) => d.fact < 0 || d.plan < 0);
  const many = data.length > 10;
  const animate = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="chart" style={{ height }} role="img" aria-label="Сравнение плановой и фактической прибыли по периодам">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={3} barCategoryGap={many ? '22%' : '30%'}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: C.tick, fontSize: 12 }}
            dy={6}
            interval={many ? 'preserveStartEnd' : 0}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: C.tick, fontSize: 12 }}
            tickFormatter={(v: number) => compactRub(v)}
            width={64}
          />
          {hasNegative && <ReferenceLine y={0} stroke="#C9CDC2" />}
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(32,37,31,0.04)' }} isAnimationActive={false} />
          <Bar dataKey="plan" name="План" fill={C.plan} radius={[3, 3, 0, 0]} maxBarSize={26} animationDuration={400} isAnimationActive={animate} />
          <Bar dataKey="fact" name="Факт" radius={[3, 3, 0, 0]} maxBarSize={26} animationDuration={400} isAnimationActive={animate}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.fact < d.plan ? C.neg : C.fact} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
