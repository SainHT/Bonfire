import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Sparkles, GraduationCap } from "lucide-react";
import type { CommunityMatch } from "@/types";

interface Props {
  items: CommunityMatch[];
  loading: boolean;
  loadingCopy: string;
  onSelect: (c: CommunityMatch) => void;
}

export function DiscoveryFeed({ items, loading, loadingCopy, onSelect }: Props) {
  return (
    <div className="space-y-5">
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="vintage-card rounded-lg px-5 py-3 flex items-center gap-3"
          >
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="font-display italic text-foreground/80">{loadingCopy}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && items.length === 0 && (
        <div className="vintage-card rounded-lg p-10 text-center">
          <p className="font-display text-2xl">No flyers on the board.</p>
          <p className="text-muted-foreground mt-2 text-sm">Try widening your filters.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="vintage-card rounded-lg overflow-hidden flex flex-col text-left hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-primary/20 transition-all duration-200 will-change-transform"
          >
              {c.image_url && (
                <div className="h-28 overflow-hidden">
                  <img
                    src={c.image_url}
                    alt=""
                    className="h-full w-full object-cover sepia-[0.15] saturate-[0.9]"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary/80">
                    {c.city} · {c.category}
                  </span>
                  {c.is_university_affiliated && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-accent-foreground bg-accent/30 border border-accent/40 rounded-full px-2 py-0.5">
                      <GraduationCap className="h-3 w-3" /> Uni
                    </span>
                  )}
                </div>
                <h3 className="font-display text-lg leading-tight line-clamp-2">{c.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.description_short}</p>
                <div className="dashed-rule mt-auto" />
                <div className="flex items-center justify-between text-[11px] text-foreground/70">
                  <span className="inline-flex items-center gap-1 truncate">
                    <MapPin className="h-3 w-3 text-primary/70" />
                    <span className="truncate">{c.location_type}</span>
                  </span>
                  <span className="font-medium text-primary/90">
                    {c.estimated_annual_fee_eur != null && c.estimated_annual_fee_eur > 0
                      ? `€ ${c.estimated_annual_fee_eur}/yr`
                      : "Free"}
                  </span>
                </div>
              </div>
          </button>
        ))}
      </div>
    </div>
  );
}
