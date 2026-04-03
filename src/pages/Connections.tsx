import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, UserCheck, UserX, Users, Clock, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export default function Connections() {
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  // Fetch all users for discovery
  const { data: allUsers } = useQuery({
    queryKey: ['all-users', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile.id)
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Fetch connections
  const { data: connections } = useQuery({
    queryKey: ['connections', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          requester:profiles!connections_requester_id_fkey(*),
          addressee:profiles!connections_addressee_id_fkey(*)
        `)
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Send connection request
  const sendRequest = useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!profile?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('connections')
        .insert({
          requester_id: profile.id,
          addressee_id: addresseeId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Connection request sent!');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Connection request already exists');
      } else {
        toast.error('Failed to send request: ' + error.message);
      }
    },
  });

  // Accept connection request
  const acceptRequest = useMutation({
    mutationFn: async (connectionId: string) => {
      const { data, error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Connection accepted!');
    },
    onError: (error) => {
      toast.error('Failed to accept: ' + error.message);
    },
  });

  // Reject/Remove connection
  const removeConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Connection removed');
    },
    onError: (error) => {
      toast.error('Failed to remove: ' + error.message);
    },
  });

  // Filter and categorize connections
  const pendingReceived = connections?.filter(
    (c: any) => c.status === 'pending' && c.addressee_id === profile?.id
  ) || [];
  
  const pendingSent = connections?.filter(
    (c: any) => c.status === 'pending' && c.requester_id === profile?.id
  ) || [];
  
  const accepted = connections?.filter((c: any) => c.status === 'accepted') || [];

  const getConnectionStatus = (userId: string) => {
    const connection = connections?.find(
      (c: any) =>
        (c.requester_id === userId || c.addressee_id === userId)
    );
    if (!connection) return 'none';
    if (connection.status === 'accepted') return 'connected';
    if (connection.status === 'pending' && connection.requester_id === profile?.id) return 'pending-sent';
    if (connection.status === 'pending' && connection.addressee_id === profile?.id) return 'pending-received';
    return 'none';
  };

  const filteredUsers = allUsers?.filter((user: any) =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connections</h1>
        <p className="text-muted-foreground mt-1">
          Build your network and learn together
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            All Users
          </TabsTrigger>
          <TabsTrigger value="connections" className="gap-2">
            <UserCheck className="h-4 w-4" />
            My Connections
            {accepted.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {accepted.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pendingReceived.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingReceived.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers?.map((user: any, index: number) => {
              const status = getConnectionStatus(user.id);
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Link to={`/profile/${user.id}`}>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/profile/${user.id}`} className="hover:underline">
                            <p className="font-medium truncate">{user.full_name || 'Anonymous'}</p>
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            Level {user.level} • {user.xp} XP
                          </p>
                          <div className="mt-2">
                            {status === 'none' && (
                              <Button
                                size="sm"
                                onClick={() => sendRequest.mutate(user.id)}
                                disabled={sendRequest.isPending}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Connect
                              </Button>
                            )}
                            {status === 'pending-sent' && (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {status === 'pending-received' && (
                              <Badge variant="outline">
                                Wants to connect
                              </Badge>
                            )}
                            {status === 'connected' && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="connections" className="mt-6">
          {accepted.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {accepted.map((conn: any, index: number) => {
                const otherUser = conn.requester_id === profile?.id ? conn.addressee : conn.requester;
                return (
                  <motion.div
                    key={conn.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Link to={`/profile/${otherUser.id}`}>
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={otherUser.avatar_url || undefined} />
                              <AvatarFallback>
                                {otherUser.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link to={`/profile/${otherUser.id}`} className="hover:underline">
                              <p className="font-medium truncate">{otherUser.full_name}</p>
                            </Link>
                            <p className="text-sm text-muted-foreground">
                              Level {otherUser.level} • {otherUser.xp} XP
                            </p>
                            <div className="flex gap-2 mt-2">
                              <Link to="/messages">
                                <Button size="sm" variant="outline">
                                  Message
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => removeConnection.mutate(conn.id)}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No connections yet</h3>
              <p className="text-muted-foreground">
                Start connecting with other learners!
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6 space-y-6">
          {/* Received Requests */}
          {pendingReceived.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Received Requests</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingReceived.map((conn: any) => (
                  <Card key={conn.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Link to={`/profile/${conn.requester.id}`}>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conn.requester.avatar_url || undefined} />
                            <AvatarFallback>
                              {conn.requester.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conn.requester.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Level {conn.requester.level}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => acceptRequest.mutate(conn.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeConnection.mutate(conn.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Sent Requests */}
          {pendingSent.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Sent Requests</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingSent.map((conn: any) => (
                  <Card key={conn.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Link to={`/profile/${conn.addressee.id}`}>
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={conn.addressee.avatar_url || undefined} />
                            <AvatarFallback>
                              {conn.addressee.full_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{conn.addressee.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Level {conn.addressee.level}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2 text-muted-foreground"
                            onClick={() => removeConnection.mutate(conn.id)}
                          >
                            Cancel Request
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pendingReceived.length === 0 && pendingSent.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending requests</h3>
              <p className="text-muted-foreground">
                All caught up!
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
