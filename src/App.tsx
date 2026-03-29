import { useState, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Landing from "./pages/Landing";
import RetailerDashboard from "./pages/RetailerDashboard";
import CustomerDashboard from "./pages/CustomerDashboard";
import NgoDashboard from "./pages/NgoDashboard";
import NotificationsPage from "./pages/NotificationsPage";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import { LayoutDashboard, Package, Gift, Bell, Search, MapPin, ShoppingCart, FileText } from "lucide-react";
import SplashScreen from "./components/SplashScreen";

const queryClient = new QueryClient();

const retailerNav = [
  { title: 'Dashboard', url: '/retailer', icon: LayoutDashboard },
  { title: 'Products', url: '/retailer/products', icon: Package },
  { title: 'Donations', url: '/retailer/donations', icon: Gift },
  { title: 'Notifications', url: '/retailer/notifications', icon: Bell },
];
const customerNav = [
  { title: 'Browse', url: '/customer', icon: Search },
  { title: 'Map', url: '/customer/map', icon: MapPin },
  { title: 'Cart', url: '/customer/cart', icon: ShoppingCart },
  { title: 'Notifications', url: '/customer/notifications', icon: Bell },
];
const ngoNav = [
  { title: 'Dashboard', url: '/ngo', icon: LayoutDashboard },
  { title: 'Donations', url: '/ngo/donations', icon: Gift },
  { title: 'Documents', url: '/ngo/documents', icon: FileText },
  { title: 'Notifications', url: '/ngo/notifications', icon: Bell },
];

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const RoleRedirect = () => {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Loading...</div>;
  if (!user) return <Landing />;
  if (role === 'retailer') return <Navigate to="/retailer" replace />;
  if (role === 'customer') return <Navigate to="/customer" replace />;
  if (role === 'ngo') return <Navigate to="/ngo" replace />;
  return <Landing />;
};

const NotificationsWithLayout = ({ navItems, title }: { navItems: any[]; title: string }) => (
  <DashboardLayout navItems={navItems} title={title}>
    <NotificationsPage />
  </DashboardLayout>
);

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<RoleRedirect />} />
              
              {/* Retailer */}
              <Route path="/retailer" element={<ProtectedRoute><RetailerDashboard /></ProtectedRoute>} />
              <Route path="/retailer/products" element={<ProtectedRoute><RetailerDashboard /></ProtectedRoute>} />
              <Route path="/retailer/donations" element={<ProtectedRoute><RetailerDashboard /></ProtectedRoute>} />
              <Route path="/retailer/notifications" element={<ProtectedRoute><NotificationsWithLayout navItems={retailerNav} title="Retailer" /></ProtectedRoute>} />

              {/* Customer */}
              <Route path="/customer" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
              <Route path="/customer/map" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
              <Route path="/customer/cart" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
              <Route path="/customer/notifications" element={<ProtectedRoute><NotificationsWithLayout navItems={customerNav} title="Customer" /></ProtectedRoute>} />

              {/* NGO */}
              <Route path="/ngo" element={<ProtectedRoute><NgoDashboard /></ProtectedRoute>} />
              <Route path="/ngo/donations" element={<ProtectedRoute><NgoDashboard /></ProtectedRoute>} />
              <Route path="/ngo/documents" element={<ProtectedRoute><NgoDashboard /></ProtectedRoute>} />
              <Route path="/ngo/notifications" element={<ProtectedRoute><NotificationsWithLayout navItems={ngoNav} title="NGO" /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
