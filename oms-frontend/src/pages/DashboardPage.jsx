import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useProducts } from "../hooks/useProducts";
import { Spin } from "antd";
import useAuthStore from "../store/authStore";
import show_1 from "../assets/dashboard-showcase/show_1.jpg";
import show_2 from "../assets/dashboard-showcase/show_2.avif";
import show_3 from "../assets/dashboard-showcase/show_3.jpg";
import show_4 from "../assets/dashboard-showcase/show_4.jpg";
import show_5 from "../assets/dashboard-showcase/show_5.jpg";
import show_6 from "../assets/dashboard-showcase/show_6.jpg";

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
      className={`w-full h-full ${className.includes("object-contain") ? "" : "object-cover"} ${className}`}
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

const premiumShowcaseSlides = [show_1, show_2, show_3, show_4, show_5, show_6];

/* ══════════════════════════════════════════════════════════
 *  PUBLIC DASHBOARD — no auth, pure product showcase
 * ══════════════════════════════════════════════════════════ */
const DashboardPage = () => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const { data: productsData, isLoading } = useProducts();
  const premiumCarouselRef = useRef(null);
  const [activePremiumSlide, setActivePremiumSlide] = useState(0);
  const [isPremiumAutoScrollPaused, setIsPremiumAutoScrollPaused] =
    useState(false);

  useEffect(() => {
    const carousel = premiumCarouselRef.current;
    if (!carousel) return undefined;

    if (isPremiumAutoScrollPaused || premiumShowcaseSlides.length < 2) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      let nextIndex = activePremiumSlide + 1;

      if (activePremiumSlide === premiumShowcaseSlides.length) {
        // Instantly warp to start when sitting on the clone
        carousel.scrollTo({
          left: 0,
          behavior: "auto",
        });
        // Force reflow
        void carousel.offsetWidth;
        nextIndex = 1;
      }

      carousel.scrollTo({
        left: nextIndex * carousel.clientWidth,
        behavior: "smooth",
      });
      setActivePremiumSlide(nextIndex);
    }, 3000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activePremiumSlide, isPremiumAutoScrollPaused]);

  useEffect(() => {
    const handleResize = () => {
      const carousel = premiumCarouselRef.current;
      if (!carousel) return;

      carousel.scrollTo({
        left: activePremiumSlide * carousel.clientWidth,
        behavior: "auto",
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activePremiumSlide]);

  const goToPremiumSlide = (index) => {
    const carousel = premiumCarouselRef.current;
    if (!carousel) return;

    setActivePremiumSlide(index);
    carousel.scrollTo({
      left: index * carousel.clientWidth,
      behavior: "smooth",
    });
  };

  const handlePremiumCarouselScroll = (event) => {
    const carousel = event.currentTarget;
    if (!carousel.clientWidth) return;

    const nextIndex = Math.round(carousel.scrollLeft / carousel.clientWidth);
    if (nextIndex !== activePremiumSlide) {
      setActivePremiumSlide(nextIndex);
    }
  };

  if (user?.role === "ADMIN" || user?.role === "MANAGER") {
    return <Navigate to="/admin/dashboard" replace />;
  }

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

  return (
    <div className="w-full max-w-[1800px] mx-auto bg-[#F0EEE6] rounded-[2.5rem] p-4 sm:p-8 xl:p-8 shadow-2xl mt-4 border border-white/60 font-sans">
      {/* ══ 1. HERO CAROUSEL ══ */}
      <div className="mb-6 mt-1">
        <div className="relative overflow-hidden rounded-[2rem] shadow-sm">
          {/* Title overlay — top-left inside image */}
          <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none px-8 pt-6 pb-20 bg-gradient-to-b from-black/55 via-black/20 to-transparent">
            <h3 className="text-xl sm:text-2xl xl:text-3xl font-semibold text-white tracking-tight drop-shadow">
              Trending Now.{" "}
              
              <span className="text-white/70 font-medium hidden sm:block sm:text-xl xl:text-2xl">
                Discover our newest arrivals.
              </span>
            </h3>
            <div className="mt-4 pointer-events-auto">
              <button
                onClick={() => navigate("/products")}
                className="inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-2 rounded-full text-xs font-semibold tracking-wide shadow-lg hover:scale-105 transition-transform"
              >
                Shop Now
                <span className="material-symbols-outlined text-sm">
                  arrow_outward
                </span>
              </button>
            </div>
          </div>
          <div
            ref={premiumCarouselRef}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            onScroll={handlePremiumCarouselScroll}
            onMouseEnter={() => {
              setIsPremiumAutoScrollPaused(true);
            }}
            onMouseLeave={() => {
              setIsPremiumAutoScrollPaused(false);
            }}
            onTouchStart={() => {
              setIsPremiumAutoScrollPaused(true);
            }}
            onTouchEnd={() => {
              setIsPremiumAutoScrollPaused(false);
            }}
            onFocus={() => {
              setIsPremiumAutoScrollPaused(true);
            }}
            onBlur={() => {
              setIsPremiumAutoScrollPaused(false);
            }}
          >
            {[...premiumShowcaseSlides, premiumShowcaseSlides[0]].map(
              (slide, index) => (
                <button
                  key={`${slide}-${index}`}
                  type="button"
                  data-premium-slide
                  onClick={() => navigate("/products")}
                  aria-label="Open premium product image"
                  className="block h-[195px] w-full shrink-0 snap-center overflow-hidden text-left sm:h-[300px] lg:h-[390px]"
                >
                  <img
                    src={slide}
                    alt=""
                    className="h-full w-full object-cover"
                    draggable="false"
                  />
                </button>
              ),
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex items-center justify-center">
            <div className="pointer-events-auto flex items-center gap-2 bg-black/10 backdrop-blur-sm px-3 py-2 rounded-full border border-white/10">
              {premiumShowcaseSlides.map((_, index) => {
                const isActive =
                  activePremiumSlide === index ||
                  (activePremiumSlide === premiumShowcaseSlides.length &&
                    index === 0);
                return (
                  <button
                    key={`premium-indicator-${index}`}
                    type="button"
                    onClick={() => goToPremiumSlide(index)}
                    aria-label={`Go to premium slide ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${isActive ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══ 2. SHOP BY CATEGORY ══ */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-slate-900 tracking-tight px-1 mb-4 lg:block">
          Shop by Category
        </h3>
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {[
            {
              label: "Mobile & Accessories",
              sub: "Phones, cases & more",
              icon: "smartphone",
              color: "bg-blue-600",
              bg: "bg-blue-50",
              text: "text-blue-700",
            },
            {
              label: "Audio & Headphones",
              sub: "Earbuds, speakers",
              icon: "headphones",
              color: "bg-purple-600",
              bg: "bg-purple-50",
              text: "text-purple-700",
            },
            {
              label: "Wearables & Watches",
              sub: "Smartwatches, bands",
              icon: "watch",
              color: "bg-rose-500",
              bg: "bg-rose-50",
              text: "text-rose-700",
            },
            {
              label: "Computers & Laptops",
              sub: "Laptops, accessories",
              icon: "laptop",
              color: "bg-amber-500",
              bg: "bg-amber-50",
              text: "text-amber-700",
            },
            {
              label: "Cameras & Lenses",
              sub: "DSLR, mirrorless",
              icon: "photo_camera",
              color: "bg-slate-700",
              bg: "bg-slate-100",
              text: "text-slate-600",
            },
          ].map(({ label, sub, icon, color, bg, text }) => (
            <div
              key={label}
              className={`flex flex-col lg:gap-3 items-center lg:items-start ${bg} rounded-2xl p-3 lg:px-4 lg:py-4 border border-white shadow-sm select-none`}
            >
              <div
                className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center shrink-0 shadow`}
              >
                <span
                  className="material-symbols-outlined text-white text-base"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {icon}
                </span>
              </div>
              <div className="hidden lg:block mt-1 lg:mt-0">
                <p className="font-semibold text-slate-900 text-sm leading-tight">
                  {label}
                </p>
                <p className={`text-xs font-medium mt-0.5 ${text}`}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ 3. FEATURED DROP + SIDE CARDS ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mb-8">
        {/* Big hero product */}
        <div
          className="lg:col-span-8 relative rounded-[2rem] overflow-hidden cursor-pointer group min-h-[320px] sm:min-h-[480px] xl:min-h-[600px] shadow-lg"
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
          <div className="absolute top-7 left-7 z-10">
            <div className="bg-[#C8F04A] text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-wide shadow">
              ✦ Featured Drop
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-10 p-8 xl:p-10">
            {hero && <StockLabel stock={hero.stock} />}
            <h2 className="text-3xl sm:text-4xl xl:text-5xl font-bold text-white leading-tight tracking-tight mt-3 mb-2 max-w-lg drop-shadow">
              {hero?.name || "Discover Our Best"}
            </h2>
            {hero && (
              <p className="text-white/70 font-medium text-base mb-6">
                ₹{parseFloat(hero.price).toLocaleString()}
              </p>
            )}
            <div className="inline-flex items-center gap-3 bg-[#C8F04A] rounded-full pl-6 pr-2 py-2 shadow-xl hover:scale-105 transition-transform">
              <span className="font-semibold text-slate-900 text-sm">
                Shop Now
              </span>
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-base">
                  arrow_outward
                </span>
              </div>
            </div>
          </div>
          <div className="absolute top-10 right-10 w-4 h-4 rounded-full bg-white/40 z-10" />
          <div className="absolute top-16 right-16 w-2 h-2 rounded-full bg-[#C8F04A] z-10" />
        </div>

        {/* Side cards */}
        <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-6">
          {/* Dark promo banner */}
          <div className="bg-slate-900 rounded-[2rem] px-7 py-6 shadow-lg flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white leading-tight">
                New Season
                <br />
                Has Arrived
              </h3>
              <button
                onClick={() => navigate("/products")}
                className="mt-4 bg-[#C8F04A] text-slate-900 px-4 py-2 rounded-full text-xs font-semibold tracking-wide hover:bg-lime-300 transition-colors"
              >
                Explore →
              </button>
            </div>
            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 overflow-hidden">
              <ProductImg image={card2?.image} name={card2?.name} />
            </div>
          </div>

          {/* Product card 2 */}
          <div
            className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow group flex-1"
            onClick={() => navigate("/products")}
          >
            <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-50">
              <ProductImg
                image={card2?.image}
                name={card2?.name}
                className="group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <div className="flex-1 min-w-0">
              <StockLabel stock={card2?.stock ?? 99} />
              <h4
                title={card2?.name}
                className="text-sm font-medium text-slate-900 mt-2 leading-tight line-clamp-1"
              >
                {card2?.name || "Premium Pick"}
              </h4>
              <p className="text-slate-600 font-semibold text-sm mt-1">
                ₹{card2 ? parseFloat(card2.price).toLocaleString() : "—"}
              </p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-[#C8F04A] transition-colors shrink-0">
              <span className="material-symbols-outlined text-sm">
                arrow_outward
              </span>
            </div>
          </div>

          {/* Product card 3 */}
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
              <h4
                title={card3?.name}
                className="text-white text-sm font-medium mt-1.5 leading-tight line-clamp-1"
              >
                {card3?.name || "Top Seller"}
              </h4>
              <p className="text-white/70 font-medium text-sm">
                ₹{card3 ? parseFloat(card3.price).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ 4. ALL PRODUCTS CAROUSEL ══ */}
      <div className="mb-8 mt-2">
        <div className="mb-6 px-2">
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
            All Products.
            <span className="text-slate-400 font-normal ml-2 text-base">
              Explore our complete collection.
            </span>
          </h3>
        </div>
        <div
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 snap-x hide-scrollbar px-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          {products.slice(0, 10).map((prod, i) => (
            <div
              key={prod?.id || i}
              className="bg-white rounded-[1.5rem] p-5 pb-6 min-w-[240px] sm:min-w-[260px] max-w-[260px] shrink-0 snap-center cursor-pointer border border-slate-200/60 shadow-sm hover:shadow-md transition-all flex flex-col items-center group relative overflow-hidden"
              onClick={() => navigate("/products")}
            >
              <div className="w-full h-40 mt-1 mb-3 flex items-center justify-center relative">
                <ProductImg
                  image={prod?.image}
                  name={prod?.name}
                  className="object-contain w-full h-full transform transition-transform duration-700 group-hover:scale-110"
                />
              </div>
              <div className="w-full text-left mt-auto">
                <h4
                  title={prod?.name}
                  className="text-sm font-medium text-slate-900 leading-tight mb-2"
                >
                  {prod?.name}
                </h4>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    ₹{prod ? parseFloat(prod.price).toLocaleString() : "—"}
                  </p>
                  {prod?.stock > 0 && prod.stock < 10 && (
                    <p className="text-[10px] sm:text-xs text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
                      Only {prod.stock} left
                    </p>
                  )}
                  {prod?.stock === 0 && (
                    <p className="text-[10px] sm:text-xs text-slate-500 font-bold bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                      Out of Stock
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ 5. WHY SHOPNEST ══ */}
      <div className="mb-8 mt-2">
        <div className="mb-6 px-2">
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
            Why ShopNest?
          </h3>
        </div>
        <div
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 snap-x hide-scrollbar px-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {[
            {
              icon: "sentiment_satisfied",
              iconColor: "text-purple-500",
              title: "Make them yours.",
              desc: "Engrave a mix of emoji, names and numbers for free.",
              descColor: "text-purple-500",
            },
            {
              icon: "local_shipping",
              iconColor: "text-green-600",
              title: "Enjoy free delivery.",
              desc: "Or easy pickup from a ShopNest store.",
              descColor: "text-green-600",
            },
            {
              icon: "autorenew",
              iconColor: "text-blue-500",
              title: "Trade in your device.",
              desc: "For instant credit toward your next purchase.",
              descColor: "text-blue-500",
            },
            {
              icon: "credit_card",
              iconColor: "text-amber-500",
              title: "Pay your way.",
              desc: "Full payment or easy installments — your choice.",
              descColor: "text-amber-500",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-5 sm:p-6 min-w-[260px] sm:min-w-[300px] max-w-[300px] shrink-0 snap-center shadow-sm hover:shadow-md transition-shadow cursor-default border border-slate-100 flex flex-col justify-start"
            >
              <span
                className={`material-symbols-outlined text-4xl mb-4 ${item.iconColor}`}
                style={{ fontVariationSettings: "'wght' 300" }}
              >
                {item.icon}
              </span>
              <h4 className="text-sm font-semibold text-slate-900 leading-tight mb-1.5">
                {item.title}
              </h4>
              <p
                className={`text-xs font-medium leading-relaxed ${item.descColor}`}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ 6. CUSTOMER REVIEWS ══ */}
      <div className="mb-8 mt-2">
        <div className="mb-6 px-2">
          <h3 className="text-xl font-semibold text-slate-900 tracking-tight">
            Customer Reviews
          </h3>
        </div>
        <div
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar px-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {[
            {
              name: "Rahul M.",
              handle: "@rahulmehta",
              avatar: "R",
              avatarBg: "bg-indigo-500",
              rating: 5,
              date: "March 12, 2026",
              text: "Absolutely love the experience! Got my order in 2 days. The product quality exceeded expectations. Will definitely shop again from ShopNest.",
              product: "Power Bank Pro",
            },
            {
              name: "Priya S.",
              handle: "@priyashah",
              avatar: "P",
              avatarBg: "bg-rose-500",
              rating: 5,
              date: "Feb 28, 2026",
              text: "Smooth checkout, great packaging, and the product looks even better in person. Customer support was super helpful when I had a question.",
              product: "Wireless Earbuds",
            },
            {
              name: "Amir K.",
              handle: "@amirkhan",
              avatar: "A",
              avatarBg: "bg-amber-500",
              rating: 4,
              date: "April 2, 2026",
              text: "Really good platform overall. Had a minor delay in shipping but the team resolved it quickly. The product is fantastic value for money.",
              product: "Smart Watch",
            },
            {
              name: "Sneha V.",
              handle: "@snehaverma",
              avatar: "S",
              avatarBg: "bg-green-500",
              rating: 5,
              date: "March 25, 2026",
              text: "First time buying from ShopNest and I'm hooked! Super easy to navigate, great deals, and the delivery was lightning fast. 10/10!",
              product: "Bluetooth Speaker",
            },
            {
              name: "Dev P.",
              handle: "@devpatel",
              avatar: "D",
              avatarBg: "bg-blue-500",
              rating: 5,
              date: "Jan 18, 2026",
              text: "The product catalog is amazing and prices are very competitive. I use ShopNest for all my electronics now. Never disappointed.",
              product: "Laptop Stand",
            },
          ].map((review, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-100 rounded-3xl p-6 min-w-[280px] sm:min-w-[320px] max-w-[320px] shrink-0 snap-center flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 pb-4 mb-4 border-b border-dashed border-slate-100">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 ${review.avatarBg}`}
                >
                  {review.avatar}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm leading-tight">
                    {review.name}
                  </p>
                  <p className="text-slate-400 text-xs font-medium">
                    {review.handle}
                  </p>
                </div>
                <div className="ml-auto flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <span
                      key={s}
                      className={`material-symbols-outlined text-sm ${s < review.rating ? "text-amber-400" : "text-slate-200"}`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed flex-1 mb-5">
                {review.text}
              </p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-slate-400 text-[11px] font-medium">
                  {review.date}
                </span>
                <span className="text-[11px] bg-slate-50 border border-slate-100 text-slate-500 font-bold px-2.5 py-1 rounded-full">
                  {review.product}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ 7. FOOTER ══ */}
      <div className="mt-8 pt-6 border-t border-black/10 flex flex-col md:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <span className="material-symbols-outlined text-sm">storefront</span>
          <span>© 2026 ShopNest · All rights reserved</span>
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
