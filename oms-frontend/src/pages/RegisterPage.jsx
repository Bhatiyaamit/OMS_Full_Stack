import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const { mutate: registerUser, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = (data) => {
    registerUser(data, {
      onSuccess: () => {
        toast.success("Account created!");
        navigate("/dashboard");
      },
      onError: (err) => {
        toast.error("Registration failed", {
          description: err?.message || "Please try again",
        });
      },
    });
  };

  return (
    <main className="flex min-h-screen">
      {/* ── Left Side: Cinematic Branding — exact Stitch ── */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-slate-900 p-16 lg:flex">
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/20 to-[#0c0e10]/90" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/20">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                dataset
              </span>
            </div>
            <span className="text-2xl font-extrabold tracking-tighter text-white">
              OMS Admin
            </span>
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="font-inter text-5xl font-semibold leading-tight tracking-tight text-white lg:text-6xl">
            The Global{" "}
            <span className="text-primary-fixed-dim">Controller</span> for
            Enterprise.
          </h1>
          <p className="mt-8 text-lg text-slate-300 leading-relaxed opacity-80">
            Architecting the future of order management. Our curated interface
            provides surgical precision for global operations and customer
            fulfillment.
          </p>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-primary-dim" />
            <span>© 2026 OMS. All rights reserved.</span>
          </div>
        </div>
      </section>

      {/* ── Right Side: Registration Form — exact Stitch ── */}
      <section className="flex w-full flex-col items-center justify-center bg-surface-container-lowest px-6 py-12 lg:w-1/2 lg:px-20">
        <div className="w-full max-w-[440px]">
          {/* Header */}
          <header className="mb-12">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high lg:hidden">
              <span className="material-symbols-outlined text-primary">
                dataset
              </span>
            </div>
            <h2 className="font-inter text-4xl font-medium tracking-tight text-on-surface">
              Create your account
            </h2>
            <p className="mt-3 text-on-surface-variant opacity-80">
              Join the OMS network to manage your global operations.
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name */}
            <div className="group">
              <label
                className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70"
                htmlFor="full_name"
              >
                Full Name
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">
                    person
                  </span>
                </div>
                <input
                  {...register("name")}
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  className={`block w-full rounded-xl border-0 bg-surface-container-low py-4 pl-12 pr-4 text-on-surface ring-1 ring-inset placeholder:text-outline focus:bg-surface-container-highest focus:ring-1 focus:ring-inset focus:ring-primary transition-all duration-200 ${
                    errors.name ? "ring-error/40" : "ring-outline-variant/15"
                  }`}
                />
              </div>
              {errors.name && (
                <p className="text-error text-[11px] font-medium ml-1 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    error
                  </span>
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="group">
              <label
                className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70"
                htmlFor="email"
              >
                Email Address
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">
                    mail
                  </span>
                </div>
                <input
                  {...register("email")}
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className={`block w-full rounded-xl border-0 bg-surface-container-low py-4 pl-12 pr-4 text-on-surface ring-1 ring-inset placeholder:text-outline focus:bg-surface-container-highest focus:ring-1 focus:ring-inset focus:ring-primary transition-all duration-200 ${
                    errors.email ? "ring-error/40" : "ring-outline-variant/15"
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-error text-[11px] font-medium ml-1 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    error
                  </span>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="group">
              <label
                className="font-inter text-xs font-semibold uppercase tracking-widest text-on-surface-variant opacity-70"
                htmlFor="password"
              >
                Password
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">
                    lock
                  </span>
                </div>
                <input
                  {...register("password")}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`block w-full rounded-xl border-0 bg-surface-container-low py-4 pl-12 pr-12 text-on-surface ring-1 ring-inset placeholder:text-outline focus:bg-surface-container-highest focus:ring-1 focus:ring-inset focus:ring-primary transition-all duration-200 ${
                    errors.password
                      ? "ring-error/40"
                      : "ring-outline-variant/15"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {errors.password && (
                <p className="text-error text-[11px] font-medium ml-1 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">
                    error
                  </span>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dim px-8 py-4 text-sm font-semibold text-on-primary shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              >
                {isPending ? "Creating account..." : "Create Account"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-4 text-sm">
              <span className="text-on-surface-variant">
                Already have an account?
              </span>
              <Link
                to="/login"
                className="font-semibold text-primary transition-colors hover:text-primary-dim"
              >
                Sign In
              </Link>
            </div>
          </form>

          {/* Footer */}
          <footer className="mt-16 flex flex-col items-center gap-4 lg:hidden">
            <div className="h-px w-12 bg-outline-variant/20" />
            <span className="font-inter text-[10px] uppercase tracking-[0.2em] text-on-surface-variant opacity-50">
              © 2026 OMS Global
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
};

export default RegisterPage;
