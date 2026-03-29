import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, MapPin, ShoppingCart, Bell, Filter, SlidersHorizontal } from 'lucide-react';

const navItems = [
  { title: 'Browse', url: '/customer', icon: Search },
  { title: 'Map', url: '/customer/map', icon: MapPin },
  { title: 'Cart', url: '/customer/cart', icon: ShoppingCart },
  { title: 'Notifications', url: '/customer/notifications', icon: Bell },
];

const getExpiryDiscount = (expiryDate: string | null) => {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days <= 1) return 50;
  if (days <= 3) return 30;
  if (days <= 7) return 15;
  return null;
};

const CustomerDashboard = () => {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['all-products', search, cityFilter, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_donated', false)
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (search) query = query.ilike('name', `%${search}%`);
      if (cityFilter) query = query.ilike('city', `%${cityFilter}%`);
      if (categoryFilter) query = query.ilike('category', `%${categoryFilter}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const discountedProducts = products.filter(p => getExpiryDiscount(p.expiry_date) !== null);

  const FiltersContent = () => (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground">City</label>
        <Input placeholder="Filter by city..." value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Category</label>
        <Input placeholder="Filter by category..." value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} />
      </div>
      <Button variant="outline" className="w-full" onClick={() => { setCityFilter(''); setCategoryFilter(''); }}>
        Clear Filters
      </Button>
    </div>
  );

  return (
    <DashboardLayout navItems={navItems} title="Customer">
      <div className="page-container">
        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Mobile filter button */}
          <div className="md:hidden">
            <Dialog open={showFilters} onOpenChange={setShowFilters}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon"><SlidersHorizontal className="h-4 w-4" /></Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Filters</DialogTitle></DialogHeader>
                <FiltersContent />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Desktop filters */}
          <div className="hidden md:block w-64 shrink-0">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Filter className="h-4 w-4" /> Filters</h3>
                <FiltersContent />
              </CardContent>
            </Card>
          </div>

          <div className="flex-1">
            {/* Discounted Section */}
            {discountedProducts.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-display font-semibold mb-4 text-accent">🔥 Discounted Items</h2>
                <div className="card-grid">
                  {discountedProducts.slice(0, 4).map(product => {
                    const discount = getExpiryDiscount(product.expiry_date)!;
                    return (
                      <Card key={product.id} className="overflow-hidden border-accent/20">
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} className="w-full h-36 object-cover" />
                        )}
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground">{product.name}</h3>
                            <Badge className="bg-accent text-accent-foreground">{discount}% off</Badge>
                          </div>
                          {product.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="line-through text-muted-foreground text-sm">${Number(product.price).toFixed(2)}</span>
                            <span className="text-lg font-bold text-accent">${(Number(product.price) * (1 - discount / 100)).toFixed(2)}</span>
                          </div>
                          {product.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{product.city}</p>}
                          {product.expiry_date ? (
                            <p className="text-xs text-muted-foreground mt-1">Expires: {new Date(product.expiry_date).toLocaleDateString()}</p>
                          ) : null}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Products */}
            <h2 className="text-xl font-display font-semibold mb-4">All Products</h2>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading products...</div>
            ) : products.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No products found.</CardContent></Card>
            ) : (
              <div className="card-grid">
                {products.map(product => {
                  const discount = getExpiryDiscount(product.expiry_date);
                  return (
                    <Card key={product.id} className="overflow-hidden">
                      {product.image_url && (
                        <img src={product.image_url} alt={product.name} className="w-full h-36 object-cover" />
                      )}
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-foreground">{product.name}</h3>
                          {product.category && <Badge variant="secondary">{product.category}</Badge>}
                        </div>
                        {product.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>}
                        <div className="flex items-center gap-2 mb-1">
                          {discount ? (
                            <>
                              <span className="line-through text-muted-foreground text-sm">${Number(product.price).toFixed(2)}</span>
                              <span className="font-bold text-accent">${(Number(product.price) * (1 - discount / 100)).toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="font-bold text-foreground">${Number(product.price).toFixed(2)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Qty: {product.quantity}</span>
                          {product.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{product.city}</span>}
                        </div>
                        {!product.expiry_date && <p className="text-xs text-muted-foreground mt-1">No expiry</p>}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDashboard;
