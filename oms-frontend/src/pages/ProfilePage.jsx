import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Spin } from "antd";
import { toast } from "sonner";
import useAuthStore from "../store/authStore";
import api from "../api/axiosInstance";

// ── Validation Schema ─────────────────────────────────────
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter valid 10-digit Indian phone number")
    .optional()
    .or(z.literal("")),
  address: z.string().min(5, "Enter full address").optional().or(z.literal("")),
  city: z.string().min(2, "Enter city name").optional().or(z.literal("")),
  state: z.string().min(2, "Enter state name").optional().or(z.literal("")),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Enter valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
});

// ── API calls ─────────────────────────────────────────────
const fetchProfile = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};

const updateProfile = async (formData) => {
  const res = await api.put("/auth/profile", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ── Helper ────────────────────────────────────────────────
const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "") || "http://localhost:5011"}${image}`;
};

// ─────────────────────────────────────────────────────────
const ProfilePage = () => {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "address" | "security"

  // ── Fetch latest profile ────────────────────────────────
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  // ── Form ────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      pincode: profile?.pincode || "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        name: profile.name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
      });
    }
  }, [profile, reset]);

  // ── Mutation ────────────────────────────────────────────
  const { mutate: saveProfile, isPending: saving } = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated", {
        description: "Your changes have been saved.",
      });
      setAvatarFile(null);
      setAvatarPreview(null);
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  // ── Submit ──────────────────────────────────────────────
  const onSubmit = (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, val]) => {
      if (val) formData.append(key, val);
    });
    if (avatarFile) formData.append("avatar", avatarFile);
    saveProfile(formData);
  };

  // ── Avatar pick ─────────────────────────────────────────
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // ── Address complete check ──────────────────────────────
  const addressComplete =
    profile?.address && profile?.city && profile?.state && profile?.pincode;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const displayAvatar = avatarPreview || getImageUrl(profile?.avatar);
  const initials = (profile?.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const tabs = [
    { id: "profile", label: "Profile", icon: "person" },
    { id: "address", label: "Delivery Address", icon: "location_on" },
    { id: "security", label: "Security", icon: "lock" },
  ];

  return (
    <div className="max-w-4xl mx-auto py-2 px-4">
      {/* ── Page Header ── */}
      <div className="mb-7">
        <h1 className="text-3xl font-bold tracking-tight text-on-surface">
          My Profile
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage your personal information and delivery address
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ── Left Panel — Avatar + Info ── */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Avatar Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-8 flex flex-col items-center text-center shadow-sm border border-surface-container">
            {/* Avatar circle */}
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-surface-container-high shadow-lg">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={profile?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary flex items-center justify-center">
                    <span className="text-3xl font-black text-on-primary">
                      {initials}
                    </span>
                  </div>
                )}
              </div>

              {/* Camera button */}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary-dim transition-colors"
              >
                <span className="material-symbols-outlined text-base">
                  photo_camera
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <h2 className="text-xl font-bold text-on-surface">
              {profile?.name || "Your Name"}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {profile?.email}
            </p>

            {/* Role badge */}
            <span
              className={`mt-3 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
              ${
                user?.role === "ADMIN"
                  ? "bg-red-100 text-red-700"
                  : user?.role === "MANAGER"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-green-100 text-green-700"
              }`}
            >
              {user?.role}
            </span>

            {/* Address status */}
            <div
              className={`mt-6 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
              ${
                addressComplete
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {addressComplete ? "check_circle" : "warning"}
              </span>
              <span className="text-xs font-bold">
                {addressComplete
                  ? "Delivery address saved"
                  : "Add delivery address"}
              </span>
            </div>

            {/* Member since */}
            <p className="text-xs text-on-surface-variant mt-6">
              Member since{" "}
              {new Date(profile?.createdAt).toLocaleDateString("en-IN", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Quick info card */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
            <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
              Quick Info
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-outline text-lg">
                  phone
                </span>
                <span className="text-sm text-on-surface">
                  {profile?.phone || "No phone added"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-outline text-lg">
                  location_on
                </span>
                <span className="text-sm text-on-surface">
                  {profile?.city && profile?.state
                    ? `${profile.city}, ${profile.state}`
                    : "No address added"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-outline text-lg">
                  local_post_office
                </span>
                <span className="text-sm text-on-surface">
                  {profile?.pincode || "No pincode"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel — Tabs + Form ── */}
        <div className="lg:col-span-8">
          {/* Tab bar */}
          <div className="flex gap-1 bg-surface-container-low p-1.5 rounded-xl mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all
                  ${
                    activeTab === tab.id
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
              >
                <span className="material-symbols-outlined text-base">
                  {tab.icon}
                </span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ── Tab: Profile ── */}
            {activeTab === "profile" && (
              <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-surface-container space-y-6">
                <h3 className="text-lg font-bold text-on-surface">
                  Personal Information
                </h3>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Full Name
                  </label>
                  <input
                    {...register("name")}
                    placeholder="Rahul Mehta"
                    className={`w-full rounded-xl bg-surface-container-low border-none py-3.5 px-4 text-sm text-on-surface focus:ring-1 focus:ring-primary transition-all
                      ${errors.name ? "ring-1 ring-error" : ""}`}
                  />
                  {errors.name && (
                    <p className="text-error text-xs mt-1.5 font-medium">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* Email — read only */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      value={profile?.email || ""}
                      readOnly
                      disabled
                      className="w-full rounded-xl bg-surface-container border-none py-3.5 px-4 text-sm text-on-surface-variant cursor-not-allowed opacity-70"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-base">
                      lock
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1.5">
                    Email cannot be changed
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-on-surface-variant">
                      +91
                    </span>
                    <input
                      {...register("phone")}
                      placeholder="9876543210"
                      maxLength={10}
                      className={`w-full rounded-xl bg-surface-container-low border-none py-3.5 pl-12 pr-4 text-sm text-on-surface focus:ring-1 focus:ring-primary transition-all
                        ${errors.phone ? "ring-1 ring-error" : ""}`}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-error text-xs mt-1.5 font-medium">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary text-on-primary py-3.5 rounded-full font-semibold text-sm hover:bg-primary-dim transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">
                        progress_activity
                      </span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        save
                      </span>
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── Tab: Address ── */}
            {activeTab === "address" && (
              <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-surface-container space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface">
                    Delivery Address
                  </h3>
                  {addressComplete && (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                      <span className="material-symbols-outlined text-sm">
                        check_circle
                      </span>
                      Saved
                    </span>
                  )}
                </div>

                <p className="text-sm text-on-surface-variant -mt-2">
                  This address will be used for all your orders.
                </p>

                {/* Street Address */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Street Address
                  </label>
                  <textarea
                    {...register("address")}
                    rows={3}
                    placeholder="Flat/House No., Building, Street, Area"
                    className={`w-full rounded-lg bg-surface-container-low border-none py-3.5 px-4 text-sm text-on-surface focus:ring-1 focus:ring-primary transition-all resize-none
                      ${errors.address ? "ring-1 ring-error" : ""}`}
                  />
                  {errors.address && (
                    <p className="text-error text-xs mt-1.5 font-medium">
                      {errors.address.message}
                    </p>
                  )}
                </div>

                {/* City + State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      City
                    </label>
                    <input
                      {...register("city")}
                      placeholder="Ahmedabad"
                      className={`w-full rounded-xl bg-surface-container-low border-none py-3.5 px-4 text-sm text-on-surface focus:ring-1 focus:ring-primary transition-all
                        ${errors.city ? "ring-1 ring-error" : ""}`}
                    />
                    {errors.city && (
                      <p className="text-error text-xs mt-1.5 font-medium">
                        {errors.city.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                      State
                    </label>
                    <input
                      {...register("state")}
                      placeholder="Gujarat"
                      className={`w-full rounded-xl bg-surface-container-low border-none py-3.5 px-4 text-sm text-on-surface focus:ring-1 focus:ring-primary transition-all
                        ${errors.state ? "ring-1 ring-error" : ""}`}
                    />
                    {errors.state && (
                      <p className="text-error text-xs mt-1.5 font-medium">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pincode */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Pincode
                  </label>
                  <input
                    {...register("pincode")}
                    placeholder="380001"
                    maxLength={6}
                    className={`w-full rounded-xl bg-surface-container-low border-none py-3.5 px-4 text-sm text-on-surface focus:ring-1 focus:ring-primary transition-all
                      ${errors.pincode ? "ring-1 ring-error" : ""}`}
                  />
                  {errors.pincode && (
                    <p className="text-error text-xs mt-1.5 font-medium">
                      {errors.pincode.message}
                    </p>
                  )}
                </div>

                {/* Address Preview */}
                {addressComplete && (
                  <div className="bg-surface-container-low rounded-lg p-5 border border-surface-container-high">
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                      Saved Address Preview
                    </p>
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary text-xl mt-0.5">
                        location_on
                      </span>
                      <div className="text-sm text-on-surface leading-relaxed">
                        <p className="font-semibold">{profile?.name}</p>
                        <p>{profile?.address}</p>
                        <p>
                          {profile?.city}, {profile?.state} — {profile?.pincode}
                        </p>
                        {profile?.phone && (
                          <p className="text-on-surface-variant mt-1">
                            +91 {profile?.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-primary text-on-primary py-3.5 rounded-full font-semibold text-sm hover:bg-primary-dim transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined text-base animate-spin">
                        progress_activity
                      </span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">
                        location_on
                      </span>
                      Save Address
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── Tab: Security ── */}
            {activeTab === "security" && (
              <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-surface-container space-y-6">
                <h3 className="text-lg font-bold text-on-surface">Security</h3>

                {/* Info card */}
                <div className="bg-blue-50 rounded-lg p-5 flex items-start gap-4">
                  <span className="material-symbols-outlined text-blue-600 text-2xl mt-0.5">
                    info
                  </span>
                  <div>
                    <p className="text-sm font-bold text-blue-800">
                      Account Security
                    </p>
                    <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                      Your account is secured with bcrypt password hashing and
                      HttpOnly cookie-based JWT authentication.
                    </p>
                  </div>
                </div>

                {/* Security checklist */}
                <div className="space-y-3">
                  {[
                    { label: "Email verified", done: true },
                    { label: "Password set", done: true },
                    { label: "Phone number added", done: !!profile?.phone },
                    {
                      label: "Delivery address saved",
                      done: !!addressComplete,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface-container-low"
                    >
                      <span className="text-sm font-medium text-on-surface">
                        {item.label}
                      </span>
                      <span
                        className={`material-symbols-outlined text-lg
                        ${item.done ? "text-green-600" : "text-outline-variant"}`}
                        style={{
                          fontVariationSettings: item.done
                            ? "'FILL' 1"
                            : "'FILL' 0",
                        }}
                      >
                        {item.done ? "check_circle" : "radio_button_unchecked"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Account completion score */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Profile Completion
                    </span>
                    <span className="text-sm font-black text-primary">
                      {[true, true, !!profile?.phone, !!addressComplete].filter(
                        Boolean,
                      ).length * 25}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{
                        width: `${
                          [
                            true,
                            true,
                            !!profile?.phone,
                            !!addressComplete,
                          ].filter(Boolean).length * 25
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
