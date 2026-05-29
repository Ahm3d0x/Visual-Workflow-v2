'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useEditorStore, EditorComment } from '@/stores/editorStore';
import { 
  X, MessageSquare, Send, CheckCircle2, 
  CornerDownRight, ArrowLeft, RefreshCw, Sparkles 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { getCollaboratorColor } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';

interface CommentsPanelProps {
  locale: string;
  userRole: string;
  workspaceId: string;
  workflowId: string;
  isInline?: boolean;
}

interface MemberInfo {
  id: string;
  fullName: string;
  email: string;
}

export function CommentsPanel({ locale, userRole, workspaceId, workflowId, isInline = false }: CommentsPanelProps) {
  const isRtl = locale === 'ar';
  const supabase = createClient();
  
  const { 
    nodes,
    selectedNodeId, 
    setSelectedNode,
    comments, 
    setComments, 
    addComment, 
    updateComment, 
    panels, 
    togglePanel 
  } = useEditorStore();

  const isOpen = isInline || panels.comments;
  const canEdit = ['owner', 'admin', 'editor'].includes(userRole);
  const canComment = ['owner', 'admin', 'editor', 'commenter'].includes(userRole);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Local state (initialized to true by default to avoid useEffect setState lints)
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // @mention autocomplete state
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionActiveIndex, setMentionActiveIndex] = useState(0);

  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 1. Fetch Comments & Workspace Members list on mount
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function loadResources() {
      try {
        // Fetch comments with joined profiles
        const { data: commentsData } = await (supabase
          .from('workflow_comments')
          .select('*, profiles:created_by (full_name, avatar_url, email)')
          .eq('workflow_id', workflowId)
          .order('created_at', { ascending: true }) as unknown as Promise<{ data: EditorComment[] | null }>);

        if (commentsData && active) {
          setComments(commentsData);
        }

        // Fetch workspace members for @mention dropdown
        const { data: membersData } = await (supabase
          .from('workspace_members')
          .select('user_id, profiles:user_id (full_name, email)')
          .eq('workspace_id', workspaceId) as unknown as Promise<{
            data: { user_id: string; profiles: { full_name: string | null; email: string } | null }[] | null;
          }>);

        if (membersData && active) {
          const list: MemberInfo[] = [];
          membersData.forEach((m) => {
            if (m.profiles) {
              list.push({
                id: m.user_id,
                fullName: m.profiles.full_name || 'Anonymous User',
                email: m.profiles.email,
              });
            }
          });
          setMembers(list);
        }
      } catch (err) {
        console.error('Failed to load comments panel:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadResources();

    return () => {
      active = false;
    };
  }, [isOpen, workflowId, workspaceId, supabase, setComments]);

  // Group threads: Roots and nested Replies
  const threads = useMemo(() => {
    // Filter comments based on node context selection
    const scopeComments = selectedNodeId
      ? comments.filter((c) => c.node_id === selectedNodeId)
      : comments;

    const roots = scopeComments.filter((c) => c.parent_id === null);
    const repliesMap: Record<string, EditorComment[]> = {};

    comments.forEach((c) => {
      if (c.parent_id) {
        if (!repliesMap[c.parent_id]) {
          repliesMap[c.parent_id] = [];
        }
        repliesMap[c.parent_id].push(c);
      }
    });

    return { roots, repliesMap };
  }, [comments, selectedNodeId]);

  // 2. Submit New Comment (Root)
  const handleAddRootComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !canComment) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const bodyVal = commentText.trim();
      setCommentText('');

      const { data, error } = await (supabase.from('workflow_comments') as unknown as {
        insert: (arg: Record<string, unknown>) => {
          select: (fields: string) => {
            single: () => Promise<{ data: EditorComment | null; error: { message: string } | null }>;
          };
        };
      }).insert({
        workflow_id: workflowId,
        node_id: selectedNodeId || null,
        body: bodyVal,
        created_by: user.id,
      }).select('*, profiles:created_by (full_name, avatar_url, email)').single();

      if (error) throw new Error(error.message);
      if (data) {
        addComment(data);
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
    }
  };

  // 3. Submit Reply
  const handleAddReply = async (parentCommentId: string) => {
    if (!replyText.trim() || !canComment) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const bodyVal = replyText.trim();
      setReplyText('');
      setReplyingToId(null);

      const { data, error } = await (supabase.from('workflow_comments') as unknown as {
        insert: (arg: Record<string, unknown>) => {
          select: (fields: string) => {
            single: () => Promise<{ data: EditorComment | null; error: { message: string } | null }>;
          };
        };
      }).insert({
        workflow_id: workflowId,
        node_id: selectedNodeId || null,
        parent_id: parentCommentId,
        body: bodyVal,
        created_by: user.id,
      }).select('*, profiles:created_by (full_name, avatar_url, email)').single();

      if (error) throw new Error(error.message);
      if (data) {
        addComment(data);
      }
    } catch (err) {
      console.error('Failed to submit reply:', err);
    }
  };

  // 4. Resolve Comment Thread
  const handleToggleResolve = async (commentId: string, currentlyResolved: boolean) => {
    if (!canEdit) return;

    const resolvedVal = currentlyResolved ? null : new Date().toISOString();

    try {
      const { error } = await (supabase.from('workflow_comments') as unknown as {
        update: (arg: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      })
        .update({ resolved_at: resolvedVal })
        .eq('id', commentId);

      if (error) throw error;

      (updateComment as (id: string, updates: Record<string, unknown>) => void)(commentId, { resolved_at: resolvedVal });
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  // 5. `@mention` parsing logic inside textareas
  const handleTextareaChange = (val: string) => {
    setCommentText(val);

    const words = val.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      setShowMentions(true);
      setMentionQuery(lastWord.substring(1));
      setMentionActiveIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((m) =>
      m.fullName.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(mentionQuery.toLowerCase())
    );
  }, [members, mentionQuery]);

  const selectMention = (member: MemberInfo) => {
    const words = commentText.split(/\s+/);
    words[words.length - 1] = `@${member.fullName} `;
    setCommentText(words.join(' '));
    setShowMentions(false);
    
    if (commentTextareaRef.current) {
      commentTextareaRef.current.focus();
    }
  };

  // Parse @mentions in body text to style them with bold colored tags
  const renderFormattedBody = (bodyText: string) => {
    const parts = bodyText.split(/(@[a-zA-Z0-9\s_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-purple-600 font-bold bg-purple-500/10 px-1 rounded-md">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Helper to format date
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  // Header display strings based on selections
  const headerTitle = selectedNodeId 
    ? (isRtl ? `تعليقات ${selectedNode?.data.label || 'العقدة'}` : `${selectedNode?.data.label || 'Node'} Comments`) 
    : (isRtl ? 'خلاصة التعليقات' : 'Comments Feed');

  if (!isOpen) return null;

  return (
    <aside className={`w-80 border-y-0 ${
      isRtl ? 'border-r border-l-0' : 'border-l border-r-0'
    } border-border bg-background/55 backdrop-blur-md flex flex-col h-full z-10 relative shrink-0`}>
      {/* 1. Header panel info */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          <h2 className="font-bold text-sm font-sans tracking-tight">{headerTitle}</h2>
        </div>
        <button
          onClick={() => togglePanel('comments')}
          className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer text-muted-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Node back-navigator banner */}
      {selectedNodeId && (
        <div className="p-3 bg-muted/40 border-b border-border/60 flex items-center justify-between">
          <button
            onClick={() => setSelectedNode(null)}
            className="flex items-center gap-1 text-[10px] font-semibold text-accent hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isRtl ? 'جميع تعليقات اللوحة' : 'All Canvas Comments'}</span>
          </button>
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-muted-foreground bg-border/40 px-1.5 py-0.5 rounded-md">
            {isRtl ? 'عرض العقدة' : 'Node View'}
          </span>
        </div>
      )}

      {/* 2. List scroll of root threads */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground/35 mb-2" />
            <p className="text-xs text-muted-foreground font-light">{isRtl ? 'جاري تحميل خلاصة التعليقات...' : 'Loading comments thread...'}</p>
          </div>
        ) : threads.roots.length === 0 ? (
          <div className="text-center py-20 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/25" />
            <p className="text-xs text-muted-foreground font-light max-w-[200px] mx-auto leading-relaxed">
              {isRtl ? 'لا توجد تعليقات بعد. قم بتحديد العناصر أو النقر على اللوحة لكتابة التعليقات.' : 'No comments created yet. Highlight elements or tap the canvas to write threads.'}
            </p>
          </div>
        ) : (
          threads.roots.map((root) => {
            const replies = threads.repliesMap[root.id] || [];
            const isResolved = !!root.resolved_at;
            const userColor = getCollaboratorColor(root.created_by);
            const userInitials = root.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

            return (
              <div 
                key={root.id} 
                className={`p-3.5 border rounded-2xl transition-all flex flex-col gap-3 relative overflow-hidden bg-background/60 shadow-xs ${
                  isResolved ? 'border-border/30 opacity-60 bg-muted/10' : 'border-border'
                }`}
              >
                {/* Visual accent left line matching deterministic color */}
                <div className={cn("absolute top-0 bottom-0 w-1", isRtl ? "right-0" : "left-0")} style={{ backgroundColor: userColor }} />

                <div className={cn("flex items-start justify-between gap-2", isRtl ? "pr-1.5" : "pl-1.5")}>
                  <div className="flex items-center gap-2">
                    {/* User initials initials or avatar badge */}
                    <div 
                      className="w-7 h-7 rounded-full text-[10px] font-bold text-white flex items-center justify-center border border-white/10 shrink-0"
                      style={{ backgroundColor: userColor }}
                    >
                      {userInitials}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs leading-none text-foreground">
                        {root.profiles?.full_name || 'Collaborator'}
                      </h4>
                      <span className="text-[8px] text-muted-foreground/60">
                        {formatTime(root.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Resolve check action */}
                  {canEdit && (
                    <button
                      onClick={() => handleToggleResolve(root.id, isResolved)}
                      className={`h-6 px-2 rounded-lg text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                        isResolved 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-muted hover:bg-muted/95 text-muted-foreground border-border'
                      }`}
                      title={isResolved ? (isRtl ? "إعادة فتح الموضوع" : "Reopen thread") : (isRtl ? "حل الموضوع" : "Resolve thread")}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isResolved ? (isRtl ? 'تم الحل' : 'Resolved') : (isRtl ? 'حل' : 'Resolve')}</span>
                    </button>
                  )}
                </div>

                <p className={cn("text-[11px] font-light text-foreground leading-normal", isRtl ? "pr-1.5" : "pl-1.5")}>
                  {renderFormattedBody(root.body)}
                </p>

                {/* Reply button action */}
                {!isResolved && canComment && replyingToId !== root.id && (
                  <div className={cn(isRtl ? "pr-1.5" : "pl-1.5")}>
                    <button
                      onClick={() => {
                        setReplyingToId(root.id);
                        setReplyText('');
                      }}
                      className="text-[9px] font-bold text-accent hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <CornerDownRight className={cn("w-3 h-3", isRtl && "scale-x-[-1]")} />
                      <span>{isRtl ? 'رد' : 'Reply'}</span>
                    </button>
                  </div>
                )}

                {/* Nested Replies Lists */}
                {replies.length > 0 && (
                  <div className={cn("space-y-3 mt-1.5", isRtl ? "pr-5 border-r border-l-0 border-border/50" : "pl-5 border-l border-r-0 border-border/50")}>
                    {replies.map((reply) => {
                      const repColor = getCollaboratorColor(reply.created_by);
                      const repInitials = reply.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

                      return (
                        <div key={reply.id} className={cn("space-y-1.5 relative", isRtl ? "pr-1" : "pl-1")}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-5.5 h-5.5 rounded-full text-[8px] font-bold text-white flex items-center justify-center border border-white/5 shrink-0"
                              style={{ backgroundColor: repColor }}
                            >
                              {repInitials}
                            </div>
                            <div>
                              <h5 className="font-bold text-[10px] leading-none text-foreground">
                                {reply.profiles?.full_name || 'Collaborator'}
                              </h5>
                              <span className="text-[7px] text-muted-foreground/50">
                                {formatTime(reply.created_at)}
                              </span>
                            </div>
                          </div>
                          <p className={cn("text-[10px] font-light text-foreground leading-normal", isRtl ? "pr-0.5" : "pl-0.5")}>
                            {renderFormattedBody(reply.body)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline nested Reply Input field */}
                {replyingToId === root.id && (
                  <div className={cn("pt-2 border-t border-border/20 flex gap-2", isRtl ? "pr-1.5" : "pl-1.5")}>
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={isRtl ? "اكتب رداً..." : "Write inline reply..."}
                      className="flex-1 h-7 rounded-lg border border-border bg-background px-2.5 text-[10px] font-light focus:outline-hidden focus:ring-1 focus:ring-accent"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddReply(root.id)}
                      className="h-7 px-2.5 rounded-lg text-[9px] bg-accent hover:bg-accent/90"
                    >
                      <Send className={cn("w-2.5 h-2.5", isRtl && "scale-x-[-1]")} />
                    </Button>
                    <button
                      onClick={() => setReplyingToId(null)}
                      className="h-7 w-7 rounded-lg border border-border hover:bg-muted text-muted-foreground flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Textarea Form at bottom for root comment */}
      {canComment && (
        <div className="p-4 border-t border-border bg-background/30 backdrop-blur-md relative">
          
          {/* Autocomplete dropdown suggestion overlay */}
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute left-4 right-4 bottom-22 bg-background border border-border shadow-xl rounded-2xl overflow-hidden max-h-[140px] overflow-y-auto custom-scrollbar z-50 animate-fadeIn">
              <div className="p-2 bg-muted/40 border-b border-border text-[8px] font-bold uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent" />
                <span>{isRtl ? 'إشارة إلى زميل' : 'Mentions Teammate'}</span>
              </div>
              <div className="divide-y divide-border/40">
                {filteredMembers.map((m, idx) => (
                  <button
                    key={m.id}
                    onClick={() => selectMention(m)}
                    className={cn("w-full px-3.5 py-2 text-[10px] flex flex-col cursor-pointer transition-colors", isRtl ? "text-right" : "text-left", idx === mentionActiveIndex ? 'bg-accent/10 text-accent font-semibold' : 'hover:bg-muted text-foreground')}
                  >
                    <span>{m.fullName}</span>
                    <span className="text-[8px] text-muted-foreground font-light">{m.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleAddRootComment} className="flex flex-col gap-2.5">
            <div className="relative">
              <Textarea
                ref={commentTextareaRef}
                value={commentText}
                onChange={(e) => handleTextareaChange(e.target.value)}
                placeholder={selectedNodeId ? (isRtl ? "تعليق على العقدة المحددة..." : "Comment on selected node...") : (isRtl ? "اترك تعليقاً على اللوحة..." : "Leave canvas comment...")}
                rows={2}
                className={cn("rounded-xl border-border text-xs focus:ring-accent font-light resize-none bg-background/55", isRtl ? "pl-8 pr-3" : "pr-8 pl-3")}
              />
              <div className={cn("absolute top-3 text-[10px] text-muted-foreground select-none pointer-events-none", isRtl ? "left-3" : "right-3")}>
                @
              </div>
            </div>

            <Button
              type="submit"
              disabled={!commentText.trim()}
              className="bg-accent hover:bg-accent/90 text-white rounded-xl h-8 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <Send className={cn("w-3.5 h-3.5", isRtl && "scale-x-[-1]")} />
              <span>{isRtl ? 'بث التعليق' : 'Broadcast Comment'}</span>
            </Button>
          </form>
        </div>
      )}
    </aside>
  );
}
