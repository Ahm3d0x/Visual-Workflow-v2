'use client';

export interface EditorPermissions {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canDelete: boolean;
  canRestoreVersion: boolean;
}

export function useEditorPermissions(userRole: string): EditorPermissions {
  return {
    canEdit: ['owner', 'admin', 'editor'].includes(userRole),
    canComment: ['owner', 'admin', 'editor', 'commenter'].includes(userRole),
    canShare: ['owner', 'admin'].includes(userRole),
    canDelete: userRole === 'owner',
    canRestoreVersion: ['owner', 'admin', 'editor'].includes(userRole),
  };
}
