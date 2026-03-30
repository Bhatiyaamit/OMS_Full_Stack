import { useNavigate } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import { Spin } from "antd";

const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
};

/* ── Tag Badge ── */
const TagBadge = ({ label, icon, color = "slate" }) => {
  const colorMap = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    rose: "bg-rose-100 text-rose-700",
    slate: "bg-slate-100 text-slate-600",
    lime: "bg-lime-300 text-slate-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colorMap[color]}`}
    >
      {icon && (
        <span
          className="material-symbols-outlined text-[12px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      )}
      {label}
    </span>
  );
};

/* ── Stock label ── */
const StockLabel = ({ stock }) => {
  if (stock === 0)
    return <TagBadge label="Out of Stock" icon="block" color="rose" />;
  if (stock < 10)
    return (
      <TagBadge label={`Only ${stock} left`} icon="warning" color="amber" />
    );
  return <TagBadge label="In Stock" icon="check_circle" color="green" />;
};

/* ── Product Image ── */
const ProductImg = ({ image, name, className = "" }) =>
  image ? (
    <img
      src={getImageUrl(image)}
      alt={name}
      className={`w-full h-full object-cover ${className}`}
    />
  ) : (
    <div
      className={`w-full h-full bg-slate-100 flex items-center justify-center ${className}`}
    >
      <span className="material-symbols-outlined text-slate-300 text-4xl">
        image
      </span>
    </div>
  );

/* ══════════════════════════════════════════════════════════
 *  PUBLIC DASHBOARD — no auth, pure product showcase
 * ══════════════════════════════════════════════════════════ */
const DashboardPage = () => {
  const navigate = useNavigate();
  const { data: productsData, isLoading } = useProducts();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const products = productsData?.data || [];

  // Slot products into named positions
  const hero = products[0];
  const card2 = products[1];
  const card3 = products[2];
  const card4 = products[3];
  const card5 = products[4];
  const card6 = products[5];
  const trending = products[6] || products[0];
  const limitedDeal = products[7] || products[1];
  const spotlight = products[8] || products[2];
  const moreCards = products.slice(0, 4);

  return (
    <div className="w-full max-w-[1800px] mx-auto bg-[#F0EEE6] rounded-[2.5rem] p-6 xl:p-8 shadow-2xl mt-4 border border-white/60 font-sans">
      {/* ══ TOP NAV BAR ══ */}
      <div className="flex items-center justify-between mb-8 px-2">
        {/* Brand pill */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-lg">
              storefront
            </span>
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
              ShopNest
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Premium Store
            </p>
          </div>
        </div>

        {/* Quick nav pills */}
        <div className="hidden md:flex items-center gap-2">
          {["New Arrivals", "Best Sellers", "Sale", "Brands"].map((t) => (
            <button
              key={t}
              onClick={() => navigate("/products")}
              className="px-4 py-2 rounded-full text-xs font-bold text-slate-600 bg-white/70 hover:bg-white border border-white shadow-sm transition-all hover:scale-105"
            >
              {t}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">grid_view</span>
            All Products
          </button>
        </div>
      </div>

      {/* ══ HERO + SIDE STACK ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
        {/* ── HERO (8 cols, tall) ── */}
        <div
          className="lg:col-span-8 relative rounded-[2rem] overflow-hidden cursor-pointer group min-h-[580px] xl:min-h-[680px] shadow-lg"
          onClick={() => navigate("/products")}
        >
          <div className="absolute inset-0 z-0">
            <ProductImg
              image={hero?.image}
              name={hero?.name}
              className="group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>

          {/* Top-left badge */}
          <div className="absolute top-7 left-7 z-10 flex items-center gap-2">
            <div className="bg-[#C8F04A] text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow">
              ✦ Featured Drop
            </div>
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-8 xl:p-10">
            {hero && <StockLabel stock={hero.stock} />}
            <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight mt-3 mb-2 max-w-lg drop-shadow">
              {hero?.name || "Discover Our Best"}
            </h2>
            {hero && (
              <p className="text-white/70 font-bold text-lg mb-6">
                ₹{parseFloat(hero.price).toLocaleString()}
              </p>
            )}
            <div className="inline-flex items-center gap-3 bg-[#C8F04A] rounded-full pl-6 pr-2 py-2 shadow-xl hover:scale-105 transition-transform">
              <span className="font-black text-slate-900 text-sm">
                Shop Now
              </span>
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-base">
                  arrow_outward
                </span>
              </div>
            </div>
          </div>

          {/* Decorative dots */}
          <div className="absolute top-10 right-10 w-4 h-4 rounded-full bg-white/40 z-10" />
          <div className="absolute top-16 right-16 w-2 h-2 rounded-full bg-[#C8F04A] z-10" />
        </div>

        {/* ── RIGHT COLUMN (4 cols) ── */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* New Season Banner */}
          <div className="bg-slate-900 rounded-[2rem] px-7 py-6 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">
                2025 Collection
              </p>
              <h3 className="text-2xl font-black text-white leading-tight">
                New Season
                <br />
                Has Arrived
              </h3>
              <button
                onClick={() => navigate("/products")}
                className="mt-4 bg-[#C8F04A] text-slate-900 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-lime-300 transition-colors"
              >
                Explore →
              </button>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <ProductImg image={card2?.image} name={card2?.name} />
            </div>
          </div>

          {/* Product card 2 */}
          <div
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow group flex-1"
            onClick={() => navigate("/products")}
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-50">
              <ProductImg
                image={card2?.image}
                name={card2?.name}
                className="group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="flex-1 min-w-0">
              <StockLabel stock={card2?.stock ?? 99} />
              <h4 className="font-black text-slate-900 text-base mt-2 leading-tight truncate">
                {card2?.name || "Premium Pick"}
              </h4>
              <p className="text-slate-500 font-bold text-sm mt-1">
                ₹{card2 ? parseFloat(card2.price).toLocaleString() : "—"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-[#C8F04A] transition-colors flex-shrink-0">
              <span className="material-symbols-outlined text-sm">
                arrow_outward
              </span>
            </div>
          </div>

          {/* Product card 3 — image card */}
          <div
            className="relative rounded-[2rem] overflow-hidden cursor-pointer group min-h-[240px] shadow-sm flex-1"
            onClick={() => navigate("/products")}
          >
            <div className="absolute inset-0 z-0">
              <ProductImg
                image={card3?.image}
                name={card3?.name}
                className="group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </div>
            <div className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-[#C8F04A] transition-colors">
              <span className="material-symbols-outlined text-white group-hover:text-slate-900 text-sm">
                arrow_outward
              </span>
            </div>
            <div className="absolute bottom-5 left-5 right-5 z-10">
              <StockLabel stock={card3?.stock ?? 99} />
              <h4 className="font-black text-white text-lg mt-1.5 leading-tight">
                {card3?.name || "Top Seller"}
              </h4>
              <p className="text-white/70 font-bold text-sm">
                ₹{card3 ? parseFloat(card3.price).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATS STRIP ══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {[
          {
            icon: "local_shipping",
            label: "Free Delivery",
            sub: "On orders over ₹999",
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: "workspace_premium",
            label: "Premium Quality",
            sub: "Curated collections",
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            icon: "autorenew",
            label: "Easy Returns",
            sub: "30-day return policy",
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            icon: "verified_user",
            label: "Secure Payment",
            sub: "100% safe checkout",
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map(({ icon, label, sub, color, bg }) => (
          <div
            key={label}
            className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm border border-slate-100"
          >
            <div
              className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}
            >
              <span
                className={`material-symbols-outlined ${color} text-xl`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm leading-tight">
                {label}
              </p>
              <p className="text-slate-400 font-medium text-xs">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══ TRENDING + CATEGORIES ROW ══ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-5">
        {/* Trending banner — 8 cols */}
        <div
          className="md:col-span-8 relative rounded-[2rem] overflow-hidden cursor-pointer group min-h-[300px] shadow-lg"
          onClick={() => navigate("/products")}
        >
          <div className="absolute inset-0 z-0">
            <ProductImg
              image={trending?.image}
              name={trending?.name}
              className="group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
          </div>
          <div className="relative z-10 p-9 flex flex-col justify-between h-full">
            <div className="flex items-center gap-2 w-max bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full">
              <span
                className="material-symbols-outlined text-orange-400 text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              <span className="text-white font-black text-xs uppercase tracking-widest">
                Trending Now
              </span>
            </div>
            <div>
              <h3 className="text-4xl xl:text-5xl font-black text-white leading-tight max-w-xs mb-3 drop-shadow">
                {trending?.name || "Hot Picks"}
              </h3>
              {trending && (
                <p className="text-white/70 font-bold text-base mb-5">
                  ₹{parseFloat(trending.price).toLocaleString()} &nbsp;·&nbsp;{" "}
                  {trending.stock > 0
                    ? `${trending.stock} in stock`
                    : "Out of stock"}
                </p>
              )}
              <div className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-black text-sm shadow hover:bg-[#C8F04A] transition-colors">
                Shop Trending
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category pills — 4 cols */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest px-1">
            Categories
          </h3>
          {[
            {
              label: "New Arrivals",
              icon: "new_releases",
              color: "bg-blue-600",
            },
            { label: "Best Sellers", icon: "star", color: "bg-amber-500" },
            { label: "On Sale", icon: "sell", color: "bg-rose-500" },
            {
              label: "Premium",
              icon: "workspace_premium",
              color: "bg-purple-600",
            },
            { label: "Limited Edition", icon: "timer", color: "bg-slate-800" },
          ].map(({ label, icon, color }) => (
            <button
              key={label}
              onClick={() => navigate("/products")}
              className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 shadow-sm border border-slate-100 hover:shadow-md hover:scale-[1.01] transition-all group text-left"
            >
              <div
                className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}
              >
                <span
                  className="material-symbols-outlined text-white text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
              </div>
              <span className="font-black text-slate-800 text-sm flex-1">
                {label}
              </span>
              <span className="material-symbols-outlined text-slate-300 group-hover:text-slate-600 transition-colors text-sm">
                arrow_forward_ios
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ══ PRODUCT GRID ROW ══ */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            All Products
          </h3>
          <button
            onClick={() => navigate("/products")}
            className="text-xs font-black text-slate-500 uppercase tracking-widest hover:text-slate-900 transition-colors flex items-center gap-1"
          >
            View All{" "}
            <span className="material-symbols-outlined text-sm">
              arrow_forward
            </span>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {moreCards.map((prod, i) => (
            <div
              key={prod?.id || i}
              className="bg-white rounded-[1.75rem] overflow-hidden shadow-sm border border-slate-100 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all group"
              onClick={() => navigate("/products")}
            >
              <div className="h-44 bg-slate-50 overflow-hidden relative">
                <ProductImg
                  image={prod?.image}
                  name={prod?.name}
                  className="group-hover:scale-110 transition-transform duration-500"
                />
                {prod?.stock < 10 && prod?.stock > 0 && (
                  <div className="absolute top-3 left-3 bg-amber-400 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                    Low Stock
                  </div>
                )}
                {prod?.stock === 0 && (
                  <div className="absolute top-3 left-3 bg-slate-700 text-white text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                    Sold Out
                  </div>
                )}
              </div>
              <div className="p-5">
                <h4 className="font-black text-slate-900 text-sm leading-tight mb-1 truncate">
                  {prod?.name}
                </h4>
                <p className="text-slate-500 font-bold text-xs mb-3">
                  {prod?.stock > 0 ? `${prod.stock} available` : "Out of stock"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-base">
                    ₹{prod ? parseFloat(prod.price).toLocaleString() : "—"}
                  </span>
                  <div className="w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center group-hover:bg-[#C8F04A] transition-colors">
                    <span className="material-symbols-outlined text-white group-hover:text-slate-900 text-xs">
                      add
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ BOTTOM ROW: Limited + Spotlight + Banner ══ */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Limited Deal — lime card */}
        <div
          className="md:col-span-4 bg-[#C8F04A] rounded-[2rem] p-8 shadow-sm relative overflow-hidden flex flex-col items-center text-center cursor-pointer group min-h-[340px]"
          onClick={() => navigate("/products")}
        >
          <div className="absolute top-5 left-5 bg-slate-900 text-[#C8F04A] text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
            Limited
          </div>
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />

          <div className="w-3/4 h-44 mt-6 mb-5 relative z-10">
            <ProductImg
              image={limitedDeal?.image}
              name={limitedDeal?.name}
              className="object-contain group-hover:scale-110 transition-transform duration-500 drop-shadow-xl"
            />
          </div>

          <div className="relative z-10 w-full mt-auto">
            <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight">
              {limitedDeal?.name
                ? limitedDeal.name.split(" ").slice(0, 4).join(" ")
                : "Flash Edition"}
            </h3>
            {limitedDeal && (
              <p className="text-2xl font-black text-slate-900 mb-1">
                ₹{parseFloat(limitedDeal.price).toLocaleString()}
              </p>
            )}
            <p className="text-slate-700 font-bold text-xs mb-5">
              Only {limitedDeal?.stock ?? 0} left — hurry!
            </p>
            <div className="w-full bg-slate-900 text-[#C8F04A] py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow group-hover:bg-slate-800 transition-colors">
              Get it Now
            </div>
          </div>
        </div>

        {/* Spotlight product — 4 cols */}
        <div
          className="md:col-span-4 relative rounded-[2rem] overflow-hidden cursor-pointer group shadow-lg min-h-[340px]"
          onClick={() => navigate("/products")}
        >
          <div className="absolute inset-0 z-0">
            <ProductImg
              image={spotlight?.image}
              name={spotlight?.name}
              className="group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
          </div>
          <div className="absolute top-5 left-5 z-10">
            <div className="bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-full">
              <span className="text-white font-black text-[10px] uppercase tracking-widest">
                Spotlight
              </span>
            </div>
          </div>
          <div className="absolute bottom-6 left-6 right-6 z-10">
            <h3 className="text-2xl font-black text-white leading-tight mb-1">
              {spotlight?.name || "Premium Pick"}
            </h3>
            <p className="text-white/70 font-bold text-sm mb-4">
              ₹{spotlight ? parseFloat(spotlight.price).toLocaleString() : "—"}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white text-slate-900 py-3 rounded-xl font-black text-xs text-center hover:bg-[#C8F04A] transition-colors">
                View Details
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter CTA — 4 cols */}
        <div className="md:col-span-4 bg-slate-900 rounded-[2rem] p-8 shadow-lg flex flex-col justify-between min-h-[340px]">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#C8F04A] flex items-center justify-center mb-6">
              <span
                className="material-symbols-outlined text-slate-900 text-xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                mail
              </span>
            </div>
            <h3 className="text-2xl font-black text-white leading-tight mb-3">
              Get Exclusive
              <br />
              Deals First
            </h3>
            <p className="text-slate-400 font-medium text-sm leading-relaxed mb-6">
              Join thousands of shoppers who never miss a sale. No spam, ever.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
              <span className="material-symbols-outlined text-slate-400 text-sm">
                mail_outline
              </span>
              <span className="text-slate-500 text-sm font-medium">
                your@email.com
              </span>
            </div>
            <button
              onClick={() => navigate("/products")}
              className="w-full bg-[#C8F04A] text-slate-900 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-lime-300 transition-colors"
            >
              Subscribe & Save
            </button>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: "groups", label: "10k+ members" },
                { icon: "sell", label: "Up to 40% off" },
              ].map(({ icon, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span
                    className="material-symbols-outlined text-slate-500 text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {icon}
                  </span>
                  <span className="text-slate-500 font-bold text-xs">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ FOOTER STRIP ══ */}
      <div className="mt-8 pt-6 border-t border-black/10 flex flex-col md:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <span className="material-symbols-outlined text-sm">storefront</span>
          <span>© 2025 ShopNest · All rights reserved</span>
        </div>
        <div className="flex items-center gap-6">
          {["Privacy", "Terms", "Contact", "FAQ"].map((t) => (
            <button
              key={t}
              className="text-slate-400 text-xs font-bold hover:text-slate-700 transition-colors uppercase tracking-wider"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
