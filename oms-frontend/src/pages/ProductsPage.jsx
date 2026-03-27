import { useState, useMemo, useCallback } from "react";
import { useProducts, useDeleteProduct, useCreateProduct, useUpdateProduct } from "../hooks/useProducts";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";
import { Modal, notification, Drawer, Spin } from "antd";
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
  const isCustomer = user?.role === "CUSTOMER";
  const addToCart = useCartStore((s) => s.addItem);

  const [searchTerm, setSearchTerm] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const { data: productsData, isLoading } = useProducts({ search: searchTerm });
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutate: createProduct, isPending: creating } = useCreateProduct();
  const { mutate: updateProduct, isPending: updating } = useUpdateProduct();

  const fallbackData = useMemo(() => [], []);
  const products = productsData?.data || fallbackData;

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
  });

  const getImageUrl = (image) => {
    if (!image) return null;
    // Cloudinary URLs are already absolute — use as-is
    if (image.startsWith("http")) return image;
    // Local uploads need the backend base prepended
    return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
  };

  const openDrawer = (product = null) => {
    setEditingProduct(product);
    setImageFile(null);
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
    reset();
  };

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
            notification.success({ message: "Product updated" });
            closeDrawer();
          },
        }
      );
    } else {
      createProduct(formData, {
        onSuccess: () => {
          notification.success({ message: "Product created" });
          closeDrawer();
        },
      });
    }
  };

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
            onSuccess: () => notification.success({ message: "Product deleted" }),
          });
        },
      });
    },
    [deleteProduct]
  );

  const getStockBadge = (stock) => {
    if (stock === 0) return { text: "Out of Stock", classes: "bg-slate-200 text-slate-600" };
    if (stock < 10) return { text: "Low Stock", classes: "bg-amber-100 text-amber-700" };
    return { text: "In Stock", classes: "bg-emerald-100 text-emerald-700" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
   *  CUSTOMER VIEW — Stitch "Browse Products" card grid
   * ═══════════════════════════════════════════════════════ */
  if (isCustomer) {
    return (
      <div className="flex gap-16">
        {/* ── Left Filter Column ── */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="sticky top-32 space-y-12">
            {/* Search */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-outline mb-6">
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

            {/* Availability */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-outline mb-6">
                Availability
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    defaultChecked
                    className="w-4 h-4 rounded-sm border-outline-variant text-primary focus:ring-primary/20"
                    type="checkbox"
                  />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                    In Stock
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="w-4 h-4 rounded-sm border-outline-variant text-primary focus:ring-primary/20"
                    type="checkbox"
                  />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                    Low Stock
                  </span>
                </label>
              </div>
            </div>

            {/* Sort By */}
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.15em] uppercase text-outline mb-6">
                Sort By
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    defaultChecked
                    className="w-4 h-4 border-outline-variant text-primary focus:ring-primary/20"
                    name="sort"
                    type="radio"
                  />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                    Newest Arrivals
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="w-4 h-4 border-outline-variant text-primary focus:ring-primary/20"
                    name="sort"
                    type="radio"
                  />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                    Price: Low to High
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    className="w-4 h-4 border-outline-variant text-primary focus:ring-primary/20"
                    name="sort"
                    type="radio"
                  />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-on-surface transition-colors">
                    Price: High to Low
                  </span>
                </label>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Product Grid Content ── */}
        <section className="flex-1 w-full">
          <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-surface-container pb-6 gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
                Curated Selection
              </h1>
              <p className="text-sm font-bold text-outline uppercase tracking-[0.2em]">
                {products.length} Items Available
              </p>
            </div>
            
            <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-full shadow-inner lg:hidden">
                <span className="material-symbols-outlined text-outline p-2">filter_list</span>
            </div>
          </header>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <span className="material-symbols-outlined text-6xl text-outline-variant mb-6">
                inventory_2
              </span>
              <h3 className="text-xl font-semibold text-on-surface mb-2">No products found</h3>
              <p className="text-on-surface-variant text-sm">
                Try adjusting your search or filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-16">
              {products.map((product) => {
                const isOutOfStock = product.stock === 0;
                return (
                  <div key={product.id} className="group">
                    {/* Image Container */}
                    <div className="aspect-4/5 bg-surface-container-low overflow-hidden rounded-[2rem] mb-6 relative shadow-soft group-hover:shadow-soft-hover transition-all duration-500">
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
                          className={`w-full h-full flex items-center justify-center ${
                            isOutOfStock ? "opacity-50" : ""
                          }`}
                        >
                          <span className="material-symbols-outlined text-5xl text-outline-variant">
                            image
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

                      {/* Add to Cart hover button */}
                      {!isOutOfStock && (
                        <div className="absolute bottom-4 right-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                          <button
                            onClick={() => {
                              addToCart(product);
                              notification.success({ message: `${product.name} added to cart` });
                            }}
                            className="gradient-primary rounded-full px-6 py-3 text-[10px] font-bold tracking-widest uppercase shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-sm">shopping_cart</span>
                            Add to Cart
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-sm font-medium text-on-surface tracking-tight mb-1">
                          {product.name}
                        </h2>
                        <p className="text-xs text-on-surface-variant tracking-widest uppercase">
                          {product.stock > 0 ? `${product.stock} in stock` : "Out of Stock"}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          isOutOfStock ? "text-outline-variant" : "text-on-surface"
                        }`}
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
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
   *  ADMIN VIEW — Stitch "Inventory List" table
   * ═══════════════════════════════════════════════════════ */
  return (
    <div className="pb-24">
      {/* Top Nav Header */}
      <header className="h-20 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-xl z-30 transition-all mt-2">
        <div>
          <h2 className="text-2xl font-medium tracking-tighter text-slate-900">Inventory List</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
              search
            </span>
            <input
              className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full text-sm w-64 focus:ring-1 focus:ring-primary focus:bg-white transition-all"
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

      {/* Product Table */}
      <div className="mt-8">
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant">
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">Name</th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">SKU</th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">Price</th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">Stock</th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-[10px] font-semibold uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-on-surface-variant text-sm">
                    <span className="material-symbols-outlined text-4xl text-outline-variant block mb-4">inventory_2</span>
                    No products found. {isAdmin && 'Click "+ New Product" to add one.'}
                  </td>
                </tr>
              )}
              {products.map((product) => {
                const badge = getStockBadge(product.stock);
                return (
                  <tr key={product.id} className="hover:bg-surface-container-low/50 transition-colors group">
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
                            <span className="material-symbols-outlined text-outline-variant">image</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{product.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs text-on-surface-variant">
                      {product.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium">₹{parseFloat(product.price).toLocaleString()}</td>
                    <td className={`py-4 px-6 text-sm ${product.stock < 10 ? "font-bold text-error" : ""}`}>
                      {product.stock}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.classes}`}>
                        {badge.text}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openDrawer(product)}
                              className="text-slate-400 hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-slate-400 hover:text-error transition-colors"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined">delete</span>
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

        <div className="mt-8 flex justify-between items-center text-on-surface-variant">
          <span className="text-[11px] font-medium tracking-normal text-slate-500 uppercase">
            Showing {products.length} products
          </span>
        </div>
      </div>

      {/* Drawer: Add/Edit Product */}
      <Drawer
        title={editingProduct ? "Edit Product" : "New Product"}
        placement="right"
        onClose={closeDrawer}
        open={drawerOpen}
        size="large"
        className="font-inter"
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          <div className="group">
            <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">Product Name</label>
            <div className="relative mt-2">
              <input
                {...register("name")}
                placeholder="e.g. Luxe Chronograph"
                className={`block w-full rounded-xl border-0 bg-surface-container-low py-4 px-4 text-on-surface ring-1 ring-inset placeholder:text-outline focus:bg-surface-container-highest focus:ring-1 focus:ring-inset focus:ring-primary transition-all duration-200 ${
                  errors.name ? "ring-error/40" : "ring-outline-variant/15"
                }`}
              />
            </div>
            {errors.name && <p className="text-error text-[11px] font-medium ml-1 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="group">
              <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">Price (₹)</label>
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
              {errors.price && <p className="text-error text-[11px] font-medium ml-1 mt-1">{errors.price.message}</p>}
            </div>
            <div className="group">
              <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">Stock</label>
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
              {errors.stock && <p className="text-error text-[11px] font-medium ml-1 mt-1">{errors.stock.message}</p>}
            </div>
          </div>

          <div className="group">
            <label className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70">Product Image</label>
            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-container file:text-on-primary-container hover:file:bg-primary-fixed-dim cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={creating || updating}
              className="flex w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dim px-8 py-4 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            >
              {creating || updating ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
};

export default ProductsPage;
