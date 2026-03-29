import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { LayoutDashboard, Package, Gift, Bell, Plus, Trash2, ImagePlus, Users, FileText } from 'lucide-react';

const navItems = [
  { title: 'Dashboard', url: '/retailer', icon: LayoutDashboard },
  { title: 'Products', url: '/retailer/products', icon: Package },
  { title: 'Donations', url: '/retailer/donations', icon: Gift },
  { title: 'Notifications', url: '/retailer/notifications', icon: Bell },
];

const RetailerDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [noExpiry, setNoExpiry] = useState(false);
  const [showDonateDialog, setShowDonateDialog] = useState(false);
  const [selectedProductForDonation, setSelectedProductForDonation] = useState<any>(null);
  const [selectedNgoId, setSelectedNgoId] = useState('');
  const [productForm, setProductForm] = useState({
    name: '', description: '', price: '', quantity: '', expiry_date: '', category: '', city: '',
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['retailer-products', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('retailer_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch NGOs with verified documents
  const { data: verifiedNgos = [] } = useQuery({
    queryKey: ['verified-ngos'],
    queryFn: async () => {
      const { data: docs, error } = await supabase
        .from('ngo_documents')
        .select('ngo_id, document_type, status')
        .eq('status', 'verified');
      if (error) throw error;
      // Get unique NGO IDs
      const ngoIds = [...new Set(docs.map(d => d.ngo_id))];
      if (ngoIds.length === 0) return [];
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', ngoIds);
      if (pErr) throw pErr;
      return profiles || [];
    },
  });

  // Fetch all NGO documents for display
  const { data: allNgoDocs = [] } = useQuery({
    queryKey: ['all-ngo-documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ngo_documents')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setProductImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!productImage || !user) return null;
    const ext = productImage.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('products').upload(filePath, productImage);
    if (error) throw error;
    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const addProduct = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let imageUrl: string | null = null;
      if (productImage) {
        imageUrl = await uploadImage();
      }
      const { error } = await supabase.from('products').insert({
        retailer_id: user!.id,
        name: productForm.name,
        description: productForm.description,
        price: parseFloat(productForm.price),
        quantity: parseInt(productForm.quantity),
        expiry_date: noExpiry ? null : (productForm.expiry_date || null),
        category: productForm.category || null,
        city: productForm.city || null,
        image_url: imageUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retailer-products'] });
      setShowAddProduct(false);
      resetForm();
      toast.success('Product added!');
    },
    onError: (err: any) => toast.error(err.message),
    onSettled: () => setUploading(false),
  });

  const resetForm = () => {
    setProductForm({ name: '', description: '', price: '', quantity: '', expiry_date: '', category: '', city: '' });
    setProductImage(null);
    setImagePreview(null);
    setNoExpiry(false);
  };

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retailer-products'] });
      toast.success('Product deleted');
    },
  });

  const donateProduct = useMutation({
    mutationFn: async ({ product, ngoId }: { product: any; ngoId: string }) => {
      const { error: donationError } = await supabase.from('donations').insert({
        product_id: product.id,
        retailer_id: user!.id,
        quantity: product.quantity,
        ngo_id: ngoId,
        status: 'requested',
      });
      if (donationError) throw donationError;
      const { error } = await supabase.from('products').update({ is_donated: true }).eq('id', product.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retailer-products'] });
      setShowDonateDialog(false);
      setSelectedProductForDonation(null);
      setSelectedNgoId('');
      toast.success('Product donated to NGO!');
    },
  });

  const getExpiryDiscount = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 1) return 50;
    if (days <= 3) return 30;
    if (days <= 7) return 15;
    return null;
  };

  const stats = {
    total: products.length,
    donated: products.filter(p => p.is_donated).length,
    expiringSoon: products.filter(p => {
      if (!p.expiry_date) return false;
      const days = Math.ceil((new Date(p.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return days <= 7 && days > 0;
    }).length,
  };

  return (
    <DashboardLayout navItems={navItems} title="Retailer">
      <div className="page-container">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Products', value: stats.total, color: 'bg-primary/10 text-primary' },
            { label: 'Donated', value: stats.donated, color: 'bg-accent/10 text-accent' },
            { label: 'Expiring Soon', value: stats.expiringSoon, color: 'bg-warning/10 text-warning' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${s.color} mb-2`}>
                  <Package className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Product */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold">Your Products</h2>
          <Dialog open={showAddProduct} onOpenChange={(open) => { setShowAddProduct(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addProduct.mutate(); }} className="space-y-4">
                {/* Image Upload */}
                <div>
                  <Label>Product Image</Label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  {imagePreview ? (
                    <div className="relative mt-2">
                      <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-border" />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 right-2"
                        onClick={() => { setProductImage(null); setImagePreview(null); }}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                    >
                      <ImagePlus className="h-8 w-8" />
                      <span className="text-sm">Click to upload image</span>
                    </button>
                  )}
                </div>

                <div><Label>Name</Label><Input value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} required /></div>
                <div><Label>Description</Label><Textarea value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Price</Label><Input type="number" step="0.01" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} required /></div>
                  <div><Label>Quantity</Label><Input type="number" value={productForm.quantity} onChange={e => setProductForm(p => ({ ...p, quantity: e.target.value }))} required /></div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Checkbox id="no-expiry" checked={noExpiry} onCheckedChange={(v) => { setNoExpiry(!!v); if (v) setProductForm(p => ({ ...p, expiry_date: '' })); }} />
                    <Label htmlFor="no-expiry" className="text-sm cursor-pointer">No expiry (e.g. clothes, accessories)</Label>
                  </div>
                  {!noExpiry && (
                    <div><Label>Expiry Date</Label><Input type="date" value={productForm.expiry_date} onChange={e => setProductForm(p => ({ ...p, expiry_date: e.target.value }))} /></div>
                  )}
                </div>
                <div><Label>Category</Label><Input value={productForm.category} onChange={e => setProductForm(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Dairy, Bakery, Produce" /></div>
                <div><Label>City</Label><Input value={productForm.city} onChange={e => setProductForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Mumbai, Delhi" /></div>
                <Button type="submit" className="w-full" disabled={addProduct.isPending || uploading}>
                  {uploading ? 'Uploading image...' : addProduct.isPending ? 'Adding...' : 'Add Product'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : products.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No products yet. Add your first product!</CardContent></Card>
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
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{product.name}</h3>
                      <div className="flex gap-1">
                        {product.is_donated && <Badge variant="secondary">Donated</Badge>}
                        {discount && <Badge className="bg-accent text-accent-foreground">{discount}% off</Badge>}
                      </div>
                    </div>
                    {product.description && <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{product.description}</p>}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <span className="font-semibold text-foreground">${Number(product.price).toFixed(2)}</span>
                      {discount && (
                        <span className="text-accent font-semibold">
                          → ${(Number(product.price) * (1 - discount / 100)).toFixed(2)}
                        </span>
                      )}
                      <span>· Qty: {product.quantity}</span>
                    </div>
                    {product.expiry_date ? (
                      <p className="text-xs text-muted-foreground mb-3">Expires: {new Date(product.expiry_date).toLocaleDateString()}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-3">No expiry</p>
                    )}
                    <div className="flex gap-2">
                      {!product.is_donated && (
                        <Button size="sm" variant="outline" onClick={() => { setSelectedProductForDonation(product); setShowDonateDialog(true); }}>
                          <Gift className="h-3 w-3 mr-1" /> Donate
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteProduct.mutate(product.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Donate to NGO Dialog */}
        <Dialog open={showDonateDialog} onOpenChange={(open) => { setShowDonateDialog(open); if (!open) { setSelectedProductForDonation(null); setSelectedNgoId(''); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Donate to NGO</DialogTitle></DialogHeader>
            {selectedProductForDonation && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Donating <span className="font-semibold text-foreground">{selectedProductForDonation.name}</span> (Qty: {selectedProductForDonation.quantity})
                </p>

                <div>
                  <Label>Select Verified NGO</Label>
                  <Select value={selectedNgoId} onValueChange={setSelectedNgoId}>
                    <SelectTrigger><SelectValue placeholder="Choose an NGO..." /></SelectTrigger>
                    <SelectContent>
                      {verifiedNgos.map((ngo: any) => (
                        <SelectItem key={ngo.user_id} value={ngo.user_id}>
                          {ngo.full_name || 'NGO'} {ngo.city ? `(${ngo.city})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {verifiedNgos.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">No verified NGOs available yet.</p>
                  )}
                </div>

                {/* Show NGO documents */}
                {selectedNgoId && (
                  <div>
                    <Label className="text-sm flex items-center gap-1 mb-2"><FileText className="h-3 w-3" /> Documents</Label>
                    <div className="space-y-2">
                      {allNgoDocs.filter((d: any) => d.ngo_id === selectedNgoId).map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                          <span className="capitalize">{doc.document_type}</span>
                          <Badge className={doc.status === 'verified' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}>{doc.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  disabled={!selectedNgoId || donateProduct.isPending}
                  onClick={() => donateProduct.mutate({ product: selectedProductForDonation, ngoId: selectedNgoId })}
                >
                  {donateProduct.isPending ? 'Donating...' : 'Confirm Donation'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default RetailerDashboard;
