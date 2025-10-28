import React from "react";

type Member = { id: string; display_name: string; color: string };

export default function MemberLegend({
  members,
  activeIds,
  onToggle,
}: {
  members: Member[];
  activeIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 py-2">
      {members.map((m) => {
        const active = activeIds.has(m.id);
        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${
              active ? "opacity-100" : "opacity-60"
            }`}
            style={{ borderColor: m.color }}
            title={m.display_name}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ background: m.color }}
            />
            <span>{m.display_name}</span>
          </button>
        );
      })}
    </div>
  );
}
