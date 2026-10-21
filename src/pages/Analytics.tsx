import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, ClipboardList, Layers, TrendingDown } from 'lucide-react';
import { ChartLegend, PlanFactChart } from '../components/PlanFactChart';
import { NewOrderButton, PageHeader, PeriodSelect } from '../components/PageHeader';
import { Delta, EmptyState, Segmented, StatusBadge, cx } from '../components/ui';
import { categoryAggregates, periodBuckets, planFactSeries } from '../lib/analytics';
import { actualCost, isFinal, margin, plannedCost, plannedProfit, profitView } from '../lib/calc';
import { inPeriod, periodLabel } from '../lib/dates';
import { money, orderNo, ordersWord, pct, plural, signedMoney, signedPoints } from '../lib/format';
import { useStore } from '../lib/store';
import type { Granularity, Order } from '../lib/types';

export function Analytics() {
  const orders = useStore((s) => s.orders);
  const categories = useStore((s) => s.categories);
  const period = useStore((s) => s.ui.analyticsPeriod);
  const gran = useStore((s) => s.ui.analyticsGranularity);
  const setUi = useStore((s) => s.setUi);

  const inRange = useMemo(() => orders.filter((o) => inPeriod(o.createdAt, period)), [orders, period]);
  const finals = useMemo(() => inRange.filter(isFinal), [inRange]);
  const series = useMemo(() => planFactSeries(inRange, periodBuckets(inRange, period, gran)), [inRange, period, gran]);
  const cats = useMemo(() => categoryAggregates(inRange, categories), [inRange, categories]);

  const stats = useMemo(() => {
    const revenue = finals.reduce((a, o) => a + o.price, 0);
    const profit = finals.reduce((a, o) => a + o.price - actualCost(o), 0);
    const planProfit = finals.reduce((a, o) => a + plannedProfit(o), 0);
    const planCost = finals.reduce((a, o) => a + plannedCost(o), 0);
    const factCost = finals.reduce((a, o) => a + actualCost(o), 0);
    const margins = finals.map((o) => margin(o.price - actualCost(o), o.price)).filter((m): m is number => m !== null);
    const planMargins = finals.map((o) => margin(plannedProfit(o), o.price)).filter((m): m is number => m !== null);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    return {
      revenue,
      profit,
      planProfit,
      planCost,
      factCost,
      avgMargin: avg(margins),
      avgPlanMargin: avg(planMargins),
      inProgress: inRange.filter((o) => o.status === 'in_progress').length,
    };
  }, [finals, inRange]);

  const negatives = useMemo(
    () =>
      inRange
        .filter((o) => o.status === 'completed' || o.status === 'in_progress')
        .map((o) => ({ o, v: profitView(o) }))
        .filter(({ v }) => v.deviation !== null && v.deviation < 0)
        .sort((a, b) => (a.v.deviation ?? 0) - (b.v.deviation ?? 0))
        .slice(0, 6),
    [inRange],
  );

  const closedSorted = useMemo(
    () => [...finals].sort((a, b) => b.price - actualCost(b) - (a.price - actualCost(a))),
    [finals],
  );

  if (!orders.length) {
    return (
      <div className="page">
        <PageHeader title="Аналитика" subtitle="Результаты предприятия по завершённым заказам" />
        <div className="panel">
          <EmptyState
            icon={<BarChart3 size={22} />}
            title="Аналитика появится вместе с заказами"
            text="Создайте заказ, вносите расходы и завершайте заказы — здесь появятся прибыль по периодам, перерасход по статьям и отклонения."
            action={<NewOrderButton />}
          />
        </div>
      </div>
    );
  }

  const enoughForAvg = finals.length >= 2;
  const costDev = stats.factCost - stats.planCost;

  return (
    <div className="page">
      <PageHeader
        title="Аналитика"
        subtitle="Результаты по завершённым заказам: где зарабатываем и где теряем"
        actions={<PeriodSelect value={period} onChange={(v) => setUi({ analyticsPeriod: v })} />}
      />

      <section className="stat-strip" aria-label="Итоги периода">
        <div className="stat">
          <div className="stat__label">Закрыто заказов</div>
          <div className="stat__value num">{finals.length}</div>
          <div className="stat__caption">
            {stats.inProgress > 0 ? `ещё ${stats.inProgress} в работе` : 'нет заказов в работе'} · {periodLabel(period).toLowerCase()}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Прибыль по закрытым</div>
          <div className={cx('stat__value num', stats.profit < 0 && 'text-neg')}>{finals.length ? money(stats.profit) : '—'}</div>
          <div className="stat__caption">
            {finals.length ? (
              <>
                план {money(stats.planProfit)} · <Delta value={stats.profit - stats.planProfit} size="sm" />
              </>
            ) : (
              'нет завершённых заказов'
            )}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Средняя фактическая рентабельность</div>
          <div className="stat__value num">{enoughForAvg ? pct(stats.avgMargin) : '—'}</div>
          <div className="stat__caption">
            {enoughForAvg ? (
              <>
                плановая {pct(stats.avgPlanMargin)} ·{' '}
                <span
                  className={cx(
                    stats.avgMargin! - stats.avgPlanMargin! < -0.05 && 'text-neg',
                    stats.avgMargin! - stats.avgPlanMargin! > 0.05 && 'text-pos',
                  )}
                >
                  {signedPoints(stats.avgMargin! - stats.avgPlanMargin!)}
                </span>
              </>
            ) : (
              'нужно минимум 2 завершённых заказа'
            )}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Себестоимость к плану</div>
          <div className={cx('stat__value num', costDev > 0 && 'text-neg', costDev < 0 && 'text-pos')}>
            {finals.length ? signedMoney(costDev) : '—'}
          </div>
          <div className="stat__caption">
            {finals.length
              ? `факт ${money(stats.factCost)} при плане ${money(stats.planCost)}`
              : 'появится после завершения заказов'}
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="a-chart">
        <div className="panel__head">
          <div>
            <h2 className="panel__title" id="a-chart">
              Прибыль по периодам
            </h2>
            <p className="panel__sub">Плановая и фактическая прибыль завершённых заказов, по дате заказа</p>
          </div>
          <Segmented<Granularity>
            size="sm"
            label="Шаг графика"
            value={gran}
            onChange={(v) => setUi({ analyticsGranularity: v })}
            options={[
              { value: 'week', label: 'Неделя' },
              { value: 'month', label: 'Месяц' },
              { value: 'quarter', label: 'Квартал' },
            ]}
          />
        </div>
        {finals.length ? (
          <>
            <ChartLegend />
            <PlanFactChart data={series} height={300} />
          </>
        ) : (
          <EmptyState compact icon={<BarChart3 size={20} />} title="Нет завершённых заказов за период" text="Выберите более длинный период или завершите заказ." />
        )}
      </section>

      <div className="analytics-grid">
        <section className="panel" aria-labelledby="a-cats">
          <div className="panel__head">
            <div>
              <h2 className="panel__title" id="a-cats">
                Себестоимость по статьям
              </h2>
              <p className="panel__sub">План и факт по завершённым заказам · перерасход и экономия</p>
            </div>
          </div>
          {cats.length ? <CategoryBars cats={cats} /> : <EmptyState compact icon={<Layers size={20} />} title="Нет данных" text="Появится после завершения заказов с расходами." />}
        </section>

        <section className="panel" aria-labelledby="a-neg">
          <div className="panel__head">
            <div>
              <h2 className="panel__title" id="a-neg">
                Наибольшие отрицательные отклонения
              </h2>
              <p className="panel__sub">Прибыль ниже плана · по заказам в работе — расчётная</p>
            </div>
          </div>
          {negatives.length ? (
            <ol className="neg-list">
              {negatives.map(({ o, v }, i) => (
                <li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="neg-item">
                    <span className="neg-item__rank num">{i + 1}</span>
                    <span className="neg-item__body">
                      <span className="neg-item__title">{o.title}</span>
                      <span className="neg-item__meta">
                        {orderNo(o.number)} · {o.client} · <StatusBadge status={o.status} />
                      </span>
                    </span>
                    <span className="neg-item__nums">
                      <Delta value={v.deviation} />
                      <span className="text-faint num">
                        {v.kind === 'final' ? 'факт' : 'расчёт'} {money(v.profit ?? 0)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState compact icon={<CheckCircle2 size={20} />} title="Отрицательных отклонений нет" text="Все заказы периода идут не хуже плана." />
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="a-closed">
        <div className="panel__head">
          <div>
            <h2 className="panel__title" id="a-closed">
              Прибыль по закрытым заказам
            </h2>
            <p className="panel__sub">
              Полоса — фактическая прибыль, отметка — плановая. {finals.length} {ordersWord(finals.length)}, по убыванию прибыли
            </p>
          </div>
          <div className="legend legend--inline" aria-hidden>
            <span>
              <i className="legend__key legend__key--fact" /> Факт
            </span>
            <span>
              <i className="legend__key legend__key--tick" /> План
            </span>
          </div>
        </div>
        {closedSorted.length ? (
          <ClosedOrders orders={closedSorted} />
        ) : (
          <EmptyState compact icon={<ClipboardList size={20} />} title="Нет закрытых заказов за период" />
        )}
      </section>
    </div>
  );
}

function CategoryBars({ cats }: { cats: ReturnType<typeof categoryAggregates> }) {
  const max = Math.max(1, ...cats.flatMap((c) => [c.planned, c.actual]));
  return (
    <div className="cat-bars">
      {cats.map((c) => {
        const over = c.deviation > 0;
        const pctDev = c.planned > 0 ? (c.deviation / c.planned) * 100 : null;
        return (
          <div className="cat-bar" key={c.categoryId}>
            <div className="cat-bar__head">
              <span className="cat-bar__name">{c.name}</span>
              <span className="cat-bar__dev">
                <Delta value={c.deviation} invert size="sm" />
                {pctDev !== null && c.deviation !== 0 && (
                  <span className="text-faint num">
                    {pctDev > 0 ? '+' : ''}
                    {pct(pctDev)}
                  </span>
                )}
              </span>
            </div>
            <div className="cat-bar__tracks">
              <div className="cat-bar__track">
                <span className="cat-bar__fill cat-bar__fill--plan" style={{ width: `${(c.planned / max) * 100}%` }} />
                <span className="cat-bar__val num">{money(c.planned)}</span>
              </div>
              <div className="cat-bar__track">
                <span className={cx('cat-bar__fill', over ? 'cat-bar__fill--over' : 'cat-bar__fill--fact')} style={{ width: `${(c.actual / max) * 100}%` }} />
                <span className="cat-bar__val num">{money(c.actual)}</span>
              </div>
            </div>
            {c.overrunOrders > 0 && (
              <div className="cat-bar__note">
                <TrendingDown size={12} aria-hidden /> перерасход в {c.overrunOrders} {plural(c.overrunOrders, 'заказе', 'заказах', 'заказах')}
              </div>
            )}
          </div>
        );
      })}
      <div className="legend legend--inline cat-bars__legend" aria-hidden>
        <span>
          <i className="legend__key legend__key--plan" /> План
        </span>
        <span>
          <i className="legend__key legend__key--fact" /> Факт
        </span>
        <span>
          <i className="legend__key legend__key--neg" /> Перерасход
        </span>
      </div>
    </div>
  );
}

function ClosedOrders({ orders }: { orders: Order[] }) {
  const values = orders.flatMap((o) => [o.price - actualCost(o), plannedProfit(o)]);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = max - min;
  const pos = (v: number) => `${((v - min) / span) * 100}%`;
  return (
    <div className="closed">
      {orders.map((o) => {
        const fact = o.price - actualCost(o);
        const plan = plannedProfit(o);
        const below = fact < plan;
        const left = Math.min(fact, 0);
        const right = Math.max(fact, 0);
        return (
          <Link key={o.id} to={`/orders/${o.id}`} className="closed-row">
            <span className="closed-row__name">
              <span className="closed-row__title">{o.title}</span>
              <span className="closed-row__no">{orderNo(o.number)}</span>
            </span>
            <span className="closed-row__bar">
              <span
                className={cx('closed-row__fill', below && 'is-below')}
                style={{ left: pos(left), width: `calc(${pos(right)} - ${pos(left)})` }}
              />
              <span className="closed-row__tick" style={{ left: pos(plan) }} title={`План ${money(plan)}`} />
            </span>
            <span className="closed-row__nums">
              <b className={cx('num', fact < 0 && 'text-neg')}>{money(fact)}</b>
              <span className="text-faint num">{pct(margin(fact, o.price))}</span>
            </span>
            <span className="closed-row__delta">
              <Delta value={fact - plan} size="sm" />
            </span>
          </Link>
        );
      })}
    </div>
  );
}
