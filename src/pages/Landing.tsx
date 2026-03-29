import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ShoppingBag, Users, Heart, Leaf } from 'lucide-react';

type UserRole = 'retailer' | 'customer' | 'ngo';

const Landing = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signUp(email, password, fullName, role);
      toast.success('Account created! Please check your email to verify.');
    } catch (err: any) {
      toast.error(err.message || 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const roleIcons = {
    retailer: <ShoppingBag className="h-5 w-5" />,
    customer: <Users className="h-5 w-5" />,
    ngo: <Heart className="h-5 w-5" />,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
            <Leaf className="h-5 w-5" />
            <span className="text-sm font-medium">Reduce Waste, Share More</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4">
            FreshShare
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Connect retailers, customers, and NGOs to reduce food waste and share surplus goods.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10 w-full animate-slide-up">
          {[
            { icon: <ShoppingBag className="h-6 w-6" />, title: 'Retailers', desc: 'Manage inventory & donate surplus' },
            { icon: <Users className="h-6 w-6" />, title: 'Customers', desc: 'Find discounted products nearby' },
            { icon: <Heart className="h-6 w-6" />, title: 'NGOs', desc: 'Receive donations & help communities' },
          ].map((f) => (
            <div key={f.title} className="bg-card rounded-lg border border-border p-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Auth Card */}
        <Card className="w-full max-w-md animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle className="font-display">Get Started</CardTitle>
            <CardDescription>Sign in or create an account</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="signin-email">Email</Label>
                    <Input id="signin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input id="signup-name" value={fullName} onChange={e => setFullName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  </div>
                  <div>
                    <Label>I am a...</Label>
                    <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retailer">
                          <span className="flex items-center gap-2">{roleIcons.retailer} Retailer</span>
                        </SelectItem>
                        <SelectItem value="customer">
                          <span className="flex items-center gap-2">{roleIcons.customer} Customer</span>
                        </SelectItem>
                        <SelectItem value="ngo">
                          <span className="flex items-center gap-2">{roleIcons.ngo} NGO</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Landing;
