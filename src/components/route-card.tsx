import { AlertTriangle, ArrowRightLeft, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import type { Occurrence } from "@/lib/schedule";
import { cn } from "@/lib/utils";

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(v, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getContrastText(hex: string): string {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const num = parseInt(v, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#000" : "#fff";
}

export function RouteCard({
  occ,
  onClick,
  draggable = true,
}: {
  occ: Occurrence;
  onClick?: () => void;
  draggable?: boolean;
}) {
  const color = occ.color ?? occ.fraction?.color ?? "#6B7280";
  const id = `${occ.ruleId}__${occ.date}`;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled: !draggable,
    data: { occurrence: occ },
  });

  const style: React.CSSProperties = {
    backgroundColor: hexToRgba(color, 0.22),
    borderColor: color,
    color: "var(--color-foreground)",
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "route-card group relative cursor-pointer select-none rounded-md border-[3px] p-2 brutal-shadow-sm transition-transform",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:brutal-shadow",
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-1">
        {draggable && (
          <button
            {...listeners}
            {...attributes}
            onClick={(e) => e.stopPropagation()}
            className="touch-none cursor-grab opacity-50 hover:opacity-100"
            aria-label="Przeciągnij"
          >
            <GripVertical className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm border border-black"
              style={{ backgroundColor: color }}
            />
            <span className="truncate font-display text-sm font-black uppercase leading-tight">
              {occ.ruleName}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-80">
            {occ.fraction?.label ?? "Bez frakcji"}
            {occ.movedFrom && (
              <span className="inline-flex items-center gap-0.5 rounded-sm bg-black/30 px-1 py-px text-[9px]">
                <ArrowRightLeft className="h-2.5 w-2.5" /> przeniesiono
              </span>
            )}
            <span className="ml-auto rounded-sm bg-black/40 px-1 py-px text-[9px] text-white">
              {occ.segment === "residential" ? "M" : "F"}
            </span>
          </div>
        </div>
      </div>
      {occ.isHoliday && (
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-accent text-accent-foreground">
          <AlertTriangle className="h-3 w-3" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}
