import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const { mutate: login, isPending } = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data) => {
    login(data, {
      onSuccess: () => {
        toast.success("Welcome back!");
        navigate("/dashboard");
      },
      onError: (err) => {
        toast.error("Authentication failed", {
          description: err?.message || "Invalid credentials",
        });
      },
    });
  };

  return (
    <main className="flex min-h-screen">
      {/* ── Left Column: Cinematic Brand Anchor ── */}
      <section className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-20 bg-gradient-to-br from-[#0c0e10] to-[#1d1d1f]">
        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-12">
            <h1 className="text-white text-8xl font-extrabold tracking-tighter mb-4 opacity-90">
              OMS
            </h1>
            <p className="text-slate-400 text-xl font-medium tracking-tight">
              The Silent Curator of Enterprise Logistics.
            </p>
          </div>
          <ul className="space-y-6">
            <li className="flex items-start gap-4">
              <span className="material-symbols-outlined text-slate-500 mt-1 text-[18px]">check_circle</span>
              <div>
                <p className="text-slate-100 font-medium text-lg leading-tight">Predictive Inventory</p>
                <p className="text-slate-500 text-sm mt-1">Real-time stock optimization with zero-latency updates.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="material-symbols-outlined text-slate-500 mt-1 text-[18px]">check_circle</span>
              <div>
                <p className="text-slate-100 font-medium text-lg leading-tight">Unified Command</p>
                <p className="text-slate-500 text-sm mt-1">Single-pane control for global order management systems.</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <span className="material-symbols-outlined text-slate-500 mt-1 text-[18px]">check_circle</span>
              <div>
                <p className="text-slate-100 font-medium text-lg leading-tight">Elite Analytics</p>
                <p className="text-slate-500 text-sm mt-1">High-fidelity data visualization for strategic growth.</p>
              </div>
            </li>
          </ul>
          <footer className="absolute bottom-[-140px] left-0">
            <p className="text-slate-600 text-xs tracking-widest uppercase">Version 4.2.0 • Secured by LUXE</p>
          </footer>
        </div>
      </section>

      {/* ── Right Column: Login Interface ── */}
      <section className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-24 bg-surface">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-on-surface text-4xl font-semibold tracking-tight mb-2">Welcome back</h2>
            <p className="text-on-surface-variant text-base">Please enter your credentials to access the controller.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Input Group */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="email">
                Identity
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">alternate_email</span>
                <input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className={`w-full h-14 pl-12 pr-4 bg-surface-container-low border rounded-xl focus:border-primary focus:bg-surface-container-highest focus:ring-0 transition-all text-on-surface ${
                    errors.email ? "border-error/40" : "border-transparent"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-error text-[11px] font-medium ml-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Input Group */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="password">
                Access Key
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">lock_open</span>
                <input
                  {...register("password")}
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={`w-full h-14 pl-12 pr-4 bg-surface-container-low border rounded-xl focus:border-primary focus:bg-surface-container-highest focus:ring-0 transition-all text-on-surface ${
                    errors.password ? "border-error/40" : "border-transparent"
                  }`}
                />
              </div>
              {errors.password && (
                <p className="text-error text-[11px] font-medium ml-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-14 bg-primary text-on-primary font-semibold rounded-full flex items-center justify-center gap-2 hover:bg-primary-dim active:scale-[0.98] transition-all shadow-sm disabled:opacity-60"
            >
              {isPending ? "Signing in..." : "Sign In"}
              {!isPending && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-12 text-center">
            <p className="text-on-surface-variant text-sm">
              New to the system?
              <Link to="/register" className="text-primary font-semibold ml-1 hover:underline">Create Account</Link>
            </p>
          </div>

          {/* Global Footnote */}
          <div className="mt-24 pt-8 border-t border-surface-container text-center lg:text-left">
            <p className="text-[11px] text-outline-variant">© 2026 OMS. All Rights Reserved.</p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
