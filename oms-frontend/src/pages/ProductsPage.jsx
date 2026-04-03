import { useState, useMemo, useCallback, useRef } from "react";
import {
  useProducts,
  useDeleteProduct,
  useCreateProduct,
  useUpdateProduct,
} from "../hooks/useProducts";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";
import { Modal, Drawer, Spin } from "antd";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  price: z.coerce.number().positive("Price must be positive"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
});

const ProductsPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";
  const isAdminOrManager = isAdmin || isManager;
  // Guests (user === null) and CUSTOMER both see the shopping view
  const isCustomer = user?.role === "CUSTOMER";
  const cartItems = useCartStore((s) => s.items);
  const addToCart = useCartStore((s) => s.addItem);
  const removeFromCart = useCartStore((s) => s.removeItem);

  // ── Filter / sort state ──
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [availabilityFilters, setAvailabilityFilters] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // admin only

  // ── Drawer state ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const { data: productsData, isLoading } = useProducts({ search: searchTerm });
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutate: createProduct, isPending: creating } = useCreateProduct();
  const { mutate: updateProduct, isPending: updating } = useUpdateProduct();

  const products = useMemo(() => productsData?.data || [], [productsData]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(productSchema),
  });

  // ── Keep exactly as is ──
  const getImageUrl = (image) => {
    if (!image) return null;
    if (image.startsWith("http")) return image;
    return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
  };

  // ── Derived: displayed products (filter + sort) ──
  const displayedProducts = useMemo(() => {
    let result = [...products];

    // 1. Availability filter (customer) or stock filter (admin)
    if (isCustomer && availabilityFilters.length > 0) {
      result = result.filter((p) => {
        return availabilityFilters.some((f) => {
          if (f === "in_stock") return p.stock > 10;
          if (f === "low_stock") return p.stock > 0 && p.stock <= 10;
          if (f === "out_stock") return p.stock === 0;
          return true;
        });
      });
    }
    if (isAdminOrManager && stockFilter !== "all") {
      result = result.filter((p) => {
        if (stockFilter === "in_stock") return p.stock > 10;
        if (stockFilter === "low_stock") return p.stock > 0 && p.stock <= 10;
        if (stockFilter === "out_stock") return p.stock === 0;
        return true;
      });
    }

    // 2. Price range filter
    const min = minPrice !== "" ? parseFloat(minPrice) : null;
    const max = maxPrice !== "" ? parseFloat(maxPrice) : null;
    if (min !== null) result = result.filter((p) => parseFloat(p.price) >= min);
    if (max !== null) result = result.filter((p) => parseFloat(p.price) <= max);

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === "price_asc")
        return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "price_desc")
        return parseFloat(b.price) - parseFloat(a.price);
      if (sortBy === "name_az") return a.name.localeCompare(b.name);
      if (sortBy === "stock_high") return b.stock - a.stock;
      // newest (default)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return result;
  }, [
    products,
    availabilityFilters,
    minPrice,
    maxPrice,
    sortBy,
    stockFilter,
    isCustomer,
    isAdminOrManager,
  ]);

  // ── Availability counts (from full unfiltered array) ──
  const availabilityCounts = useMemo(
    () => ({
      in_stock: products.filter((p) => p.stock > 10).length,
      low_stock: products.filter((p) => p.stock > 0 && p.stock <= 10).length,
      out_stock: products.filter((p) => p.stock === 0).length,
    }),
    [products],
  );

  // ── Admin stock summary (from full array) ──
  const adminSummary = useMemo(
    () => ({
      inStock: products.filter((p) => p.stock > 10).length,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 10).length,
      outStock: products.filter((p) => p.stock === 0).length,
    }),
    [products],
  );

  // ── Filter active check ──
  const isAnyFilterActive =
    searchTerm ||
    sortBy !== "newest" ||
    availabilityFilters.length > 0 ||
    minPrice ||
    maxPrice;

  const clearAllFilters = () => {
    setSearchTerm("");
    setSortBy("newest");
    setAvailabilityFilters([]);
    setMinPrice("");
    setMaxPrice("");
    setStockFilter("all");
  };

  // ── Availability checkbox toggle ──
  const toggleAvailability = (key) => {
    setAvailabilityFilters((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key],
    );
  };

  // ── Cart helpers ──
  const getCartQty = (productId) => {
    const item = cartItems?.find((i) => i.id === productId);
    return item?.quantity || 0;
  };

  // ── Image drop zone ──
  const handleImageFile = (file) => {
    setImageError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Only image files are allowed (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("File must be under 5MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Drawer open/close ──
  const openDrawer = (product = null) => {
    setEditingProduct(product);
    setImageFile(null);
    setImagePreview(null);
    setImageError("");
    if (product) {
      reset({ name: product.name, price: product.price, stock: product.stock });
    } else {
      reset({ name: "", price: "", stock: "" });
    }
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setImageError("");
    reset();
  };

  // ── Form submit ──
  const onFormSubmit = (data) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("price", data.price);
    formData.append("stock", data.stock);
    if (imageFile) formData.append("image", imageFile);

    if (editingProduct) {
      updateProduct(
        { id: editingProduct.id, data: formData },
        {
          onSuccess: () => {
            toast.success("Product updated");
            closeDrawer();
          },
        },
      );
    } else {
      createProduct(formData, {
        onSuccess: () => {
          toast.success("Product created");
          closeDrawer();
        },
      });
    }
  };

  // ── Delete ──
  const handleDelete = useCallback(
    (id) => {
      Modal.confirm({
        title: "Delete Product",
        content: "Are you sure you want to permanently remove this item?",
        okText: "Yes, Delete",
        okType: "danger",
        cancelText: "No",
        onOk: () => {
          deleteProduct(id, {
            onSuccess: () =>
              toast.success("Product deleted"),
          });
        },
      });
    },
    [deleteProduct],
  );

  // ── Stock badge ──
  const getStockBadge = (stock) => {
    if (stock === 0)
      return { text: "Out of Stock", classes: "bg-slate-200 text-slate-600" };
    if (stock < 10)
      return { text: "Low Stock", classes: "bg-amber-100 text-amber-700" };
    return { text: "In Stock", classes: "bg-emerald-100 text-emerald-700" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
   *  SHARED: Drawer (Add / Edit Product)
   * ══════════════════════════════════════════════════════════ */
  const ProductDrawer = (
    <Drawer
      title={editingProduct ? "Edit Product" : "New Product"}
      placement="right"
      onClose={closeDrawer}
      open={drawerOpen}
      size="large"
      className="font-inter"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Name */}
        <div className="group">
          <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">
            Product Name
          </label>
          <div className="relative mt-2">
            <input
              {...register("name")}
              placeholder="e.g. Luxe Chronograph"
              className={`block w-full rounded-xl border-0 bg-surface-container-low py-4 px-4 text-on-surface ring-1 ring-inset placeholder:text-outline focus:bg-surface-container-highest focus:ring-1 focus:ring-inset focus:ring-primary transition-all duration-200 ${
                errors.name ? "ring-error/40" : "ring-outline-variant/15"
              }`}
            />
          </div>
          {errors.name && (
            <p className="text-error text-[11px] font-medium ml-1 mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Price + Stock */}
        <div className="grid grid-cols-2 gap-6">
          <div className="group">
            <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">
              Price (₹)
            </label>
            <div className="relative mt-2">
              <input
                {...register("price")}
                type="number"
                step="0.01"
                placeholder="249.00"
                className={`block w-full rounded-xl border-0 bg-surface-container-low py-4 px-4 text-on-surface ring-1 ring-inset placeholder:text-outline focus:bg-surface-container-highest focus:ring-1 focus:ring-inset focus:ring-primary transition-all duration-200 ${
                  errors.price ? "ring-error/40" : "ring-outline-variant/15"
                }`}
              />
            </div>
            {errors.price && (
              <p className="text-error text-[11px] font-medium ml-1 mt-1">
                {errors.price.message}
              </p>
            )}
          </div>
          <div className="group">
            <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">
              Stock
            </label>
            <div className="relative mt-2">
              <input
                {...register("stock")}
                type="number"
                placeholder="100"
                className={`block w-full rounded-xl border-0 bg-surface-container-low py-4 px-4 text-on-surface ring-1 ring-inset placeholder:text-outline focus:bg-surface-container-highest focus:ring-1 focus:ring-inset focus:ring-primary transition-all duration-200 ${
                  errors.stock ? "ring-error/40" : "ring-outline-variant/15"
                }`}
              />
            </div>
            {errors.stock && (
              <p className="text-error text-[11px] font-medium ml-1 mt-1">
                {errors.stock.message}
              </p>
            )}
          </div>
        </div>

        {/* Image drop zone */}
        <div className="group">
          <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">
            Product Image
          </label>
          <div className="mt-2">
            {/* Existing image (edit mode, no new file selected) */}
            {editingProduct?.image && !imagePreview && (
              <div className="flex items-center gap-3 mb-3 p-3 bg-surface-container-low rounded-xl">
                <img
                  src={getImageUrl(editingProduct.image)}
                  alt="Current"
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                  Current image — upload new to replace
                </p>
              </div>
            )}

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl h-40 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-outline-variant/40 bg-surface-container-low hover:border-outline-variant hover:bg-surface-container"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="flex items-center gap-4 px-6 w-full">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0 shadow"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {imageFile?.name}
                    </p>
                    <p className="text-xs text-outline mt-0.5">
                      {(imageFile?.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-error/10 hover:text-error transition-colors flex-shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">
                      close
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  <span
                    className="material-symbols-outlined text-outline-variant mb-2"
                    style={{ fontSize: "32px" }}
                  >
                    upload_file
                  </span>
                  <p className="text-sm text-outline font-medium">
                    Click to upload or drag &amp; drop
                  </p>
                  <p className="text-xs text-outline-variant mt-1">
                    PNG, JPG, WebP · Max 5MB
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageFile(e.target.files[0])}
              />
            </div>

            {imageError && (
              <p className="text-error text-[11px] font-medium ml-1 mt-1">
                {imageError}
              </p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={creating || updating}
            className="flex w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dim px-8 py-4 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {creating || updating
              ? "Saving..."
              : editingProduct
                ? "Update Product"
                : "Create Product"}
          </button>
        </div>
      </form>
    </Drawer>
  );

  /* ══════════════════════════════════════════════════════════
   *  CUSTOMER VIEW — Stitch "Browse Products" card grid
   * ══════════════════════════════════════════════════════════ */
  // Guests (user === null) and CUSTOMER both get the shopping/browsing view.
  // Only ADMIN and MANAGER see the inventory management view.
  if (!isAdminOrManager) {
    return (
      <div className="flex gap-10 xl:gap-16">
        {/* ── Left Filter Sidebar ── */}
        <aside className="w-60 xl:w-64 flex-shrink-0 hidden lg:block">
          <div className="sticky top-32 space-y-10">
            {/* Search */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-outline mb-4">
                Search
              </h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
                  search
                </span>
                <input
                  className="w-full bg-surface-container-low border-none rounded-full py-2.5 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary"
                  placeholder="Search catalog..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-outline mb-4">
                Price Range
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs focus:ring-1 focus:ring-primary"
                />
                <span className="text-outline text-xs flex-shrink-0">—</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-xl py-2.5 px-3 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>
              {(minPrice || maxPrice) && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    ₹{minPrice || "0"} – ₹{maxPrice || "∞"}
                  </span>
                  <button
                    onClick={() => {
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="text-outline hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      close
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Availability */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-outline mb-4">
                Availability
              </h3>
              <div className="space-y-3">
                {[
                  {
                    key: "in_stock",
                    label: "In Stock",
                    count: availabilityCounts.in_stock,
                  },
                  {
                    key: "low_stock",
                    label: "Low Stock",
                    count: availabilityCounts.low_stock,
                  },
                  {
                    key: "out_stock",
                    label: "Out of Stock",
                    count: availabilityCounts.out_stock,
                  },
                ].map(({ key, label, count }) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={availabilityFilters.includes(key)}
                      onChange={() => toggleAvailability(key)}
                      className="w-4 h-4 rounded-sm border-outline-variant text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors flex-1">
                      {label}
                    </span>
                    <span className="text-[10px] font-bold text-outline bg-surface-container px-2 py-0.5 rounded-full">
                      {count}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-outline mb-4">
                Sort By
              </h3>
              <div className="space-y-3">
                {[
                  { value: "newest", label: "Newest Arrivals" },
                  { value: "price_asc", label: "Price: Low to High" },
                  { value: "price_desc", label: "Price: High to Low" },
                  { value: "name_az", label: "Name: A to Z" },
                  { value: "stock_high", label: "Stock: High to Low" },
                ].map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="radio"
                      name="sort"
                      value={value}
                      checked={sortBy === value}
                      onChange={() => setSortBy(value)}
                      className="w-4 h-4 border-outline-variant text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear All */}
            {isAnyFilterActive && (
              <button
                onClick={clearAllFilters}
                className="text-primary text-xs font-bold uppercase tracking-widest hover:underline"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </aside>

        {/* ── Product Grid Content ── */}
        <section className="flex-1 w-full min-w-0">
          <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-surface-container pb-6 gap-4">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-1">
                Curated Selection
              </h1>
              <p className="text-sm font-bold text-outline uppercase tracking-[0.15em]">
                Showing {displayedProducts.length} of {products.length} products
              </p>
            </div>

            {/* Mobile sort + filter button */}
            <div className="flex items-center gap-3 lg:hidden">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-surface-container-low border-none rounded-full text-xs px-4 py-2 font-semibold text-on-surface-variant focus:ring-1 focus:ring-primary"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
                <option value="name_az">Name A–Z</option>
                <option value="stock_high">Stock ↓</option>
              </select>
              <button className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full text-xs font-bold text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">
                  filter_list
                </span>
                Filter
              </button>
            </div>
          </header>

          {displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-6xl text-outline-variant mb-6">
                inventory_2
              </span>
              <h3 className="text-xl font-semibold text-on-surface mb-2">
                No products found
              </h3>
              <p className="text-on-surface-variant text-sm mb-4">
                Try adjusting your search or filters.
              </p>
              {isAnyFilterActive && (
                <button
                  onClick={clearAllFilters}
                  className="text-primary text-xs font-bold uppercase tracking-widest hover:underline"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-12">
              {displayedProducts.map((product) => {
                const isOutOfStock = product.stock === 0;
                const isLowStock = product.stock > 0 && product.stock <= 10;
                const qty = getCartQty(product.id);

                return (
                  <div key={product.id} className="group">
                    {/* Image Container */}
                    <div className="aspect-[4/5] bg-surface-container-low overflow-hidden rounded-[2rem] mb-5 relative shadow-soft group-hover:shadow-soft-hover transition-all duration-500">
                      {getImageUrl(product.image) ? (
                        <img
                          alt={product.name}
                          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                            isOutOfStock ? "grayscale opacity-50" : ""
                          }`}
                          src={getImageUrl(product.image)}
                        />
                      ) : (
                        <div
                          className={`w-full h-full flex items-center justify-center ${isOutOfStock ? "opacity-50" : ""}`}
                        >
                          <span className="material-symbols-outlined text-5xl text-outline-variant">
                            image
                          </span>
                        </div>
                      )}

                      {/* Stock badge — top left */}
                      {isOutOfStock && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-white/90 backdrop-blur-sm text-slate-600 text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full border border-slate-200/60 shadow-sm">
                            Unavailable
                          </span>
                        </div>
                      )}
                      {isLowStock && (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="bg-amber-400 text-white text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full shadow-sm">
                            Only {product.stock} left
                          </span>
                        </div>
                      )}

                      {/* Out of Stock overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="bg-white/90 backdrop-blur-sm text-on-surface text-[10px] font-bold tracking-widest uppercase px-4 py-2 rounded-full border border-outline-variant/20">
                            Unavailable
                          </span>
                        </div>
                      )}

                      {/* Add to Cart / Quantity Stepper */}
                      {!isOutOfStock && (
                        <div className="absolute bottom-4 inset-x-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                          {qty > 0 ? (
                            /* Quantity stepper */
                            <div className="flex items-center justify-between bg-white/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-outline-variant/10">
                              <button
                                onClick={() => removeFromCart(product.id, !!user)}
                                className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm text-on-surface">
                                  remove
                                </span>
                              </button>
                              <span className="text-sm font-black text-on-surface tracking-tight">
                                {qty}
                              </span>
                              <button
                                onClick={() => addToCart(product, !!user)}
                                className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-700 flex items-center justify-center transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm text-white">
                                  add
                                </span>
                              </button>
                            </div>
                          ) : (
                            /* Add to Cart */
                            <button
                              onClick={() => {
                                addToCart(product, !!user);
                                toast.success(`${product.name} added to cart`);
                              }}
                              className="w-full bg-slate-900 text-white backdrop-blur-md rounded-full px-4 py-3 text-[10px] font-bold tracking-widest uppercase shadow-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-sm">
                                shopping_cart
                              </span>
                              Add to Cart
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex justify-between items-start px-1">
                      <div className="flex-1 min-w-0 pr-3">
                        <h2 className="text-sm font-semibold text-on-surface tracking-tight mb-0.5 truncate">
                          {product.name}
                        </h2>
                        <p className="text-xs text-on-surface-variant tracking-widest uppercase">
                          {product.stock > 10
                            ? "In Stock"
                            : product.stock > 0
                              ? `${product.stock} left`
                              : "Out of Stock"}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold flex-shrink-0 ${isOutOfStock ? "text-outline-variant" : "text-on-surface"}`}
                      >
                        ₹{parseFloat(product.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {ProductDrawer}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
   *  ADMIN / MANAGER VIEW — Inventory table
   * ══════════════════════════════════════════════════════════ */
  return (
    <div className="pb-24">
      {/* Sticky header */}
      <header className="h-20 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-xl z-30 mt-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tighter text-slate-900">
            Inventory List
          </h2>
          <p className="text-xs text-outline tracking-wider uppercase font-medium">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              className="pl-9 pr-4 py-2.5 bg-surface-container-low border-none rounded-full text-sm w-64 focus:ring-1 focus:ring-primary focus:bg-white transition-all"
              placeholder="Search products..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button
              onClick={() => openDrawer()}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-full text-sm font-semibold tracking-tight hover:bg-primary-dim transition-all shadow-sm active:scale-95"
            >
              + New Product
            </button>
          )}
        </div>
      </header>

      {/* Filter + sort row */}
      <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
        {/* Stock filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "All" },
            { key: "in_stock", label: "In Stock" },
            { key: "low_stock", label: "Low Stock" },
            { key: "out_stock", label: "Out of Stock" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStockFilter(key)}
              className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-all ${
                stockFilter === key
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Sort select */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-surface-container-low border-none rounded-full text-xs px-4 py-2 font-semibold text-on-surface-variant focus:ring-1 focus:ring-primary"
        >
          <option value="newest">Sort: Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="stock_high">Stock ↓</option>
          <option value="name_az">Name A–Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="mt-4">
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant">
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">
                  Name
                </th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">
                  SKU
                </th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">
                  Price
                </th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">
                  Stock
                </th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">
                  Status
                </th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {displayedProducts.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-on-surface-variant text-sm"
                  >
                    <span className="material-symbols-outlined text-4xl text-outline-variant block mb-4">
                      inventory_2
                    </span>
                    No products found.{" "}
                    {isAdmin && 'Click "+ New Product" to add one.'}
                  </td>
                </tr>
              )}
              {displayedProducts.map((product) => {
                const badge = getStockBadge(product.stock);
                return (
                  <tr
                    key={product.id}
                    className="hover:bg-surface-container-low/50 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover bg-surface-container shadow-inner"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-outline-variant">
                              image
                            </span>
                          </div>
                        )}
                        <p className="text-sm font-semibold text-on-surface">
                          {product.name}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-on-surface-variant">
                      PRD-{product.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium">
                      ₹{parseFloat(product.price).toLocaleString()}
                    </td>
                    <td
                      className={`py-4 px-6 text-sm font-bold ${product.stock === 0 ? "text-error" : product.stock < 10 ? "text-amber-600" : "text-on-surface"}`}
                    >
                      {product.stock}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.classes}`}
                      >
                        {badge.text}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openDrawer(product)}
                              className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 rounded-lg text-slate-400 hover:text-error hover:bg-error/5 transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                delete
                              </span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary row */}
        <div className="mt-4 px-2 text-xs text-slate-400 font-medium flex flex-wrap gap-3">
          <span>
            Showing {displayedProducts.length} of {products.length} products
          </span>
          <span>·</span>
          <span>{adminSummary.inStock} in stock</span>
          <span>·</span>
          <span className="text-amber-500">
            {adminSummary.lowStock} low stock
          </span>
          <span>·</span>
          <span className="text-error">
            {adminSummary.outStock} out of stock
          </span>
        </div>
      </div>

      {ProductDrawer}
    </div>
  );
};

export default ProductsPage;
