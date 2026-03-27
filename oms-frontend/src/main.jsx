import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import App from "./App.jsx";
import "./index.css";

// ── React Query configuration ────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// ── Ant Design theme — synced to Stitch palette ──────────
const antdTheme = {
  token: {
    colorPrimary: "#005cba",
    colorBgBase: "#f9f9fb",
    colorTextBase: "#2d3338",
    borderRadius: 6,
    fontFamily: '"Inter", sans-serif',
  },
  components: {
    Button: {
      controlHeight: 40,
      borderRadius: 6,
    },
    Input: {
      controlHeight: 44,
      borderRadius: 8,
    },
    Card: {
      colorBgContainer: "#ffffff",
      borderRadiusLG: 12,
      boxShadowTertiary: "0px 4px 24px rgba(25, 28, 30, 0.06)",
    },
  },
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme}>
        <App />
      </ConfigProvider>
    </QueryClientProvider>
  </StrictMode>
);
