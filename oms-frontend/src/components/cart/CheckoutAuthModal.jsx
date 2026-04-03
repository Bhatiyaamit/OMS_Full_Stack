import { useState } from "react";
import { Modal } from "antd";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import useCartStore from "../../store/cartStore";
import { useLogin, useRegister } from "../../hooks/useAuth";

/* ── Zod schemas ── */
const loginSchema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  name:     z.string().min(2, "Name must be at least 2 characters"),
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/* ── Reusable field ── */
const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
      {label}
    </label>
    {children}
    {error && (
      <p className="text-rose-500 text-[11px] font-semibold mt-1">{error}</p>
    )}
  </div>
);

const inputCls = (hasError) =>
  `w-full rounded-xl border px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 outline-none transition-all focus:ring-2 ${
    hasError
      ? "border-rose-300 focus:ring-rose-200 bg-rose-50"
      : "border-slate-200 focus:ring-slate-200 bg-slate-50 focus:bg-white"
  }`;

const PasswordField = ({ label, error, registration, placeholder = "••••••••" }) => {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          {...registration}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          className={inputCls(!!error) + " pr-12"}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors outline-none flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[18px]">
            {show ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>
    </Field>
  );
};

/* ══════════════════════════════════════════════════════════
 *  CheckoutAuthModal
 *
 *  Props:
 *    open        boolean   — controlled visibility
 *    onClose     () => void
 *    onSuccess   () => void  — called after login/signup + merge
 *    onContinueAsGuest (optional) — if you want a "guest checkout" escape hatch
 * ══════════════════════════════════════════════════════════ */
const CheckoutAuthModal = ({ open, onClose, onSuccess, mode = "checkout" }) => {
  const [tab, setTab] = useState("login"); // "login" | "signup"

  /* TanStack Query mutations — same ones as LoginPage / RegisterPage */
  const loginMutation    = useLogin();
  const registerMutation = useRegister();
  const loading = loginMutation.isPending || registerMutation.isPending;

  /* Cart merge */
  const mergeGuestCart = useCartStore((s) => s.mergeGuestCart);

  /* ── Login form ── */
  const loginForm  = useForm({ resolver: zodResolver(loginSchema) });
  const signupForm = useForm({ resolver: zodResolver(signupSchema) });

  const switchTab = (t) => {
    setTab(t);
    loginForm.reset();
    signupForm.reset();
  };

  /* ── Handle login ── */
  const onLogin = (data) => {
    loginMutation.mutate(
      { email: data.email, password: data.password },
      {
        onSuccess: () => {
          mergeGuestCart([]);
          toast.success("Welcome back! Your cart is ready.");
          onSuccess?.();
          onClose();
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || "Login failed. Check your credentials.");
        },
      }
    );
  };

  /* ── Handle signup ── */
  const onSignup = (data) => {
    registerMutation.mutate(
      { name: data.name, email: data.email, password: data.password },
      {
        onSuccess: () => {
          mergeGuestCart([]);
          toast.success("Account created! Your cart items are saved.");
          onSuccess?.();
          onClose();
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || "Signup failed. Please try again.");
        },
      }
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={480}
      closable
      maskClosable
      styles={{
        content: { borderRadius: "1.5rem", padding: 0, overflow: "hidden" },
        mask:    { backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.35)" },
      }}
    >
      <div className="flex flex-col">

        {/* ── Header ── */}
        <div className="px-8 pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[#C8F04A] text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}>
                shopping_cart_checkout
              </span>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 leading-tight tracking-tight">
                {tab === "login" 
                  ? (mode === "checkout" ? "Sign in to checkout" : "Welcome back") 
                  : "Create an account"}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {mode === "checkout" 
                  ? "Your cart items will be saved automatically" 
                  : "Access your dashboard, orders, and more"}
              </p>
            </div>
          </div>

          {/* Cart items reminder pill */}
          <CartItemsPill />
        </div>

        {/* ── Tab switcher ── */}
        <div className="flex mx-8 mt-5 bg-slate-100 rounded-full p-1">
          {["login", "signup"].map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* ── Forms ── */}
        <div className="px-8 py-6">
          {tab === "login" ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
              <Field label="Email" error={loginForm.formState.errors.email?.message}>
                <input
                  {...loginForm.register("email")}
                  type="email"
                  placeholder="you@example.com"
                  className={inputCls(!!loginForm.formState.errors.email)}
                />
              </Field>
              <PasswordField 
                label="Password" 
                error={loginForm.formState.errors.password?.message} 
                registration={loginForm.register("password")}
                placeholder="••••••••"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-base">login</span>
                )}
                {loading ? "Signing in…" : (mode === "checkout" ? "Sign In & Continue" : "Sign In")}
              </button>
            </form>
          ) : (
            <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
              <Field label="Full Name" error={signupForm.formState.errors.name?.message}>
                <input
                  {...signupForm.register("name")}
                  type="text"
                  placeholder="Jane Smith"
                  className={inputCls(!!signupForm.formState.errors.name)}
                />
              </Field>
              <Field label="Email" error={signupForm.formState.errors.email?.message}>
                <input
                  {...signupForm.register("email")}
                  type="email"
                  placeholder="you@example.com"
                  className={inputCls(!!signupForm.formState.errors.email)}
                />
              </Field>
              <PasswordField 
                label="Password" 
                error={signupForm.formState.errors.password?.message} 
                registration={signupForm.register("password")}
                placeholder="Min. 6 characters"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C8F04A] text-slate-900 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-lime-300 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-base">person_add</span>
                )}
                {loading ? "Creating account…" : (mode === "checkout" ? "Create Account & Continue" : "Create Account")}
              </button>
            </form>
          )}
        </div>

        {/* ── Footer note ── */}
        <div className="px-8 pb-7 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            <span className="material-symbols-outlined text-[13px] align-middle mr-1"
              style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            {mode === "checkout" ? "Your cart is saved · No spam · Cancel anytime" : "Secure login · No spam · Cancel anytime"}
          </p>
        </div>
      </div>
    </Modal>
  );
};

/* ── Mini pill showing what's in the guest cart ── */
const CartItemsPill = () => {
  const items = useCartStore((s) => s.items);
  if (!items || items.length === 0) return null;

  const total = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);

  return (
    <div className="flex items-center gap-3 bg-[#C8F04A]/20 border border-[#C8F04A]/40 rounded-2xl px-4 py-2.5 mt-3">
      <span className="material-symbols-outlined text-slate-700 text-base"
        style={{ fontVariationSettings: "'FILL' 1" }}>shopping_bag</span>
      <div className="flex-1">
        <p className="text-xs font-black text-slate-900">
          {total} item{total !== 1 ? "s" : ""} in your cart
        </p>
        <p className="text-[10px] font-bold text-slate-500">
          ₹{totalPrice.toLocaleString()} · Will be kept after login
        </p>
      </div>
      <span className="material-symbols-outlined text-[#C8F04A] text-lg"
        style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
    </div>
  );
};

export default CheckoutAuthModal;
