import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check } from 'lucide-react';

const NotificationsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user!.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-display font-semibold">Notifications</h2>
          {unreadCount > 0 && <p className="text-sm text-muted-foreground">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <Check className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <Card
              key={notification.id}
              className={`cursor-pointer transition-colors ${!notification.is_read ? 'border-primary/30 bg-primary/5' : ''}`}
              onClick={() => !notification.is_read && markRead.mutate(notification.id)}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notification.is_read ? 'bg-primary' : 'bg-transparent'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
                {notification.type && <Badge variant="secondary" className="shrink-0">{notification.type}</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
