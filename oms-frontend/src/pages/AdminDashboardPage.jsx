import { Link } from "react-router-dom";
import { Spin } from "antd";
import { toast } from "sonner";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { useUpdateOrderStatus } from "../hooks/useOrders";

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FLOW = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const STATUS_STYLES = {
  PENDING: {
    dot: "#f59e0b",
    bg: "bg-amber-50/50",
    text: "text-amber-700",
    border: "border-amber-100",
  },
  CONFIRMED: {
    dot: "var(--color-primary)",
    bg: "bg-blue-50/50",
    text: "text-blue-700",
    border: "border-blue-100",
  },
  SHIPPED: {
    dot: "#8b5cf6",
    bg: "bg-violet-50/50",
    text: "text-violet-700",
    border: "border-violet-100",
  },
  DELIVERED: {
    dot: "#10b981",
    bg: "bg-emerald-50/50",
    text: "text-emerald-700",
    border: "border-emerald-100",
  },
  CANCELLED: {
    dot: "#ef4444",
    bg: "bg-rose-50/50",
    text: "text-rose-700",
    border: "border-rose-100",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || ""}${image}`;
};

const fmt = (v) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(Number(v || 0)),
  );

const fmtCompact = (v) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(v || 0));

const fmtDate = (v) =>
  new Date(v).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

// ─── Shared UI atoms ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const s = STATUS_STYLES[status] || {
    bg: "bg-slate-50",
    text: "text-slate-600",
    border: "border-slate-100",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-tight ${s.bg} ${s.text} ${s.border}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: s.dot }}
      />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const ProductThumb = ({ image, name }) =>
  image ? (
    <img
      src={getImageUrl(image)}
      alt={name}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[#f0f2f5]">
      <span className="material-symbols-outlined text-[20px] text-slate-300">
        inventory_2
      </span>
    </div>
  );

// ─── KPI Card ────────────────────────────────────────────────────────────────

const KpiCard = ({ title, value, icon, iconBg, iconColor }) => (
  <div className="group relative overflow-hidden rounded-4xl border border-black/5 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
    <div className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8] truncate">
          {title}
        </p>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5 ${iconBg} ${iconColor}`}
        >
          <span className="material-symbols-outlined text-[16px]">{icon}</span>
        </div>
      </div>
      <div>
        <p className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate">
          {value}
        </p>
      </div>
    </div>
  </div>
);

// ─── Sales Trend Chart ────────────────────────────────────────────────────────

const SalesTrendChart = ({ data }) => {
  if (!data?.length) return null;

  const W = 760,
    H = 220;
  const pad = { t: 20, r: 20, b: 35, l: 20 };
  const pw = W - pad.l - pad.r;
  const ph = H - pad.t - pad.b;

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const maxOrd = Math.max(...data.map((d) => d.orders), 1);

  const gx = (i) => pad.l + (i * pw) / Math.max(data.length - 1, 1);
  const gy = (v, mx) => pad.t + ph - (v / mx) * ph;

  const linePath = (key, mx) =>
    data
      .map((p, i) => `${i === 0 ? "M" : "L"}${gx(i)},${gy(p[key], mx)}`)
      .join(" ");

  const revPath = linePath("revenue", maxRev);
  const ordPath = linePath("orders", maxOrd);
  const areaPath = `${revPath} L${gx(data.length - 1)},${pad.t + ph} L${gx(0)},${pad.t + ph} Z`;

  return (
    <div className="rounded-4xl border border-black/5 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <p className="text-[10px] font-extrabold text-[#94a3b8] tracking-[0.2em] uppercase">
            Performance
          </p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
            Sales Activity
          </h2>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-blue-50/50 border border-blue-100/50 px-3 py-1.5 text-[10px] font-bold text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[#063ebb] shadow-[0_0_8px_rgba(6,62,187,0.4)]" />
            Revenue
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50/50 border border-emerald-100/50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            Orders
          </span>
        </div>
      </div>
      <div className="overflow-x-auto overflow-y-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="min-w-150 w-full"
          role="img"
          aria-label="Sales trend chart"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#063ebb" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#063ebb" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <line
              key={i}
              x1={pad.l}
              y1={pad.t + ph * t}
              x2={W - pad.r}
              y2={pad.t + ph * t}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
          ))}
          <path d={areaPath} fill="url(#areaGrad)" />
          <path
            d={revPath}
            fill="none"
            stroke="#063ebb"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={ordPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.8"
          />
          {data.map((p, i) => {
            if (i % 5 !== 0 && i !== data.length - 1) return null;
            return (
              <text
                key={p.date}
                x={gx(i)}
                y={H - 5}
                textAnchor="middle"
                className="font-bold"
                style={{
                  fontSize: 9,
                  fill: "#94a3b8",
                  letterSpacing: "0.05em",
                }}
              >
                {p.date.toUpperCase()}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ─── Status Donut ─────────────────────────────────────────────────────────────

const StatusDonut = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const segments = data.filter((d) => d.value > 0);
  const gradient = segments
    .reduce(
      (acc, item) => {
        const start = total ? (acc.v / total) * 360 : 0;
        const nv = acc.v + item.value;
        const end = total ? (nv / total) * 360 : 0;
        return {
          v: nv,
          parts: [...acc.parts, `${item.color} ${start}deg ${end}deg`],
        };
      },
      { v: 0, parts: [] },
    )
    .parts.join(", ");

  return (
    <div className="rounded-4xl border border-black/5 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex flex-col transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <p className="text-[10px] font-extrabold text-[#94a3b8] tracking-[0.2em] uppercase">
        Fulfillment
      </p>
      <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
        Order status split
      </h2>

      <div className="flex-1 flex flex-col items-center justify-center py-6">
        <div
          className="relative flex h-40 w-40 items-center justify-center rounded-full shadow-lg"
          style={{
            background: gradient || "conic-gradient(#f1f5f9 0deg 360deg)",
          }}
        >
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] text-center">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Total
            </p>
            <p className="text-3xl font-black text-slate-900 leading-none my-1">
              {total}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              orders
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {data.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-2.5 transition-colors hover:bg-white hover:border-blue-100 group"
          >
            <span
              className="h-2 w-2 rounded-full shrink-0 ring-4 ring-white shadow-sm ring-inset"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex-1 group-hover:text-slate-900">
              {item.name}
            </span>
            <div className="text-right">
              <p className="text-xs font-black text-slate-900 leading-none">
                {item.value}
              </p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                {total ? Math.round((item.value / total) * 100) : 0}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Recent Orders ────────────────────────────────────────────────────────────

const RecentOrders = ({ orders, onAdvance, isUpdating }) => (
  <div className="rounded-4xl border border-black/5 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
    <div className="flex items-center justify-between mb-5">
      <div>
        <p className="text-[10px] font-extrabold text-[#94a3b8] tracking-[0.2em] uppercase">
          Live Feed
        </p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
          Recent orders
        </h2>
      </div>
      <Link
        to="/admin/orders"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-[10px] font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700 hover:bg-white transition-all"
      >
        View all
        <span className="material-symbols-outlined text-[14px]">
          arrow_forward
        </span>
      </Link>
    </div>

    <div className="space-y-2.5">
      {orders?.length ? (
        orders.map((order) => {
          const next = STATUS_FLOW[order.status];
          return (
            <div
              key={order.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-white hover:border-blue-100"
            >
              {/* Images strip */}
              <div className="flex gap-1 shrink-0">
                {order.items?.slice(0, 2).map((item, idx) => (
                  <div
                    key={idx}
                    className="h-11 w-11 overflow-hidden rounded-xl border border-white bg-white shadow-soft ring-2 ring-slate-100"
                  >
                    <ProductThumb
                      image={item.product?.image}
                      name={item.product?.name}
                    />
                  </div>
                ))}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={order.status} />
                  <span className="font-mono text-[9px] text-slate-400 hidden sm:inline">
                    #{order.id.slice(0, 8)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-black text-slate-900 truncate">
                  {order.user?.name || "Customer"}
                </p>
                <p className="text-[10px] text-slate-400 hidden sm:block">
                  {fmtDate(order.createdAt)}
                </p>
              </div>

              {/* Amount + action */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">
                    ₹{fmt(order.totalAmount)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {order.items?.length || 0} items
                  </p>
                </div>
                {next ? (
                  <button
                    onClick={() => onAdvance(order)}
                    disabled={isUpdating}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#063ebb] text-white shadow-md shadow-blue-200/60 transition-all hover:scale-105 active:scale-90 disabled:opacity-50"
                    title={`Mark as ${next}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      chevron_right
                    </span>
                  </button>
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-500">
                    <span className="material-symbols-outlined text-[16px]">
                      check
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <EmptyState
          icon="receipt_long"
          title="No orders yet"
          sub="New orders will appear here."
        />
      )}
    </div>
  </div>
);

// ─── Top Products ─────────────────────────────────────────────────────────────

const TopProducts = ({ products }) => (
  <div className="rounded-4xl border border-black/5 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-full flex flex-col transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
    <p className="text-[10px] font-extrabold text-[#94a3b8] tracking-[0.2em] uppercase">
      Bestsellers
    </p>
    <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900 mb-6">
      Top products
    </h2>

    <div className="space-y-3 flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-100">
      {products?.length ? (
        products.map((product, idx) => (
          <div
            key={product.id}
            className="flex items-center gap-4 rounded-3xl border border-slate-100 bg-slate-50/50 p-3 transition-all hover:bg-white hover:border-blue-100 group"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white group-hover:bg-[#063ebb] transition-colors">
              {idx + 1}
            </span>
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white border border-white shadow-md ring-2 ring-slate-100">
              <ProductThumb image={product.image} name={product.name} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900 tracking-tight">
                {product.name}
              </p>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tight">
                {product.quantity} units sold
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-slate-900">
                ₹{fmtCompact(product.revenue)}
              </p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                REVENUE
              </p>
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          icon="bar_chart"
          title="No sales yet"
          sub="Bestsellers appear after the first orders."
        />
      )}
    </div>
  </div>
);

// ─── Low Stock ────────────────────────────────────────────────────────────────

const LowStockPanel = ({ products }) => (
  <div className="rounded-4xl border border-black/5 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="text-[10px] font-extrabold text-[#94a3b8] tracking-[0.2em] uppercase">
          Inventory Risk
        </p>
        <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
          Low stock alerts
        </h2>
      </div>
      <Link
        to="/products"
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/50 px-4 py-2 text-[10px] font-bold text-slate-600 hover:border-blue-200 hover:text-blue-700 hover:bg-white transition-all"
      >
        <span className="material-symbols-outlined text-[14px]">
          inventory_2
        </span>
        Stock Management
      </Link>
    </div>

    {products?.length ? (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {products.map((product) => {
          const isUrgent = product.stock <= 3;
          return (
            <div
              key={product.id}
              className={`group flex items-center gap-4 rounded-3xl border p-4 transition-all hover:bg-white ${
                isUrgent
                  ? "border-rose-100 bg-rose-50/30 hover:border-rose-200"
                  : "border-amber-100 bg-amber-50/30 hover:border-amber-200"
              }`}
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white border border-white shadow-soft ring-4 ring-white">
                <ProductThumb image={product.image} name={product.name} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900 tracking-tight">
                  {product.name}
                </p>
                <p
                  className={`mt-1 text-xs font-black uppercase tracking-tighter ${isUrgent ? "text-rose-600" : "text-amber-600"}`}
                >
                  {isUrgent ? "CRITICAL: " : ""}ONLY {product.stock} LEFT
                </p>
                {/* mini stock bar */}
                <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isUrgent ? "bg-rose-500 shadow-sm shadow-rose-200" : "bg-amber-400 shadow-sm shadow-amber-200"}`}
                    style={{
                      width: `${Math.min((product.stock / 20) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
              <Link
                to="/products"
                className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-[10px] font-black text-white hover:bg-[#063ebb] transition-all transform hover:translate-x-1"
              >
                RESTOCK
              </Link>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="rounded-3xl border border-dashed border-emerald-100 bg-emerald-50/20 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto mb-4">
          <span className="material-symbols-outlined text-[24px]">
            check_circle
          </span>
        </div>
        <p className="text-sm font-black text-slate-900 tracking-tight uppercase">
          Inventory looks healthy
        </p>
        <p className="text-[10px] font-bold text-slate-400 mt-1">
          No products at low stock threshold.
        </p>
      </div>
    )}
  </div>
);

// ─── Hero Banner ──────────────────────────────────────────────────────────────

const HeroBanner = ({ stats, refetch, isFetching }) => (
  <div className="relative overflow-hidden rounded-4xl bg-linear-to-br from-slate-50 to-white px-6 py-10 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sm:px-12 sm:py-14 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
    {/* Background blobs softened for light theme */}
    <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#063ebb] opacity-5 blur-[80px]" />
    <div className="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-emerald-500 opacity-5 blur-[60px]" />

    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      {/* Left: greeting */}
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-6 rounded-full bg-[#063ebb]" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
            Control Center
          </p>
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-slate-900 sm:text-5xl lg:text-6xl">
          Hey,{" "}
          <span className="text-slate-500 font-medium whitespace-nowrap">
            {stats?.managerName || "Admin"} 👋
          </span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-slate-500 leading-relaxed max-w-md">
          Everything's running smoothly. We processed{" "}
          <strong className="text-slate-900 font-extrabold">
            {fmtCompact(stats?.totalOrders)}
          </strong>{" "}
          orders so far.
        </p>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-8 group inline-flex items-center gap-2.5 rounded-full bg-slate-900 px-7 py-3.5 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#063ebb] active:scale-95 disabled:opacity-50 shadow-md hover:shadow-xl hover:shadow-blue-500/20"
        >
          <span
            className={`material-symbols-outlined text-[18px] ${isFetching ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`}
          >
            sync
          </span>
          {isFetching ? "Syncing..." : "Sync Data"}
        </button>
      </div>

      {/* Right: quick-stat tiles (Redesigned for Light Theme) */}
      <div className="grid grid-cols-2 gap-3 lg:w-80 lg:shrink-0 mt-4 lg:mt-0">
        {[
          {
            label: "30D REVENUE",
            value: `₹${fmtCompact(stats?.revenueLast30Days)}`,
            icon: "payments",
            color: "text-[#063ebb]",
            bg: "bg-blue-50",
          },
          {
            label: "BUYERS",
            value: fmtCompact(stats?.activeCustomers),
            icon: "group",
            color: "text-emerald-500",
            bg: "bg-emerald-50",
          },
          {
            label: "DELIVERED",
            value: fmtCompact(stats?.deliveredOrders),
            icon: "local_shipping",
            color: "text-indigo-500",
            bg: "bg-indigo-50",
          },
          {
            label: "LOW STOCK",
            value: fmtCompact(stats?.lowStockCount),
            icon: "inventory_2",
            color: "text-rose-500",
            bg: "bg-rose-50",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="group flex flex-col justify-center rounded-3xl border border-black/5 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-black/10"
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ${s.bg} ${s.color}`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {s.icon}
              </span>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">
              {s.label}
            </p>
            <p className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
              {s.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ icon, title, sub }) => (
  <div className="rounded-2xl border border-dashed border-[#e0e0e8] bg-[#f9f9fb] px-6 py-12 text-center">
    <span className="material-symbols-outlined text-3xl text-slate-300">
      {icon}
    </span>
    <p className="mt-2 text-sm font-semibold text-slate-700">{title}</p>
    <p className="text-xs text-slate-400 mt-1">{sub}</p>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminDashboardPage = () => {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDashboardStats();
  const { mutate: updateStatus, isPending: isUpdatingStatus } =
    useUpdateOrderStatus();

  const handleAdvanceStatus = (order) => {
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    updateStatus(
      { id: order.id, status: next },
      {
        onSuccess: () => {
          toast.success(`Order moved to ${next}`);
          refetch();
        },
        onError: (e) =>
          toast.error(e?.response?.data?.message || "Failed to update order"),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spin size="large" />
          <p className="text-sm text-slate-400">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8">
          <span className="material-symbols-outlined text-3xl text-rose-400">
            error
          </span>
          <h1 className="mt-3 text-xl font-bold text-slate-900">
            Dashboard failed to load
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {error?.response?.data?.message ||
              error?.message ||
              "An unexpected error occurred."}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-5 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: "Revenue",
      value: `₹${fmt(stats?.totalRevenue)}`,
      icon: "payments",
      iconBg: "bg-blue-50",
      iconColor: "text-[#005cba]",
    },
    {
      title: "Orders",
      value: fmtCompact(stats?.totalOrders),
      icon: "shopping_bag",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      title: "Pending",
      value: fmtCompact(stats?.pendingOrders),
      icon: "hourglass_top",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
    {
      title: "Avg Value",
      value: `₹${fmt(stats?.avgOrderValue)}`,
      icon: "trending_up",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
    },
    {
      title: "Customers",
      value: fmtCompact(stats?.activeCustomers),
      icon: "group",
      iconBg: "bg-pink-50",
      iconColor: "text-pink-600",
    },
    {
      title: "Cancelled",
      value: fmtCompact(stats?.cancelledOrders),
      icon: "cancel",
      iconBg: "bg-rose-50",
      iconColor: "text-rose-500",
    },
    {
      title: "Delivered",
      value: fmtCompact(stats?.deliveredOrders),
      icon: "local_shipping",
      iconBg: "bg-teal-50",
      iconColor: "text-teal-600",
    },
  ];

  return (
    <div className="space-y-4 py-4 sm:space-y-5 sm:py-5">
      {/* ── Hero ─────────────────────────────────────── */}
      <HeroBanner stats={stats} refetch={refetch} isFetching={isFetching} />

      {/* ── KPI strip (scrollable on mobile) ─────────── */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 lg:grid-cols-7 [&::-webkit-scrollbar]:h-0">
          {kpis.map((k) => (
            <div key={k.title} className="min-w-36 sm:min-w-0">
              <KpiCard {...k} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Sales Chart + Status Donut ───────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SalesTrendChart data={stats?.salesTrend || []} />
        </div>
        <div className="lg:col-span-4">
          <StatusDonut data={stats?.statusData || []} />
        </div>
      </div>

      {/* ── Recent Orders + Top Products ─────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <RecentOrders
            orders={stats?.recentOrders}
            onAdvance={handleAdvanceStatus}
            isUpdating={isUpdatingStatus}
          />
        </div>
        <div className="lg:col-span-5">
          <TopProducts products={stats?.topProducts} />
        </div>
      </div>

      {/* ── Low Stock ────────────────────────────────── */}
      <LowStockPanel products={stats?.lowStock} />

      {/* ── Footer status bar ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-4xl border border-black/5 bg-white px-6 py-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${isFetching ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
          />
          <p className="text-xs font-medium text-slate-500">
            {isFetching ? "Refreshing…" : "Live data · orders & inventory"}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-600 hover:border-[#063ebb] hover:text-[#063ebb] transition-colors disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[14px]">refresh</span>
          Refresh
        </button>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
