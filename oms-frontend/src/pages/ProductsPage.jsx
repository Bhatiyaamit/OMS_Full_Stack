import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import api from "../api/axiosInstance";
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
  description: z.string().min(2, "Description is required"),
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
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [availabilityFilters, setAvailabilityFilters] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // admin only

  // ── Debounce effect for search ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms wait after last keystroke

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── Pagination state ──
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // ── Drawer & Modal state ──
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const hasMountedRef = useRef(false);

  // ── Bulk Import state ──
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const bulkFileInputRef = useRef(null);

  const { data: productsData, isLoading } = useProducts({
    search: debouncedSearchTerm,
  });
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
    return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || ""}${image}`;
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
    setCurrentPage(1);
  };

  // ── Reset page on filter change ──
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    const frame = window.requestAnimationFrame(() => setCurrentPage(1));
    return () => window.cancelAnimationFrame(frame);
  }, [
    searchTerm,
    sortBy,
    availabilityFilters,
    minPrice,
    maxPrice,
    stockFilter,
  ]);

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
            onSuccess: () => toast.success("Product deleted"),
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

  if (isLoading && !productsData) {
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

        {/* Description */}
        <div className="group">
          <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">
            Description
          </label>
          <div className="relative mt-2">
            <textarea
              {...register("description")}
              placeholder="e.g. A premium high-performance product..."
              rows={3}
              className={`block w-full rounded-xl border-0 bg-surface-container-low py-4 px-4 text-on-surface ring-1 ring-inset placeholder:text-outline focus:bg-surface-container-highest focus:ring-1 focus:ring-inset focus:ring-primary transition-all duration-200 resize-none ${
                errors.description ? "ring-error/40" : "ring-outline-variant/15"
              }`}
            />
          </div>
          {errors.description && (
            <p className="text-error text-[11px] font-medium ml-1 mt-1">
              {errors.description.message}
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
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
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
                    className="w-16 h-16 rounded-xl object-cover shrink-0 shadow"
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
                    className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-error/10 hover:text-error transition-colors shrink-0"
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
            className="flex w-full items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-dim px-8 py-4 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
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
      <div className="flex gap-12 xl:gap-20">
        {/* ── Left Filter Sidebar ── */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 space-y-10">
            {/* Search */}
            <div>
              <h3 className="text-[11px] font-extrabold tracking-[0.15em] uppercase text-slate-800 mb-4 border-l-2 border-primary pl-2">
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
              <h3 className="text-[11px] font-extrabold tracking-[0.15em] uppercase text-slate-800 mb-4 border-l-2 border-primary pl-2">
                Price Range
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-4 text-xs focus:ring-1 focus:ring-primary"
                />
                <span className="text-outline text-xs shrink-0">—</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-4 text-xs focus:ring-1 focus:ring-primary"
                />
              </div>
              {/* Filters are now cleared via the pills under the header */}
            </div>

            {/* Availability */}
            <div>
              <h3 className="text-[11px] font-extrabold tracking-[0.15em] uppercase text-slate-800 mb-4 border-l-2 border-primary pl-2">
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
                      className="w-4 h-4 rounded-sm border-outline-variant text-primary focus:ring-primary/20 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-on-surface-variant group-hover:text-slate-900 transition-colors flex-1">
                      {label}
                    </span>
                    {count > 0 ? (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 opacity-50 px-2 py-0.5 rounded-full">
                        0
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Sort By */}
            <div>
              <h3 className="text-[11px] font-extrabold tracking-[0.15em] uppercase text-slate-800 mb-4 border-l-2 border-primary pl-2">
                Sort By
              </h3>
              <div className="space-y-3">
                {[
                  { value: "newest", label: "Newest Arrivals" },
                  { value: "price_asc", label: "Price: Low to High" },
                  { value: "price_desc", label: "Price: High to Low" },
                  { value: "name_az", label: "Name: A to Z" },
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
          <header className="mb-8 flex flex-col border-b border-slate-100 pb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 mb-1">
                  Curated Selection
                </h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.15em]">
                  Showing {displayedProducts.length} of {products.length}{" "}
                  products
                </p>
              </div>

              {/* Mobile sort + filter button */}
              <div className="flex items-center gap-3 lg:hidden">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-50 border-none rounded-full text-xs px-4 py-2 font-semibold text-slate-600 focus:ring-1 focus:ring-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price ↑</option>
                  <option value="price_desc">Price ↓</option>
                  <option value="name_az">Name A–Z</option>
                </select>
                <button className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full text-xs font-bold text-slate-600">
                  <span className="material-symbols-outlined text-sm">
                    filter_list
                  </span>
                  Filter
                </button>
              </div>
            </div>

            {/* Active Filter Pills Row */}
            {isAnyFilterActive && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">
                  Filters:
                </span>

                {searchTerm && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm("")}
                      className="hover:text-blue-900 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </button>
                  </span>
                )}

                {(minPrice || maxPrice) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    Price: ₹{minPrice || "0"} – ₹{maxPrice || "∞"}
                    <button
                      onClick={() => {
                        setMinPrice("");
                        setMaxPrice("");
                      }}
                      className="hover:text-blue-900 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </button>
                  </span>
                )}

                {availabilityFilters.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold"
                  >
                    {f === "in_stock"
                      ? "In Stock"
                      : f === "low_stock"
                        ? "Low Stock"
                        : "Out of Stock"}
                    <button
                      onClick={() => toggleAvailability(f)}
                      className="hover:text-blue-900 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </button>
                  </span>
                ))}

                {sortBy !== "newest" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    Sort:{" "}
                    {sortBy === "price_asc"
                      ? "Price Low–High"
                      : sortBy === "price_desc"
                        ? "Price High–Low"
                        : sortBy === "name_az"
                          ? "A–Z"
                          : sortBy}
                    <button
                      onClick={() => setSortBy("newest")}
                      className="hover:text-blue-900 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        close
                      </span>
                    </button>
                  </span>
                )}
              </div>
            )}
          </header>

          {displayedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-4xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-32 text-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-6">
                <span className="material-symbols-outlined text-4xl text-slate-300">
                  search_off
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">
                No products found
              </h3>
              <p className="mb-6 max-w-70 text-sm font-medium text-slate-500">
                Try adjusting your search criteria or removing some filters to
                see more results.
              </p>
              {isAnyFilterActive && (
                <button
                  onClick={clearAllFilters}
                  className="bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-x-4 gap-y-4">
                {displayedProducts
                  .slice(
                    (currentPage - 1) * ITEMS_PER_PAGE,
                    currentPage * ITEMS_PER_PAGE,
                  )
                  .map((product) => {
                    const isOutOfStock = product.stock === 0;
                    const isLowStock = product.stock > 0 && product.stock <= 10;
                    const qty = getCartQty(product.id);

                    return (
                      <div
                        key={product.id}
                        className="group relative bg-white rounded-[1.5rem] border border-slate-100 p-3 shadow-xs hover:shadow-xl transition-all duration-500 hover:-translate-y-2 flex flex-col cursor-pointer"
                        onClick={() => {
                          setSelectedProduct(product);
                          setDetailModalOpen(true);
                        }}
                      >
                        {/* Image Container */}
                        <div className="relative mb-5 aspect-4/5 overflow-hidden rounded-2xl">
                          {getImageUrl(product.image) ? (
                            <img
                              alt={product.name}
                              className={`w-full h-full object-contain scale-110 transition-transform duration-700 group-hover:scale-120 ${
                                isOutOfStock ? "grayscale opacity-80" : ""
                              }`}
                              src={getImageUrl(product.image)}
                            />
                          ) : (
                            <div
                              className={`w-full h-full flex items-center justify-center ${isOutOfStock ? "opacity-50" : ""}`}
                            >
                              <span className="material-symbols-outlined text-5xl text-slate-300">
                                image
                              </span>
                            </div>
                          )}

                          {/* Stock badge — top left */}
                          {isOutOfStock && (
                            <div className="absolute top-4 left-4 z-10">
                              <span className="bg-slate-900 text-white text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full shadow-sm">
                                Unavailable
                              </span>
                            </div>
                          )}
                          {isLowStock && (
                            <div className="absolute top-4 left-4 z-10">
                              <span className="bg-amber-400 text-white text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full shadow-sm">
                                Only {product.stock} left
                              </span>
                            </div>
                          )}

                          {/* Out of Stock overlay overlaying center */}
                          {isOutOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/40">
                              <span className="bg-white/90 backdrop-blur-sm text-slate-900 text-[11px] font-black tracking-widest uppercase px-5 py-2.5 rounded-full shadow-sm border border-slate-200/50">
                                Sold Out
                              </span>
                            </div>
                          )}

                          {/* Add to Cart / Quantity Stepper */}
                          {!isOutOfStock && (
                            <div
                              className={`hidden lg:block absolute bottom-4 inset-x-4 transition-all duration-300 ${qty > 0 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0"}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {qty > 0 ? (
                                /* Quantity stepper */
                                <div className="flex items-center justify-between bg-white/95 backdrop-blur-md rounded-full px-3 py-2 shadow-lg border border-slate-200/50">
                                  <button
                                    onClick={() =>
                                      removeFromCart(product.id, !!user)
                                    }
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shadow-inner"
                                  >
                                    <span className="material-symbols-outlined text-sm text-slate-700">
                                      remove
                                    </span>
                                  </button>
                                  <span className="text-sm font-black text-slate-900 tracking-tight">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => addToCart(product, !!user)}
                                    className="w-8 h-8 rounded-full bg-primary hover:bg-blue-700 flex items-center justify-center transition-colors shadow-inner"
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
                                    toast.success(
                                      `${product.name} added to cart`,
                                    );
                                  }}
                                  className="w-full bg-slate-900/95 text-white backdrop-blur-md rounded-full px-4 py-3.5 text-[10px] font-black tracking-widest uppercase shadow-xl hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
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
                        <div className="px-2 pb-1 flex-1 flex flex-col justify-between">
                          <div>
                            <h2 className="text-[15px] leading-tight font-bold text-slate-900 tracking-tight mb-0 line-clamp-1">
                              {product.name}
                            </h2>
                          </div>
                          <div className="mt-3">
                            <span
                              className={`text-[17px] font-black block ${isOutOfStock ? "text-slate-400" : "text-primary"}`}
                            >
                              ₹{parseFloat(product.price).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Pagination Controls */}
              {displayedProducts.length > ITEMS_PER_PAGE && (
                <div className="mt-16 mb-8 flex justify-center items-center gap-4">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((p) => p - 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 disabled:hover:bg-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      chevron_left
                    </span>
                  </button>
                  <span className="text-sm font-bold text-slate-600">
                    Page {currentPage} of{" "}
                    {Math.ceil(displayedProducts.length / ITEMS_PER_PAGE)}
                  </span>
                  <button
                    disabled={
                      currentPage ===
                      Math.ceil(displayedProducts.length / ITEMS_PER_PAGE)
                    }
                    onClick={() => {
                      setCurrentPage((p) => p + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 disabled:hover:bg-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      chevron_right
                    </span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {ProductDrawer}

        {/* Product Detail Modal */}
        <Modal
          open={detailModalOpen}
          onCancel={() => setDetailModalOpen(false)}
          footer={null}
          closeIcon={null}
          width={860}
          centered
          styles={{ body: { padding: 0 } }}
          className="!rounded-[2rem] overflow-hidden !max-w-[95vw]"
        >
          {selectedProduct && (
            <div className="flex flex-col md:flex-row max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] relative">
              {/* Close Button Absolute */}
              <button
                onClick={() => setDetailModalOpen(false)}
                className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-white shadow-md md:bg-slate-100 md:shadow-none hover:bg-slate-200 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-slate-500 text-[18px]">
                  close
                </span>
              </button>

              {/* Left — Image */}
              <div className="w-full md:w-[42%] bg-slate-50 rounded-[2rem] md:rounded-r-none flex items-center justify-center relative p-8 shrink-0 min-h-[260px] md:min-h-[480px]">
                {selectedProduct.stock === 0 && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-slate-900 text-white text-[10px] font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full">
                      Sold Out
                    </span>
                  </div>
                )}
                {selectedProduct.stock > 0 && selectedProduct.stock <= 10 && (
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-amber-400 text-amber-900 text-[10px] font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full">
                      Only {selectedProduct.stock} left
                    </span>
                  </div>
                )}
                {getImageUrl(selectedProduct.image) ? (
                  <img
                    src={getImageUrl(selectedProduct.image)}
                    alt={selectedProduct.name}
                    className="w-full h-full max-h-[280px] md:max-h-[380px] object-contain rounded-2xl transition-transform duration-500 hover:scale-105"
                  />
                ) : (
                  <span className="material-symbols-outlined text-5xl text-slate-300">
                    image
                  </span>
                )}
              </div>

              {/* Right — Details */}
              <div className="w-full md:w-[58%] p-7 md:p-10 flex flex-col">
                {/* Header */}
                <div className="mb-2 md:pr-12">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-snug tracking-tight">
                    {selectedProduct.name}
                  </h2>
                </div>

                {/* Price */}
                <p
                  className={`text-2xl md:text-3xl font-bold mb-6 ${selectedProduct.stock === 0 ? "text-slate-300" : "text-blue-600"}`}
                >
                  ₹{parseFloat(selectedProduct.price).toLocaleString()}
                </p>

                {/* Divider */}
                <div className="border-t border-slate-100 mb-5" />

                {/* Description */}
                <div className="mb-6 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-2">
                    Description
                  </p>
                  <p className="text-slate-600 text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">
                    {selectedProduct.description ||
                      "No description available for this product."}
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100 mb-5" />

                {/* Cart Controls */}
                {selectedProduct.stock > 0 ? (
                  getCartQty(selectedProduct.id) > 0 ? (
                    <div className="flex items-center justify-between bg-slate-50 rounded-full px-3 py-2 border border-slate-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(selectedProduct.id, !!user);
                        }}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-slate-700 text-[18px]">
                          remove
                        </span>
                      </button>
                      <span className="text-sm font-semibold text-slate-800 tracking-tight">
                        {getCartQty(selectedProduct.id)} in cart
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(selectedProduct, !!user);
                        }}
                        className="w-10 h-10 rounded-full bg-slate-900 hover:bg-black flex items-center justify-center transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-white text-[18px]">
                          add
                        </span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(selectedProduct, !!user);
                        toast.success(`${selectedProduct.name} added to cart`);
                      }}
                      className="w-full bg-slate-900 hover:bg-black text-white rounded-full px-6 py-4 text-sm font-semibold tracking-widest uppercase transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        shopping_cart
                      </span>
                      Add to Cart
                    </button>
                  )
                ) : (
                  <button
                    disabled
                    className="w-full bg-slate-100 text-slate-400 rounded-full px-6 py-4 text-sm font-semibold tracking-widest uppercase flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                  >
                    Out of Stock
                  </button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════
   *  ADMIN / MANAGER VIEW — Inventory table
   * ══════════════════════════════════════════════════════════ */
  return (
    <div className="pb-24">
      {/* Sticky header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between sticky top-0 bg-white/90 backdrop-blur-xl z-30 py-4 gap-4 border-b border-slate-100/50">
        <div className="flex justify-between items-center w-full md:w-auto">
          <div className="hidden md:block">
            <h2 className="text-xl md:text-2xl font-bold tracking-tighter text-slate-900">
              Inventory List
            </h2>
            <p className="text-[10px] md:text-xs text-outline tracking-wider uppercase font-medium">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => openDrawer()}
              className="md:hidden bg-primary text-on-primary px-4 py-2 rounded-full text-xs font-semibold tracking-tight hover:bg-primary-dim transition-all shadow-sm active:scale-95 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New
            </button>
          )}
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative group w-full md:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              className="pl-9 pr-4 py-2.5 bg-surface-container-low border-none rounded-full text-sm w-full md:w-48 lg:w-64 focus:ring-1 focus:ring-primary focus:bg-white transition-all"
              placeholder="Search products..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {isAdmin && (
            <>
              <button
                onClick={() => openDrawer()}
                className="hidden md:block bg-primary text-on-primary px-6 py-2.5 rounded-full text-sm font-semibold tracking-tight hover:bg-primary-dim transition-all shadow-sm active:scale-95 shrink-0"
              >
                + New Product
              </button>
              <button
                onClick={() => {
                  setBulkResult(null);
                  setBulkFile(null);
                  setBulkModalOpen(true);
                }}
                className="hidden md:flex items-center gap-1.5 border border-primary text-primary px-5 py-2.5 rounded-full text-sm font-semibold tracking-tight hover:bg-primary/5 transition-all active:scale-95 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">
                  upload_file
                </span>
                Bulk Import
              </button>
            </>
          )}
        </div>
      </header>

      {/* Filter + sort row */}
      <div className="mt-4 md:mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Stock filter pills (horizontally scrollable on mobile) */}
        <div className="flex sm:items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-2 w-max">
            {[
              { key: "all", label: "All" },
              { key: "in_stock", label: "In Stock" },
              { key: "low_stock", label: "Low Stock" },
              { key: "out_stock", label: "Out of Stock" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStockFilter(key)}
                className={`px-4 py-2 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-widest transition-all shrink-0 ${
                  stockFilter === key
                    ? "bg-primary text-on-primary shadow-sm"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort select */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-surface-container-low border-none rounded-full text-sm md:text-xs px-4 py-2 font-semibold text-on-surface-variant focus:ring-1 focus:ring-primary w-full sm:w-auto"
        >
          <option value="newest">Sort: Newest</option>
          <option value="price_asc">Price ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="stock_high">Stock ↓</option>
          <option value="name_az">Name A–Z</option>
        </select>
      </div>

      {/* Views */}
      <div className="mt-4">
        {/* ── MOBILE CARD VIEW (< md) ── */}
        <div className="md:hidden flex flex-col gap-3">
          {displayedProducts.length === 0 && (
            <div className="py-12 text-center bg-surface-container-lowest rounded-xl shadow-sm border border-slate-100">
              <span className="material-symbols-outlined text-4xl text-outline-variant block mb-2">
                inventory_2
              </span>
              <p className="text-sm text-on-surface-variant font-medium">
                No products found.
              </p>
            </div>
          )}
          {displayedProducts.map((product) => {
            const badge = getStockBadge(product.stock);
            return (
              <div
                key={product.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex gap-4"
              >
                <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-surface-container flex items-center justify-center">
                  {product.image ? (
                    <img
                      src={getImageUrl(product.image)}
                      alt={product.name}
                      className="w-full h-full object-cover shadow-inner"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-outline-variant text-[24px]">
                      image
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {product.name}
                    </h3>
                    <p className="text-[10px] font-mono text-outline uppercase mt-0.5">
                      PRD-{product.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-black text-sm text-slate-900">
                      ₹{parseFloat(product.price).toLocaleString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${badge.classes}`}
                    >
                      {product.stock} {badge.text}
                    </span>
                  </div>
                </div>
                {/* Mobile Actions Dropdown / Icons */}
                {isAdmin && (
                  <div className="flex flex-col items-center justify-start gap-2 shrink-0 border-l border-slate-100 pl-3">
                    <button
                      onClick={() => openDrawer(product)}
                      className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 hover:text-primary transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        edit
                      </span>
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="w-8 h-8 rounded-full bg-slate-50 text-slate-500 hover:text-error transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── DESKTOP/TABLET TABLE VIEW (>= md) ── */}
        <div className="hidden md:block bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-slate-100/60">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant">
                <th className="py-3 px-4 lg:py-4 lg:px-6 text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap">
                  Name
                </th>
                <th className="py-3 px-4 lg:py-4 lg:px-6 text-[10px] font-semibold uppercase tracking-widest hidden lg:table-cell">
                  SKU
                </th>
                <th className="py-3 px-4 lg:py-4 lg:px-6 text-[10px] font-semibold uppercase tracking-widest">
                  Price
                </th>
                <th className="py-3 px-4 lg:py-4 lg:px-6 text-[10px] font-semibold uppercase tracking-widest hidden sm:table-cell">
                  Stock
                </th>
                <th className="py-3 px-4 lg:py-4 lg:px-6 text-[10px] font-semibold uppercase tracking-widest">
                  Status
                </th>
                <th className="py-3 px-4 lg:py-4 lg:px-6 text-[10px] font-semibold uppercase tracking-widest text-right">
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
                    <td className="py-3 px-4 lg:py-4 lg:px-6">
                      <div className="flex items-center gap-3 lg:gap-4">
                        {product.image ? (
                          <img
                            src={getImageUrl(product.image)}
                            alt={product.name}
                            className="w-10 h-10 lg:w-12 lg:h-12 shrink-0 rounded-lg object-cover bg-surface-container shadow-inner"
                          />
                        ) : (
                          <div className="w-10 h-10 lg:w-12 lg:h-12 shrink-0 rounded-lg bg-surface-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-outline-variant text-[20px]">
                              image
                            </span>
                          </div>
                        )}
                        <p className="text-xs lg:text-sm font-semibold text-on-surface">
                          {product.name}
                          <span className="block lg:hidden text-[10px] font-mono text-outline font-normal mt-1">
                            PRD-{product.id.slice(0, 6)}
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 lg:py-4 lg:px-6 font-mono text-xs text-on-surface-variant hidden lg:table-cell">
                      PRD-{product.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 lg:py-4 lg:px-6 text-xs lg:text-sm font-medium whitespace-nowrap">
                      ₹{parseFloat(product.price).toLocaleString()}
                    </td>
                    <td
                      className={`py-3 px-4 lg:py-4 lg:px-6 text-xs lg:text-sm font-bold hidden sm:table-cell ${product.stock === 0 ? "text-error" : product.stock < 10 ? "text-amber-600" : "text-on-surface"}`}
                    >
                      {product.stock}
                    </td>
                    <td className="py-3 px-4 lg:py-4 lg:px-6">
                      <span
                        className={`px-2 lg:px-2.5 py-1 rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${badge.classes}`}
                      >
                        {badge.text}
                      </span>
                    </td>
                    <td className="py-3 px-4 lg:py-4 lg:px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openDrawer(product)}
                              className="p-1.5 lg:p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[16px] lg:text-[18px]">
                                edit
                              </span>
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-1.5 lg:p-2 rounded-lg text-slate-400 hover:text-error hover:bg-error/5 transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[16px] lg:text-[18px]">
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

      {/* ══ Bulk Import Modal ══════════════════════════════ */}
      <Modal
        open={bulkModalOpen}
        onCancel={() => {
          if (!bulkUploading) {
            setBulkModalOpen(false);
            setBulkFile(null);
            setBulkResult(null);
          }
        }}
        footer={null}
        title={null}
        centered
        width={480}
        closeIcon={null}
        styles={{
          content: {
            borderRadius: "20px",
            padding: "2rem 2rem 1.75rem",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--outline-variant)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          },
          body: { padding: 0 },
        }}
        maskClosable={!bulkUploading}
        closable={!bulkUploading}
        className="app-theme-modal"
      >
        <div className="bg-surface text-on-surface">
          {/* Header */}
          <div className="flex justify-between items-start mb-7">
            <div className="flex items-center gap-[14px]">
              <div className="w-[42px] h-[42px] rounded-[10px] bg-surface-container-low border border-outline-variant/30 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
                  upload_file
                </span>
              </div>
              <div>
                <p className="text-[16px] font-semibold text-on-surface leading-tight">
                  Bulk import products
                </p>
                <p className="text-[13px] text-on-surface-variant mt-[3px]">
                  Upload a ZIP with your spreadsheet & images
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!bulkUploading) {
                  setBulkModalOpen(false);
                  setBulkFile(null);
                  setBulkResult(null);
                }
              }}
              className="bg-transparent border-none cursor-pointer text-on-surface-variant p-1 rounded-[6px] flex items-center transition-colors hover:bg-surface-container"
            ></button>
          </div>

          {/* Result View or Upload View */}
          {bulkResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-[10px]">
                <div className="bg-primary/10 border border-primary/20 rounded-[10px] p-4 text-center">
                  <p className="text-2xl font-black text-primary">
                    {bulkResult.imported}
                  </p>
                  <p className="text-[12px] font-semibold text-primary mt-1">
                    Products Imported
                  </p>
                </div>
                <div className="bg-transparent border border-outline-variant/40 rounded-[10px] p-4 text-center">
                  <p className="text-2xl font-black text-on-surface-variant">
                    {bulkResult.skipped}
                  </p>
                  <p className="text-[12px] font-semibold text-on-surface-variant mt-1">
                    Skipped / Errors
                  </p>
                </div>
              </div>
              {bulkResult.errors?.length > 0 && (
                <div className="bg-error/10 border border-error/20 rounded-[10px] p-4 max-h-40 overflow-y-auto">
                  <p className="text-[12px] font-bold text-error mb-2">
                    Row Errors
                  </p>
                  {bulkResult.errors.map((e, i) => (
                    <p
                      key={i}
                      className="text-[12px] text-error font-mono tracking-tight leading-tight mb-1"
                    >
                      Row {e.row}: {e.reason}
                    </p>
                  ))}
                </div>
              )}
              <div className="pt-2">
                <button
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkFile(null);
                    setBulkResult(null);
                  }}
                  className="w-full p-[11px] rounded-[10px] border-none bg-primary text-[14px] font-medium text-on-primary hover:bg-primary-dim transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Section Card */}
              <div className="bg-surface-container-low/50 rounded-[14px] p-5 mb-5 border border-outline-variant/30">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[11px] font-semibold tracking-[0.07em] text-on-surface-variant uppercase m-0 leading-none">
                    ZIP structure
                  </p>
                  <a
                    href="/sample_products.zip"
                    download="sample_products.zip"
                    className="text-[12px] text-primary bg-transparent border-none cursor-pointer font-medium flex items-center gap-[4px] p-0 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      download
                    </span>
                    Sample ZIP
                  </a>
                </div>

                <div className="bg-surface rounded-[10px] py-[14px] px-4 border border-outline-variant/20">
                  {/* XLSX Row */}
                  <div className="flex items-center gap-2.5 py-1">
                    <div className="w-[28px] h-[32px] shrink-0 bg-primary/20 border border-primary/40 rounded flex flex-col pt-[3px] items-center relative">
                      <div className="w-full h-[6px] bg-primary/60 border-b border-primary/20 absolute top-0 rounded-t left-0"></div>
                      <span className="text-[7px] font-extrabold text-primary mt-[10px]">
                        XLSX
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-on-surface leading-tight">
                        products.xlsx
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-[2px] leading-tight">
                        Spreadsheet with product data
                      </p>
                    </div>
                  </div>

                  {/* ZIP Row */}
                  <div className="flex items-center gap-2.5 py-1 mt-2 pt-2 border-t border-outline-variant/10">
                    <div className="w-[28px] h-[32px] shrink-0 bg-surface-container border border-outline-variant/40 rounded flex flex-col justify-center items-center">
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                        folder_zip
                      </span>
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-on-surface leading-tight">
                        images/
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-[2px] leading-tight">
                        laptop.jpg · phone.png · …
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[11px] font-semibold tracking-[0.07em] text-on-surface-variant uppercase m-0 mb-3 leading-none">
                    Required columns
                  </p>
                  <div className="flex gap-[6px] flex-wrap">
                    <span className="text-[12px] px-2.5 py-1 rounded-[6px] font-medium bg-primary/10 text-primary border border-primary/20">
                      name
                    </span>
                    <span className="text-[12px] px-2.5 py-1 rounded-[6px] font-medium bg-primary/10 text-primary border border-primary/20">
                      description
                    </span>
                    <span className="text-[12px] px-2.5 py-1 rounded-[6px] font-medium bg-primary/10 text-primary border border-primary/20">
                      price
                    </span>
                    <span className="text-[12px] px-2.5 py-1 rounded-[6px] font-medium bg-primary/10 text-primary border border-primary/20">
                      stock
                    </span>
                    <span className="text-[12px] px-2.5 py-1 rounded-[6px] font-medium bg-surface-container-low text-on-surface-variant border border-outline-variant/30">
                      image
                    </span>
                  </div>
                </div>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => bulkFileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.add(
                    "!border-primary",
                    "!bg-primary/5",
                  );
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove(
                    "!border-primary",
                    "!bg-primary/5",
                  );
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.classList.remove(
                    "!border-primary",
                    "!bg-primary/5",
                  );
                  const dropped = e.dataTransfer.files[0];
                  if (
                    dropped &&
                    (dropped.name.endsWith(".zip") ||
                      dropped.type.includes("zip"))
                  ) {
                    setBulkFile(dropped);
                  } else {
                    toast.error("Please drop a valid .zip file");
                  }
                }}
                className={`border-[1.5px] border-dashed rounded-[14px] py-8 px-6 text-center cursor-pointer transition-colors ${
                  bulkFile
                    ? "bg-primary/5 border-primary"
                    : "border-outline-variant hover:bg-surface-container-low hover:border-primary/50"
                }`}
              >
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".zip,application/zip,application/x-zip,application/x-zip-compressed,application/octet-stream"
                  className="hidden"
                  onChange={(e) => setBulkFile(e.target.files[0] || null)}
                />

                <span className="material-symbols-outlined text-[28px] text-on-surface-variant mb-2.5 block">
                  {bulkFile ? "folder_zip" : "cloud_upload"}
                </span>

                {bulkFile ? (
                  <p className="text-[14px] font-medium text-primary m-0 leading-tight">
                    {bulkFile.name}
                  </p>
                ) : (
                  <>
                    <p className="text-[14px] font-medium text-on-surface mb-1 leading-tight">
                      Drag & drop your ZIP file
                    </p>
                    <p className="text-[12px] text-on-surface-variant m-0 leading-tight">
                      or{" "}
                      <span className="text-primary hover:underline">
                        browse to upload
                      </span>{" "}
                      &nbsp;·&nbsp; max 50 MB
                    </p>
                  </>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-[10px] mt-5">
                <button
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkFile(null);
                  }}
                  disabled={bulkUploading}
                  className="flex-1 p-[11px] rounded-[10px] border border-outline-variant/40 bg-transparent text-[14px] font-medium text-on-surface-variant cursor-pointer hover:bg-surface-container-low hover:text-on-surface transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  disabled={!bulkFile || bulkUploading}
                  onClick={async () => {
                    if (!bulkFile) return;
                    setBulkUploading(true);
                    try {
                      const formData = new FormData();
                      formData.append("zipFile", bulkFile);
                      const res = await api.post(
                        "/products/bulk-import",
                        formData,
                        {
                          headers: { "Content-Type": "multipart/form-data" },
                        },
                      );
                      setBulkResult(res.data);
                    } catch (err) {
                      toast.error(err?.message || "Bulk import failed");
                    } finally {
                      setBulkUploading(false);
                    }
                  }}
                  className="flex-[2] p-[11px] rounded-[10px] border-none bg-primary text-[14px] font-medium text-on-primary cursor-pointer hover:bg-primary-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {bulkUploading ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">
                        progress_activity
                      </span>
                      Importing...
                    </>
                  ) : (
                    "Import products"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProductsPage;
