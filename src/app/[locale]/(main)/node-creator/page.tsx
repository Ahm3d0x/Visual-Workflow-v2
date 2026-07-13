import { createClient, getUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NodeCreatorClient } from '@/components/node-creator/NodeCreatorClient';

export default async function NodeCreatorPage({
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

  // Fetch user's existing nodes
  const { data: myNodes } = await (supabase
    .from('marketplace_nodes')
    .select('*')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false }) as unknown as Promise<{ data: Record<string, unknown>[] | null }>);

  return (
    <NodeCreatorClient
      locale={locale}
      userId={user.id}
      workspaceId={workspaceId || ''}
      existingNodes={myNodes || []}
    />
  );
}
