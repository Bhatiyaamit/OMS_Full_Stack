import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { useAllOrders } from "../hooks/useOrders";
import { useProducts } from "../hooks/useProducts";
import { Spin } from "antd";

const DashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const { data: productsData, isLoading: loadingProducts } = useProducts();
  const { data: allOrdersData, isLoading: loadingOrders } = useAllOrders({ enabled: isAdminOrManager });

  const loading = isAdminOrManager
    ? loadingProducts || loadingOrders
    : loadingProducts;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const products = productsData?.data || [];
  const adminOrders = allOrdersData?.data || [];


  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
  };

  /* ═══════════════════════════════════════════════════════
   *  CUSTOMER VIEW — Bento Box Dashboard
   * ═══════════════════════════════════════════════════════ */
  if (!isAdminOrManager) {
    const heroProduct = products[0];
    const newGenProduct = products[1];
    const verticalProduct = products[2];
    const moreProducts = products.slice(3, 6);
    const bottomPopularProduct = products[6] || products[0];
    const trendingProduct = products[7] || products[1];
    const limitedProduct = products[8] || products[2];

    return (
      <div className="w-full max-w-[1800px] mx-auto min-h-[900px] bg-[#EEF0E5] rounded-[3rem] p-8 shadow-2xl mt-4 border border-white/50">
        {/* Main 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Column: Hero (8 cols) ── */}
          <div className="lg:col-span-8 bg-[#F5F6F0] rounded-[2.5rem] p-12 relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[600px] xl:min-h-[750px]">
            {/* Top Left Text */}
            <div className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden">
              {heroProduct?.image ? (
                <img
                  src={getImageUrl(heroProduct.image)}
                  alt="Hero"
                  className="w-full h-full object-cover object-center opacity-90 drop-shadow-[0_45px_45px_rgba(0,0,0,0.5)] hover:scale-105 transition-all duration-700"
                />
              ) : (
                <div className="w-full h-full bg-slate-200 rounded-full blur-3xl opacity-50"></div>
              )}
            </div>
            <div className="relative z-10 w-3/5">
              <div className="inline-flex items-center gap-3 bg-white/60 px-4 py-2 rounded-full text-sm font-bold text-slate-700 shadow-sm backdrop-blur-md mb-8 border border-white/50">
                <span className="material-symbols-outlined text-base">
                  grid_view
                </span>
                Music is Classic
              </div>
              <h1 className="text-6xl xl:text-7xl font-['Inter'] font-medium text-white mix-blend-difference leading-[1.05] tracking-tight mb-10">
                {heroProduct ? heroProduct.name : "Sequoia Inspiring Musico."}
              </h1>

              <div className="flex items-start gap-6 mb-12">
                <span
                  className="text-6xl xl:text-7xl font-light tracking-tighter mix-blend-difference"
                  style={{ WebkitTextStroke: "1px white", color: "transparent" }}
                >
                  01
                </span>
                <div className="mt-2">
                  <h3 className="text-lg font-bold text-white mix-blend-difference mb-2">
                    Clear Sounds
                  </h3>
                  <p className="text-sm text-white mix-blend-difference opacity-90 font-medium leading-relaxed max-w-[240px]">
                    Making your dream music come true stay with Sequios Sounds!
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div
                className="inline-flex items-center gap-3 bg-[#D1F34A] rounded-full p-2 pl-8 shadow-[0_12px_30px_rgba(209,243,74,0.3)] hover:scale-105 transition-transform cursor-pointer"
                onClick={() => navigate("/products")}
              >
                <span className="text-base font-bold text-slate-900 pr-2">
                  View All Products
                </span>
                <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-lg">
                    arrow_outward
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Left Social */}
            <div className="relative z-10 flex items-center gap-4 mt-auto pt-10">
              <span className="text-sm font-bold text-white mix-blend-difference">
                Follow us on:
              </span>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 hover:text-primary cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-sm">
                    flutter_dash
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 hover:text-primary cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-sm">
                    music_note
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-600 hover:text-primary cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-sm">
                    photo_camera
                  </span>
                </div>
              </div>
            </div>

            {/* Hero Image */}

            {/* Small decorative spheres */}
            <div className="absolute top-[10%] right-[60%] w-6 h-6 rounded-full bg-linear-to-br from-white to-slate-400 shadow-md"></div>
            <div className="absolute bottom-[20%] right-[10%] w-4 h-4 rounded-full bg-slate-900 shadow-lg z-20"></div>
          </div>

          {/* ── Right Column (4 cols) ── */}
          <div className="lg:col-span-4 flex flex-col gap-8">
            {/* Popular Products (Dynamic with Smart Contrast) */}
            <div className="bg-[#F5F6F0] rounded-[2.5rem] p-8 shadow-sm border border-white/50">
              <h3 className="text-lg font-semibold text-slate-800 mb-6 tracking-tight">
                Popular Products
              </h3>
              <div className="flex items-center justify-between px-2">
                {products.slice(0, 5).map((prod, i) => (
                  <div
                    key={i}
                    className="relative w-12 h-12 rounded-full shadow-inner cursor-pointer hover:scale-110 transition-transform ring-[4px] ring-white overflow-hidden group"
                    onClick={() => navigate("/products")}
                    title={prod.name}
                  >
                    {prod?.image ? (
                      <img
                        src={getImageUrl(prod.image)}
                        alt={prod.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-300"></div>
                    )}
                    {/* Hover text overlay with mix-blend-difference for automatic light/dark contrast */}
                    <div className="absolute inset-0 flex items-center justify-center bg-transparent group-hover:bg-white/10 transition-colors">
                      <span className="text-[10px] font-bold text-white mix-blend-difference opacity-0 group-hover:opacity-100 transition-opacity leading-none text-center px-1">
                        {prod.name.split(" ")[0]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* New Gen X-Bud / Product 2 */}
            <div
              className="bg-[#F5F6F0] rounded-[2.5rem] p-8 shadow-sm border border-white/50 flex flex-row items-center justify-between relative overflow-hidden group h-[220px] cursor-pointer"
              onClick={() => navigate("/products")}
            >
              <div className="w-[55%] relative z-10 h-full flex flex-col">
                <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-auto pt-2">
                  {newGenProduct
                    ? newGenProduct.name.split(" ").slice(0, 3).join(" ")
                    : "New Gen X-Bud"}
                </h3>
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-800 mt-4 group-hover:bg-[#D1F34A] transition-colors">
                  <span className="material-symbols-outlined text-sm">
                    arrow_outward
                  </span>
                </div>
              </div>
              <div className="w-[55%] h-[140%] absolute right-[-10%] top-[-20%] rounded-[2rem] overflow-hidden">
                {newGenProduct?.image ? (
                  <img
                    src={getImageUrl(newGenProduct.image)}
                    alt="Product"
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-300"></div>
                )}
              </div>
            </div>

            {/* Vertical Product Card / Product 3 */}
            <div
              className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-end relative overflow-hidden group flex-1 cursor-pointer min-h-[300px] xl:min-h-[340px]"
              onClick={() => navigate("/products")}
            >
              <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center shadow-sm z-20 group-hover:bg-[#D1F34A] transition-colors">
                <span className="material-symbols-outlined text-sm">
                  arrow_outward
                </span>
              </div>

              <div className="absolute inset-0 z-0">
                {verticalProduct?.image ? (
                  <img
                    src={getImageUrl(verticalProduct.image)}
                    alt="Product"
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-1000"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-200"></div>
                )}
                {/* Gradient Fade for text readability */}
                <div className="absolute inset-0 bg-linear-to-t from-white via-white/80 to-transparent h-[70%] top-auto bottom-0"></div>
              </div>

              <div className="relative z-10 w-full pr-8">
                <h3 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
                  {verticalProduct
                    ? verticalProduct.name
                    : "Light Grey Surface Headphone"}
                </h3>
                <p className="text-sm font-semibold text-slate-500">
                  Boosted with bass
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Row Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-8">
          {/* More Products */}
          <div className="md:col-span-12 lg:col-span-4 bg-[#F5F6F0] rounded-[2.5rem] p-8 shadow-sm border border-white/50 relative">
            <div className="absolute top-8 right-8 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-red-500">
              <span
                className="material-symbols-outlined text-base"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                favorite
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">More Products</h3>
            <p className="text-sm text-slate-500 font-medium mb-8">
              460 plus items.
            </p>

            <div className="flex gap-4 h-32">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-full bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => navigate("/products")}
                >
                  {moreProducts[i]?.image ? (
                    <img
                      src={getImageUrl(moreProducts[i].image)}
                      alt="Thumb"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <span className="material-symbols-outlined text-outline-variant text-2xl">
                        image
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stats Widget */}
          <div className="md:col-span-12 lg:col-span-3 bg-[#F5F6F0] rounded-[2.5rem] p-8 shadow-sm border border-white/50 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="flex -space-x-4 mb-6 relative z-10">
              <div className="w-14 h-14 rounded-full border-[3px] border-[#F5F6F0] bg-slate-200 z-30 overflow-hidden">
                <img
                  src="https://i.pravatar.cc/100?img=33"
                  alt="user"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-14 h-14 rounded-full border-[3px] border-[#F5F6F0] bg-slate-300 z-20 overflow-hidden">
                <img
                  src="https://i.pravatar.cc/100?img=47"
                  alt="user"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-14 h-14 rounded-full border-[3px] border-[#F5F6F0] bg-slate-400 z-10 overflow-hidden">
                <img
                  src="https://i.pravatar.cc/100?img=12"
                  alt="user"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="w-[180px] h-[180px] rounded-full bg-[#407BFF] absolute bottom-[-60px] blur-xl opacity-20"></div>

            <div className="w-32 h-32 rounded-full bg-[#3B82F6] flex flex-col items-center justify-center text-white shadow-[0_15px_30px_rgba(59,130,246,0.4)] z-10 hover:scale-105 transition-transform cursor-pointer">
              <span className="text-3xl font-black tracking-tight">5m+</span>
              <span className="text-xs font-bold uppercase tracking-wider opacity-90 mt-1">
                Downloads
              </span>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-700 bg-white px-4 py-2 rounded-full shadow-sm z-10">
              <span
                className="material-symbols-outlined text-[#D1F34A] text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              4.6 reviews
            </div>
          </div>

          {/* Popular Listening */}
          <div
            className="md:col-span-12 lg:col-span-5 bg-[#F5F6F0] rounded-[2.5rem] p-8 shadow-sm border border-white/50 flex relative overflow-hidden group cursor-pointer min-h-[220px]"
            onClick={() => navigate("/products")}
          >
            <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm z-20 group-hover:bg-[#D1F34A] transition-colors">
              <span className="material-symbols-outlined text-sm">
                arrow_outward
              </span>
            </div>

            <div className="w-[45%] flex flex-col justify-between relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 shadow-sm w-max">
                <span
                  className="material-symbols-outlined text-[#FF3B30] text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
                Popular
              </div>

              <h3 className="text-2xl font-bold text-slate-900 leading-tight mt-6">
                {bottomPopularProduct
                  ? bottomPopularProduct.name
                  : "Listening Has Been Released"}
              </h3>

              <div className="flex -space-x-3 mt-6">
                <div className="w-10 h-10 rounded-full border-2 border-[#F5F6F0] bg-slate-200 overflow-hidden shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=100&q=80"
                    alt="sm"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-[#F5F6F0] bg-slate-900 overflow-hidden shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=100&q=80"
                    alt="sm"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="w-[60%] absolute right-[-5%] top-[-5%] h-[115%] rounded-[2.5rem] overflow-hidden">
              {bottomPopularProduct?.image ? (
                <img
                  src={getImageUrl(bottomPopularProduct.image)}
                  alt="Popular"
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80"
                  alt="Placeholder"
                  className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-700"
                />
              )}
              <div className="absolute inset-0 bg-linear-to-r from-[#F5F6F0] via-transparent to-transparent"></div>
              <div className="absolute bottom-8 right-8 text-white font-bold text-base bg-black/40 px-3 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1.5 shadow-lg">
                <span
                  className="material-symbols-outlined text-sm text-yellow-400"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  star
                </span>
                4.7
              </div>
            </div>
          </div>
        </div>

        {/* ── Third Row Grid (Extra Cards) ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-8">
          
          {/* Trending Collection */}
          <div className="md:col-span-12 lg:col-span-8 bg-[#F5F6F0] rounded-[2.5rem] p-10 shadow-sm border border-white/50 flex flex-col md:flex-row relative overflow-hidden group cursor-pointer min-h-[300px]" onClick={() => navigate("/products")}>
            <div className="w-full md:w-1/2 relative z-10 flex flex-col justify-center pr-8">
               <div className="inline-flex items-center gap-1.5 bg-black/5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-sm w-max mb-6 backdrop-blur-sm border border-black/10">
                 <span className="material-symbols-outlined text-[#3B82F6] text-sm" style={{fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
                 Trending Now
               </div>
               <h3 className="text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-4 tracking-tight">
                 {trendingProduct?.name || "Premium Quality Audio"}
               </h3>
               <p className="text-slate-500 font-medium max-w-sm">Experience the ultimate sound quality with our newest and most reviewed products.</p>
               <div className="mt-8 bg-slate-900 text-white w-max px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
                 Shop Collection <span className="material-symbols-outlined text-sm">arrow_forward</span>
               </div>
            </div>
            <div className="absolute top-0 right-[-10%] w-[60%] h-[120%] z-0 pointer-events-none md:block hidden">
               {trendingProduct?.image ? (
                 <img src={getImageUrl(trendingProduct.image)} alt="Trending" className="w-full h-full object-cover object-left opacity-95 group-hover:scale-110 transition-transform duration-700" />
               ) : (
                 <div className="w-full h-full bg-slate-200 blur-2xl opacity-60"></div>
               )}
            </div>
          </div>

          {/* Limited Product */}
          <div className="md:col-span-12 lg:col-span-4 bg-[#D1F34A] rounded-[2.5rem] p-8 shadow-sm border border-[#c4e444] relative overflow-hidden group cursor-pointer flex flex-col items-center text-center mt-auto min-h-[300px]" onClick={() => navigate("/products")}>
             <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-xs font-black tracking-widest text-[#D1F34A] shadow-sm z-20">SALE</div>
             <div className="w-[140%] h-[140%] absolute top-[-30%] rounded-full bg-white/20 blur-3xl z-0 pointer-events-none"></div>
             
             <div className="w-3/4 h-[180px] relative z-10 mt-6 mb-4">
               {limitedProduct?.image ? (
                  <img src={getImageUrl(limitedProduct.image)} alt="Special" className="w-full h-full object-contain group-hover:scale-125 transition-transform duration-700 drop-shadow-xl" />
               ) : (
                  <div className="w-full h-full bg-black/10 rounded-3xl"></div>
               )}
             </div>

             <div className="relative z-10 w-full mt-auto">
               <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">
                 {limitedProduct?.name ? limitedProduct.name.split(" ").slice(0, 3).join(" ") : "Flash Edition"}
               </h3>
               <p className="text-sm font-bold text-slate-700 mb-4 opacity-80">Limited Stock Available</p>
               <div className="w-full bg-slate-900 text-[#D1F34A] py-3 rounded-2xl font-black uppercase tracking-wider text-sm shadow-md hover:bg-slate-800 transition-colors">
                  Get it Now
               </div>
             </div>
          </div>
        </div>

      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
   *  ADMIN VIEW
   * ═══════════════════════════════════════════════════════ */
  const totalRevenue = adminOrders.reduce(
    (acc, curr) => acc + (parseFloat(curr.totalAmount) || 0),
    0
  );
  const pendingOrders = adminOrders.filter((o) => o.status === "PENDING").length;
  const lowStockProducts = products.filter((p) => p.stock < 10);

  return (
    <div className="pb-24">
      {/* Top Nav Header */}
      <header className="h-20 flex justify-between items-center sticky top-0 bg-surface/80 backdrop-blur-xl z-30 transition-all">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold tracking-tighter text-on-surface">
            Operational Overview
          </h2>
          <p className="text-xs text-outline tracking-wider uppercase font-medium">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-soft">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">
              Total Revenue
            </h3>
            <span className="material-symbols-outlined text-primary bg-primary/10 p-3 rounded-[1rem]">
              payments
            </span>
          </div>
          <p className="text-4xl font-extrabold text-on-surface tracking-tighter">
            ₹{totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-soft">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">
              Total Orders
            </h3>
            <span className="material-symbols-outlined text-tertiary bg-tertiary/10 p-3 rounded-[1rem]">
              package_2
            </span>
          </div>
          <p className="text-4xl font-extrabold text-on-surface tracking-tighter">
            {adminOrders.length}
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs font-semibold">
            <span className="text-tertiary">{pendingOrders} pending fulfillment</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-soft">
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-on-surface-variant font-bold text-sm uppercase tracking-widest">
              Inventory Alerts
            </h3>
            <span className="material-symbols-outlined text-error bg-error/10 p-3 rounded-[1rem]">
              warning
            </span>
          </div>
          <p className="text-4xl font-extrabold text-on-surface tracking-tighter">
            {lowStockProducts.length}
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs font-semibold">
            <span className="text-error">Products low on stock</span>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-[2rem] shadow-soft overflow-hidden">
          <div className="p-8 border-b border-surface-container">
            <h3 className="text-lg font-bold tracking-tight">Recent Dispatches</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50 text-on-surface-variant">
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest">Order ID</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest">Client</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest">Amount</th>
                  <th className="py-4 px-8 text-[11px] font-bold uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {adminOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="py-5 px-8 font-mono text-xs font-bold text-on-surface">
                      {order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-5 px-8 text-sm font-semibold capitalize">
                      {order.user?.name || "Unknown"}
                    </td>
                    <td className="py-5 px-8 text-sm font-bold">
                      ₹{parseFloat(order.totalAmount).toLocaleString()}
                    </td>
                    <td className="py-5 px-8">
                      <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-primary/10 text-primary">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Activity Column */}
        <div className="bg-surface-container-lowest rounded-[2rem] shadow-soft p-8">
          <h3 className="text-lg font-bold tracking-tight mb-8">Stock Depletion</h3>
          <div className="space-y-6">
            {lowStockProducts.slice(0, 4).map((product) => (
              <div key={product.id} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-[1rem] bg-surface-container flex items-center justify-center flex-shrink-0 border border-surface-container-high overflow-hidden">
                  {product.image ? (
                    <img src={getImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-outline-variant">image</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                    {product.name}
                  </h4>
                  <p className="text-xs font-mono text-outline uppercase tracking-wider mt-1">
                    {product.id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-black text-error">{product.stock}</span>
                  <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
