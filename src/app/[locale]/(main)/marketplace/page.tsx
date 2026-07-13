import { createClient, getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MarketplaceClient } from '@/components/marketplace/MarketplaceClient';

export default async function MarketplacePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ w?: string }>;
}) {
  const { locale } = await params;
  const { w: workspaceId } = await searchParams;
  const supabase = await createClient();

  // Cached getUser() — React.cache() deduplicates with the layout's call.
  const { user } = await getUser();
  if (!user) redirect(`/${locale}/auth/sign-in`);

  // Fetch published marketplace nodes
  const { data: nodes } = await (supabase
    .from('marketplace_nodes')
    .select('*')
    .eq('status', 'published')
    .eq('visibility', 'public')
    .order('install_count', { ascending: false }) as unknown as Promise<{ data: Record<string, unknown>[] | null }>);

  // Fetch installed nodes for current workspace
  let installedIds: string[] = [];
  if (workspaceId) {
    const { data: installs } = await (supabase
      .from('marketplace_installs')
      .select('marketplace_node_id')
      .eq('workspace_id', workspaceId) as unknown as Promise<{ data: { marketplace_node_id: string }[] | null }>);
    
    installedIds = (installs || []).map(i => i.marketplace_node_id);
  }

  // Fetch user's own nodes (for "My Nodes" section)
  const { data: myNodes } = await (supabase
    .from('marketplace_nodes')
    .select('*')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false }) as unknown as Promise<{ data: Record<string, unknown>[] | null }>);

  // Fetch user's ratings
  const { data: userRatings } = await (supabase
    .from('marketplace_ratings')
    .select('marketplace_node_id, rating, review')
    .eq('user_id', user.id) as unknown as Promise<{ data: { marketplace_node_id: string; rating: number; review: string | null }[] | null }>);

  return (
    <MarketplaceClient
      locale={locale}
      nodes={nodes || []}
      myNodes={myNodes || []}
      installedIds={installedIds}
      workspaceId={workspaceId || ''}
      userId={user.id}
      userRatings={userRatings || []}
    />
  );
}
