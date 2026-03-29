import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { LayoutDashboard, Gift, FileText, Bell, Upload } from 'lucide-react';

const navItems = [
  { title: 'Dashboard', url: '/ngo', icon: LayoutDashboard },
  { title: 'Donations', url: '/ngo/donations', icon: Gift },
  { title: 'Documents', url: '/ngo/documents', icon: FileText },
  { title: 'Notifications', url: '/ngo/notifications', icon: Bell },
];

const NgoDashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [docType, setDocType] = useState('registration');
  const [docFile, setDocFile] = useState<File | null>(null);

  const { data: donations = [] } = useQuery({
    queryKey: ['available-donations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*, products(*)')
        .in('status', ['available', 'requested'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['ngo-documents', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ngo_documents')
        .select('*')
        .eq('ngo_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const requestDonation = useMutation({
    mutationFn: async (donationId: string) => {
      const { error } = await supabase
        .from('donations')
        .update({ ngo_id: user!.id, status: 'requested' })
        .eq('id', donationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['available-donations'] });
      toast.success('Donation requested!');
    },
  });

  const uploadDocument = useMutation({
    mutationFn: async () => {
      if (!docFile || !user) throw new Error('Missing file or user');
      const filePath = `${user.id}/${Date.now()}_${docFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, docFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);

      const { error } = await supabase.from('ngo_documents').insert({
        ngo_id: user.id,
        document_url: publicUrl,
        document_type: docType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ngo-documents'] });
      setShowUpload(false);
      setDocFile(null);
      toast.success('Document uploaded!');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-warning/10 text-warning',
    verified: 'bg-success/10 text-success',
    rejected: 'bg-destructive/10 text-destructive',
    available: 'bg-primary/10 text-primary',
    requested: 'bg-warning/10 text-warning',
  };

  return (
    <DashboardLayout navItems={navItems} title="NGO">
      <div className="page-container">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Card><CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{donations.filter(d => d.status === 'available').length}</p>
            <p className="text-sm text-muted-foreground">Available Donations</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{donations.filter(d => d.ngo_id === user?.id).length}</p>
            <p className="text-sm text-muted-foreground">Your Requests</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{documents.filter(d => d.status === 'verified').length}</p>
            <p className="text-sm text-muted-foreground">Verified Documents</p>
          </CardContent></Card>
        </div>

        {/* Documents */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold">Documents</h2>
          <Dialog open={showUpload} onOpenChange={setShowUpload}>
            <DialogTrigger asChild>
              <Button><Upload className="h-4 w-4 mr-2" /> Upload Document</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Document Type</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registration">Registration Certificate</SelectItem>
                      <SelectItem value="tax">Tax Exemption</SelectItem>
                      <SelectItem value="license">License</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>File</Label>
                  <Input type="file" onChange={e => setDocFile(e.target.files?.[0] || null)} accept=".pdf,.jpg,.png,.doc,.docx" />
                </div>
                <Button className="w-full" disabled={!docFile || uploadDocument.isPending} onClick={() => uploadDocument.mutate()}>
                  {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {documents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {documents.map(doc => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground capitalize">{doc.document_type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge className={statusColors[doc.status] || ''}>{doc.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Donations */}
        <h2 className="text-xl font-display font-semibold mb-4">Available Donations</h2>
        {donations.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No donations available right now.</CardContent></Card>
        ) : (
          <div className="card-grid">
            {donations.map(donation => {
              const product = donation.products as any;
              return (
                <Card key={donation.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-foreground">{product?.name || 'Product'}</h3>
                      <Badge className={statusColors[donation.status] || ''}>{donation.status}</Badge>
                    </div>
                    {product?.description && <p className="text-sm text-muted-foreground mb-2">{product.description}</p>}
                    <p className="text-sm text-muted-foreground mb-3">Quantity: {donation.quantity}</p>
                    {donation.status === 'available' && (
                      <Button size="sm" onClick={() => requestDonation.mutate(donation.id)} disabled={requestDonation.isPending}>
                        Request Donation
                      </Button>
                    )}
                    {donation.ngo_id === user?.id && donation.status === 'requested' && (
                      <p className="text-sm text-primary font-medium">You requested this</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NgoDashboard;
