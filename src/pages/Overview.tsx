import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, ClipboardList } from 'lucide-react';
import { ChartLegend, PlanFactChart } from '../components/PlanFactChart';
import { NewOrderButton, PageHeader, PeriodSelect } from '../components/PageHeader';
import { ProfitCell } from '../components/OrderBits';
import { toast } from '../components/Toast';
import { AnimatedNumber, Delta, EmptyState, Segmented, StatusBadge, cx } from '../components/ui';
import { planFactSeries, recentBuckets, type PlanFactPoint } from '../lib/analytics';
import {
  isFinal,
  isSignificantOverrun,
  plannedProfit,
  profitView,
  topOverrun,
  totals,
} from '../lib/calc';
import { formatDate, inPeriod, periodLabel } from '../lib/dates';
import { money, orderNo, ordersWord, pct, signedMoney } from '../lib/format';
import { useStore } from '../lib/store';
import type { Granularity, Order } from '../lib/types';
import { PRESET } from '../lib/presets';

const GRAN_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
];

const GRAN_RANGE: Record<Granularity, string> = {
  week: 'по неделям',
  month: 'по месяцам',
  quarter: 'по кварталам',
};

export function Overview() {
  const orders = useStore((s) => s.orders);
  const categories = useStore((s) => s.categories);
  const period = useStore((s) => s.ui.overviewPeriod);
  const gran = useStore((s) => s.ui.overviewGranularity);
  const setUi = useStore((s) => s.setUi);
  const resetDemo = useStore((s) => s.resetDemo);

  const inRange = useMemo(() => orders.filter((o) => inPeriod(o.createdAt, period)), [orders, period]);
  const t = useMemo(() => totals(inRange), [inRange]);
  const series = useMemo(() => planFactSeries(orders, recentBuckets(orders, gran)), [orders, gran]);
  const hasChartData = series.some((p) => p.count > 0);
  const hasAnyFinal = useMemo(() => orders.some(isFinal), [orders]);

  const attention = useMemo(
    () =>
      orders
        .filter((o) => (o.status === 'in_progress' || (o.status === 'completed' && inPeriod(o.createdAt, period))) && isSignificantOverrun(o))
        .sort((a, b) => (profitView(a).deviation ?? 0) - (profitView(b).deviation ?? 0)),
    [orders, period],
  );

  const recent = useMemo(
    () => [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.number - a.number).slice(0, 6),
    [orders],
  );

  if (!orders.length) {
    return (
      <div className="page">
        <PageHeader title={PRESET.copy.overviewTitle} subtitle="Прибыль под контролем. Каждый заказ в цифрах." actions={<NewOrderButton />} />
        <div className="panel">
          <EmptyState
            icon={<ClipboardList size={22} />}
            title="Заказов пока нет"
            text="Добавьте первый заказ: укажите цену и плановые расходы — FAKT посчитает плановую прибыль, а затем сравнит её с фактическими затратами."
            action={
              <div className="row-gap">
                <NewOrderButton />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    resetDemo();
                    toast('Демо-данные загружены');
                  }}
                >
                  Загрузить демо-данные
                </button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={PRESET.copy.overviewTitle}
        subtitle="Прибыль под контролем. Каждый заказ в цифрах."
        actions={
          <>
            <PeriodSelect value={period} onChange={(v) => setUi({ overviewPeriod: v })} />
            <NewOrderButton />
          </>
        }
      />

      <section className="kpis" aria-label="Финансовые показатели">
        <article className="kpi">
          <div className="kpi__label">Выручка</div>
          <div className="kpi__value num">
            <AnimatedNumber value={t.revenue} format={money} />
          </div>
          <p className="kpi__caption">
            {t.committedCount
              ? `${t.committedCount} ${ordersWord(t.committedCount)} в работе и завершённых`
              : 'Нет заказов в работе за период'}
          </p>
        </article>

        <article className="kpi">
          <div className="kpi__label">Плановая прибыль</div>
          <div className="kpi__value num">
            <AnimatedNumber value={t.plannedProfit} format={money} />
          </div>
          <p className="kpi__caption">
            {t.plannedMargin !== null ? `Плановая рентабельность ${pct(t.plannedMargin)}` : 'Цена + плановые расходы → прибыль'}
          </p>
        </article>

        <article className="kpi kpi--featured">
          <div className="kpi__label">
            Фактическая прибыль
            <span className="kpi__tag">итог</span>
          </div>
          {t.finalCount > 0 ? (
            <>
              <div className={cx('kpi__value num', t.finalProfit < 0 && 'is-neg')}>
                <AnimatedNumber value={t.finalProfit} format={money} />
              </div>
              <p className="kpi__caption">
                По {t.finalCount} {t.finalCount === 1 ? 'завершённому заказу' : 'завершённым заказам'} · рентабельность{' '}
                {pct(t.finalMargin)}
              </p>
            </>
          ) : (
            <>
              <div className="kpi__value kpi__value--empty">Нет данных</div>
              <p className="kpi__caption">За период нет завершённых заказов с подтверждёнными расходами</p>
            </>
          )}
          {t.inProgressCount > 0 && (
            <div className="kpi__extra">
              <span>
                Ещё в работе: {t.inProgressCount} {ordersWord(t.inProgressCount)}
              </span>
              <span className="num">≈ {money(t.forecastProfit)}</span>
            </div>
          )}
        </article>

        <article className="kpi">
          <div className="kpi__label">Отклонение от плана</div>
          {t.finalCount > 0 ? (
            <>
              <div
                className={cx(
                  'kpi__value num',
                  t.finalDeviation < 0 && 'text-neg',
                  t.finalDeviation > 0 && 'text-pos',
                )}
              >
                <AnimatedNumber value={t.finalDeviation} format={signedMoney} />
              </div>
              <p className="kpi__caption">
                Факт против плана по {t.finalCount} {t.finalCount === 1 ? 'завершённому' : 'завершённым'}: план{' '}
                {money(t.finalPlannedProfit)}
              </p>
            </>
          ) : (
            <>
              <div className="kpi__value kpi__value--empty">—</div>
              <p className="kpi__caption">Появится, когда в периоде будут завершённые заказы</p>
            </>
          )}
        </article>
      </section>

      <div className="overview-grid">
        <section className="panel chart-panel" aria-labelledby="chart-title">
          <div className="panel__head">
            <div>
              <h2 className="panel__title" id="chart-title">
                План и факт
              </h2>
              <p className="panel__sub">Прибыль завершённых заказов {GRAN_RANGE[gran]}, по дате заказа</p>
            </div>
            <Segmented
              size="sm"
              label="Шаг графика"
              value={gran}
              onChange={(v) => setUi({ overviewGranularity: v })}
              options={GRAN_OPTIONS}
            />
          </div>
          {hasChartData ? (
            <>
              <ChartLegend />
              <PlanFactChart data={series} />
              <ChartSummary series={series} />
            </>
          ) : (
            <EmptyState
              compact
              icon={<BarChart3 size={20} />}
              title={hasAnyFinal ? 'В этом диапазоне нет завершённых заказов' : 'Пока недостаточно данных'}
              text={
                hasAnyFinal
                  ? 'Выберите более крупный шаг графика — месяц или квартал.'
                  : 'График появится, когда хотя бы один заказ будет завершён с подтверждёнными расходами.'
              }
            />
          )}
        </section>

        <section className="panel attention" aria-labelledby="att-title">
          <div className="panel__head">
            <div>
              <h2 className="panel__title" id="att-title">
                Требует внимания
                {attention.length > 0 && <span className="count-pill count-pill--neg">{attention.length}</span>}
              </h2>
              <p className="panel__sub">Прибыль ниже плана более чем на 3 % от цены</p>
            </div>
          </div>
          {attention.length ? (
            <ul className="attention__list">
              {attention.slice(0, 3).map((o) => (
                <AttentionItem key={o.id} order={o} reasonFallback={topOverrun(o, categories)} />
              ))}
            </ul>
          ) : (
            <EmptyState
              compact
              icon={<CheckCircle2 size={20} />}
              title="Существенных отклонений нет"
              text="Заказы в работе и завершённые за период идут в рамках плана."
            />
          )}
          {attention.length > 3 && (
            <Link to="/analytics" className="panel__more">
              Ещё {attention.length - 3} — в аналитике <ArrowRight size={14} />
            </Link>
          )}
        </section>
      </div>

      <section className="panel" aria-labelledby="recent-title">
        <div className="panel__head">
          <div>
            <h2 className="panel__title" id="recent-title">
              Последние заказы
            </h2>
            <p className="panel__sub">
              Всего {orders.length} {ordersWord(orders.length)} · период показателей: {periodLabel(period).toLowerCase()}
            </p>
          </div>
          <Link to="/orders" className="btn btn-ghost btn-sm">
            Все заказы <ArrowRight size={14} />
          </Link>
        </div>
        <RecentTable orders={recent} />
      </section>
    </div>
  );
}

function ChartSummary({ series }: { series: PlanFactPoint[] }) {
  const plan = series.reduce((a, p) => a + p.plan, 0) * 100;
  const fact = series.reduce((a, p) => a + p.fact, 0) * 100;
  const count = series.reduce((a, p) => a + p.count, 0);
  return (
    <dl className="chart-summary">
      <div>
        <dt>Плановая прибыль</dt>
        <dd className="num">{money(plan)}</dd>
      </div>
      <div>
        <dt>Фактическая прибыль</dt>
        <dd className="num">{money(fact)}</dd>
      </div>
      <div>
        <dt>Разница</dt>
        <dd>
          <Delta value={fact - plan} />
        </dd>
      </div>
      <div>
        <dt>Завершено</dt>
        <dd className="num">
          {count} {ordersWord(count)}
        </dd>
      </div>
    </dl>
  );
}

function AttentionItem({ order, reasonFallback }: { order: Order; reasonFallback: ReturnType<typeof topOverrun> }) {
  const v = profitView(order);
  const final = isFinal(order);
  return (
    <li>
      <Link to={`/orders/${order.id}`} className="att-item">
        <div className="att-item__top">
          <span className="att-item__no">{orderNo(order.number)}</span>
          <StatusBadge status={order.status} />
          <Delta value={v.deviation} className="att-item__delta" />
        </div>
        <div className="att-item__title">{order.title}</div>
        <div className="att-item__nums">
          <span>
            План <b className="num">{money(plannedProfit(order))}</b>
          </span>
          <ArrowRight size={12} aria-hidden className="text-faint" />
          <span>
            {final ? 'Факт' : 'Расчёт'} <b className={cx('num', (v.profit ?? 0) < 0 && 'text-neg')}>{money(v.profit ?? 0)}</b>
          </span>
        </div>
        <div className="att-item__reason">
          <AlertTriangle size={13} aria-hidden />
          {order.deviationNote ? (
            <span>{order.deviationNote}</span>
          ) : reasonFallback ? (
            <span className="text-muted">
              Причина не записана · перерасход: {reasonFallback.name.toLowerCase()} {signedMoney(reasonFallback.deviation)}
            </span>
          ) : (
            <span className="text-muted">Причина не записана</span>
          )}
        </div>
      </Link>
    </li>
  );
}

function RecentTable({ orders }: { orders: Order[] }) {
  const navigate = useNavigate();
  return (
    <div className="table-wrap">
      <table className="table table--cards">
        <thead>
          <tr>
            <th>Заказ</th>
            <th>Клиент</th>
            <th>Дата</th>
            <th className="ta-r">Цена заказа</th>
            <th className="ta-r">Плановая прибыль</th>
            <th className="ta-r">Факт / расчёт</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr
              key={o.id}
              className="is-clickable"
              onClick={() => navigate(`/orders/${o.id}`)}
            >
              <td className="cell-main">
                <Link to={`/orders/${o.id}`} className="order-link" onClick={(e) => e.stopPropagation()}>
                  <span className="order-link__title">{o.title}</span>
                  <span className="order-link__no">{orderNo(o.number)}</span>
                </Link>
              </td>
              <td data-label="Клиент" className="cell-client">{o.client}</td>
              <td data-label="Дата" className="nowrap text-muted">{formatDate(o.createdAt, { short: true })}</td>
              <td data-label="Цена" className="ta-r num">{money(o.price)}</td>
              <td data-label="План. прибыль" className="ta-r num">
                <span className={cx(plannedProfit(o) < 0 && 'text-neg')}>{money(plannedProfit(o))}</span>
              </td>
              <td data-label="Факт / расчёт" className="ta-r">
                <ProfitCell order={o} />
              </td>
              <td data-label="Статус" className="cell-status">
                <StatusBadge status={o.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
