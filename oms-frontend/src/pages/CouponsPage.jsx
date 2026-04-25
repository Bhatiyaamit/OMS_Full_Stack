import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal } from "antd";
import api from "../api/axiosInstance";
import useAuthStore from "../store/authStore";

const fmt = (n) =>
  parseFloat(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const badge = (isActive, expired) => {
  if (expired) return { label: "Expired", cls: "bg-error/10 text-error" };
  if (isActive) return { label: "Active", cls: "bg-primary/10 text-primary" };
  return {
    label: "Inactive",
    cls: "bg-surface-container text-on-surface-variant",
  };
};

const empty = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minAmount: "",
  maxDiscount: "",
  expiryDate: "",
  usageLimit: 1,
  isActive: true,
};

const CouponsPage = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const { data, isLoading } = useQuery({
    queryKey: ["coupons"],
    // axios interceptor unwraps response.data → res = { success, data: [...] }
    queryFn: () => api.get("/coupons").then((res) => res.data),
  });

  const createMut = useMutation({
    mutationFn: (payload) => api.post("/coupons", payload),
    onSuccess: () => {
      toast.success("Coupon created!");
      qc.invalidateQueries({ queryKey: ["coupons"] });
      setModalOpen(false);
      setForm(empty);
    },
    onError: (err) => toast.error(err?.message || "Failed"),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => api.patch(`/coupons/${id}/toggle`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coupons"] }),
    onError: (err) => toast.error(err?.message || "Failed"),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/coupons/${id}`),
    onSuccess: () => {
      toast.success("Coupon deleted");
      qc.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (err) => toast.error(err?.message || "Failed"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const discountValue = parseFloat(form.discountValue);
    if (form.discountType === "PERCENTAGE" && discountValue >= 100) {
      toast.error("Percentage discount must be less than 100%");
      return;
    }
    const payload = {
      code: form.code.toUpperCase(),
      discountType: form.discountType,
      discountValue,
      minAmount: form.minAmount ? parseFloat(form.minAmount) : 0,
      maxDiscount: form.maxDiscount ? parseFloat(form.maxDiscount) : null,
      expiryDate: new Date(form.expiryDate).toISOString(),
      usageLimit: parseInt(form.usageLimit, 10),
      isActive: form.isActive,
    };
    createMut.mutate(payload);
  };

  const coupons = data ?? [];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-container pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface">
            Coupons
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage discount coupons for your customers
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-primary-dim transition-all flex items-center gap-2 active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Coupon
        </button>
      </div>

      {/* Coupon Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="material-symbols-outlined text-4xl text-outline-variant animate-spin">
            progress_activity
          </span>
        </div>
      ) : coupons.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl p-16 border border-surface-container flex flex-col items-center text-center">
          <span className="material-symbols-outlined text-5xl text-outline-variant mb-4">
            local_offer
          </span>
          <h3 className="text-lg font-bold text-on-surface">No coupons yet</h3>
          <p className="text-sm text-on-surface-variant mt-2">
            Create your first coupon to give customers discounts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {coupons.map((c) => {
            const expired = new Date() > new Date(c.expiryDate);
            const { label, cls } = badge(c.isActive, expired);
            const usagePercent = Math.min(
              100,
              Math.round((c.usedCount / c.usageLimit) * 100),
            );

            return (
              <div
                key={c.id}
                className="bg-surface-container-lowest border border-surface-container rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                {/* Top */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary text-base">
                        local_offer
                      </span>
                      <p className="text-lg font-black tracking-widest text-on-surface font-mono">
                        {c.code}
                      </p>
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {c.discountType === "PERCENTAGE"
                        ? `${c.discountValue}% off`
                        : `₹${fmt(c.discountValue)} off`}
                      {c.minAmount > 0 && ` · min ₹${fmt(c.minAmount)}`}
                      {c.maxDiscount && ` · max ₹${fmt(c.maxDiscount)}`}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cls}`}
                  >
                    {label}
                  </span>
                </div>

                {/* Usage bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-[11px] text-on-surface-variant mb-1">
                    <span>Usage</span>
                    <span>
                      {c.usedCount} / {c.usageLimit}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        usagePercent >= 100 ? "bg-error" : "bg-primary"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Expiry */}
                <p className="text-[11px] text-on-surface-variant mb-5">
                  <span className="material-symbols-outlined text-[13px] align-middle mr-1">
                    schedule
                  </span>
                  Expires{" "}
                  {new Date(c.expiryDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleMut.mutate(c.id)}
                    disabled={expired}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      c.isActive
                        ? "border-outline-variant/30 text-on-surface-variant hover:bg-surface-container"
                        : "border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                    }`}
                  >
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        Modal.confirm({
                          title: `Delete coupon "${c.code}"?`,
                          content: "This action cannot be undone.",
                          okText: "Delete",
                          okButtonProps: { danger: true },
                          onOk: () => deleteMut.mutate(c.id),
                        });
                      }}
                      className="w-9 h-9 rounded-xl border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:bg-red-50 hover:border-red-200 hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">
                        delete
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setForm(empty);
        }}
        footer={null}
        title={null}
        centered
        width={520}
        styles={{
          content: {
            borderRadius: "20px",
            padding: "2rem",
            backgroundColor: "var(--surface)",
            border: "1px solid var(--outline-variant)",
          },
          body: { padding: 0 },
        }}
      >
        <div>
          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-lg">
                local_offer
              </span>
            </div>
            <div>
              <p className="text-base font-bold text-on-surface">New Coupon</p>
              <p className="text-[13px] text-on-surface-variant">
                Fill in the details below
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Code + Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Code *
                </label>
                <input
                  required
                  value={form.code}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      code: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SAVE20"
                  className="mt-1.5 block w-full rounded-xl bg-surface-container-low ring-1 ring-outline-variant/20 border-0 px-4 py-3 text-on-surface text-sm font-mono font-bold tracking-widest focus:ring-primary focus:ring-1 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Type *
                </label>
                <select
                  value={form.discountType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, discountType: e.target.value }))
                  }
                  className="mt-1.5 block w-full rounded-xl bg-surface-container-low ring-1 ring-outline-variant/20 border-0 px-4 py-3 text-on-surface text-sm focus:ring-primary focus:ring-1 outline-none"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Fixed (₹)</option>
                </select>
              </div>
            </div>

            {/* Value + Min */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Discount Value *
                  {form.discountType === "PERCENTAGE" && (
                    <span className="ml-1 text-on-surface-variant/60 normal-case font-medium tracking-normal">
                      (max 100)
                    </span>
                  )}
                </label>
                <input
                  required
                  type="number"
                  min="0.01"
                  max={form.discountType === "PERCENTAGE" ? 99.99 : undefined}
                  step="any"
                  value={form.discountValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (
                      form.discountType === "PERCENTAGE" &&
                      parseFloat(val) >= 100
                    )
                      return;
                    setForm((f) => ({ ...f, discountValue: val }));
                  }}
                  placeholder={
                    form.discountType === "PERCENTAGE"
                      ? "e.g. 20 (max 99)"
                      : "e.g. 100"
                  }
                  className="mt-1.5 block w-full rounded-xl bg-surface-container-low ring-1 ring-outline-variant/20 border-0 px-4 py-3 text-on-surface text-sm focus:ring-primary focus:ring-1 outline-none"
                />
                <p className="text-[10px] text-on-surface-variant/70 mt-1 ml-0.5">
                  {form.discountType === "PERCENTAGE"
                    ? "Enter a % between 0–99"
                    : "Enter a flat ₹ amount"}
                </p>
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Min Order (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.minAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minAmount: e.target.value }))
                  }
                  placeholder="500"
                  className="mt-1.5 block w-full rounded-xl bg-surface-container-low ring-1 ring-outline-variant/20 border-0 px-4 py-3 text-on-surface text-sm focus:ring-primary focus:ring-1 outline-none"
                />
              </div>
            </div>

            {/* Max Discount + Usage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Max Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.maxDiscount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxDiscount: e.target.value }))
                  }
                  placeholder="Unlimited"
                  className="mt-1.5 block w-full rounded-xl bg-surface-container-low ring-1 ring-outline-variant/20 border-0 px-4 py-3 text-on-surface text-sm focus:ring-primary focus:ring-1 outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Usage Limit *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={form.usageLimit}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, usageLimit: e.target.value }))
                  }
                  className="mt-1.5 block w-full rounded-xl bg-surface-container-low ring-1 ring-outline-variant/20 border-0 px-4 py-3 text-on-surface text-sm focus:ring-primary focus:ring-1 outline-none"
                />
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                Expiry Date *
              </label>
              <input
                required
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={form.expiryDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiryDate: e.target.value }))
                }
                className="mt-1.5 block w-full rounded-xl bg-surface-container-low ring-1 ring-outline-variant/20 border-0 px-4 py-3 text-on-surface text-sm focus:ring-primary focus:ring-1 outline-none"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3 py-2">
              <button
                type="button"
                role="switch"
                aria-checked={form.isActive}
                onClick={() =>
                  setForm((f) => ({ ...f, isActive: !f.isActive }))
                }
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "9999px",
                  border: "none",
                  padding: "2px",
                  backgroundColor: form.isActive
                    ? "var(--color-primary)"
                    : "var(--color-surface-container-high, #e2e8f0)",
                  transition: "background-color 0.25s ease",
                  position: "relative",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    display: "block",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
                    transform: form.isActive
                      ? "translateX(20px)"
                      : "translateX(0px)",
                    transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    willChange: "transform",
                  }}
                />
              </button>
              <span className="text-sm font-medium text-on-surface select-none">
                {form.isActive ? "Active immediately" : "Save as inactive"}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setForm(empty);
                }}
                className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMut.isLoading}
                className="flex-[2] py-3 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-dim transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createMut.isLoading ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                    Creating...
                  </>
                ) : (
                  "Create Coupon"
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};

export default CouponsPage;
