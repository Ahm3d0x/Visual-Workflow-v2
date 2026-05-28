'use client';

import { useEditorStore } from '@/stores/editorStore';
import { useViewport } from '@xyflow/react';

export function CursorOverlay() {
  const collaborators = useEditorStore((s) => s.collaborators);
  const viewport = useViewport();

  // If there are no active collaborators, skip rendering
  const activeIds = Object.keys(collaborators);
  if (activeIds.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {activeIds.map((id) => {
        const col = collaborators[id];
        if (col.x === undefined || col.y === undefined) return null;

        // Convert collaborator canvas-flow coordinates to screen-view offsets dynamically
        const xOffset = viewport.x + col.x * viewport.zoom;
        const yOffset = viewport.y + col.y * viewport.zoom;

        return (
          <div
            key={id}
            className="absolute transition-all duration-100 ease-out flex flex-col gap-1 items-start select-none will-change-transform"
            style={{
              left: xOffset,
              top: yOffset,
            }}
          >
            {/* High-fidelity Cursor Mouse Pointer SVG */}
            <svg
              width="18"
              height="20"
              viewBox="0 0 18 20"
              fill="none"
              className="drop-shadow-md shrink-0"
              style={{ color: col.color }}
            >
              <path
                d="M1.5 1.5V17L6 12.5H14.5L1.5 1.5Z"
                fill="currentColor"
                stroke="white"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>

            {/* Stylized Collaborator Badge */}
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow-md tracking-wide flex items-center gap-1 border border-white/20 whitespace-nowrap"
              style={{ backgroundColor: col.color }}
            >
              <span>{col.fullName}</span>
              <span className="text-[7px] uppercase bg-black/25 px-1 py-0.2 rounded-md font-mono tracking-normal">
                {col.role}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
