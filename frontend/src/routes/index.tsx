import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SidebarFilters } from "@/components/SidebarFilters";
import { DiscoveryFeed } from "@/components/DiscoveryFeed";
import { CommunityDialog } from "@/components/CommunityDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  fetchCommunities,
  isRecommenderCity,
  passesFilters,
  recommend,
  sortCommunities,
} from "@/services/api";
import type {
  CommunityMatch,
  DiscoveryFilters,
  RecommenderCity,
} from "@/types";
import bonfireLogo from "@/assets/bonfire-logo.jpeg";

export const Route = createFileRoute("/")({
  component: Home,
});

const DEFAULT_FILTERS: DiscoveryFilters = {
  cities: [],
  categories: [],
  ageRange: [16, 60],
  languages: [],
  institutions: [],
  tags: [],
  maxFee: 500,
  freeOnly: false,
  locationTypes: [],
  sort: "newest",
};

const LOADING_LINES = [
  "Scouring local bulletin boards…",
  "Matching your vibe…",
  "Asking the regulars at the café…",
  "Cross-referencing handwritten flyers…",
];

const SCOUT_STARTERS = [
  "Acting group for beginners",
  "English-speaking sports in Rotterdam",
  "Quiet weekday-evening hobby",
];

const PAGE_SIZE = 24;
const RECOMMEND_LIMIT = 50;
const DEFAULT_RECOMMENDER_CITY: RecommenderCity = "Delft";

function pickRecommenderCity(filterCities: string[]): RecommenderCity {
  // Backend only accepts Delft / Den Haag / Rotterdam, and exactly one city.
  for (const c of filterCities) {
    if (isRecommenderCity(c)) return c;
  }
  return DEFAULT_RECOMMENDER_CITY;
}

function Home() {
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [scoutText, setScoutText] = useState("");
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [recommendedIds, setRecommendedIds] = useState<string[] | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(LOADING_LINES[0]);
  const [selected, setSelected] = useState<CommunityMatch | null>(null);
  const [page, setPage] = useState(1);

  const {
    data: allCommunities = [],
    isLoading: communitiesLoading,
    isError: communitiesError,
    error: communitiesErrorObj,
  } = useQuery({
    queryKey: ["communities"],
    queryFn: ({ signal }) => fetchCommunities({ signal }),
    staleTime: 5 * 60_000,
  });

  // If The Scout has produced a ranking, project full community objects in that order.
  const ranked = useMemo<CommunityMatch[]>(() => {
    if (!recommendedIds) return allCommunities;
    const byId = new Map(allCommunities.map((c) => [c.id, c]));
    const out: CommunityMatch[] = [];
    for (const id of recommendedIds) {
      const c = byId.get(id);
      if (c) out.push(c);
    }
    return out;
  }, [allCommunities, recommendedIds]);

  const visible = useMemo(() => {
    const q = sidebarQuery.toLowerCase().trim();
    const filtered = ranked
      .filter((c) => passesFilters(c, filters))
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.tags.join(" ").toLowerCase().includes(q) ||
          (c.description_short ?? "").toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
        );
      });
    return recommendedIds ? filtered : sortCommunities(filtered, filters.sort);
  }, [ranked, filters, sidebarQuery, recommendedIds]);

  useEffect(() => {
    setPage(1);
  }, [filters, sidebarQuery, recommendedIds, allCommunities.length]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageItems = visible.slice(pageStart, pageStart + PAGE_SIZE);
  const rangeStart = visible.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + PAGE_SIZE, visible.length);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % LOADING_LINES.length;
      setLoadingCopy(LOADING_LINES[i]);
    }, 900);
    return () => clearInterval(t);
  }, [loading]);

  const askScout = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || loading) return;
    setLoading(true);
    setAskError(null);
    setLoadingCopy(LOADING_LINES[0]);
    const city = pickRecommenderCity(filters.cities);
    try {
      const [result] = await Promise.all([
        recommend({ city, interests: text, limit: RECOMMEND_LIMIT }),
        new Promise((r) => setTimeout(r, 400)),
      ]);
      setRecommendedIds(result.orderedIds);
      setActivePrompt(text);
    } catch (e) {
      setAskError(
        e instanceof Error ? e.message : "The Scout couldn't reach the backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  const resetScout = () => {
    setRecommendedIds(null);
    setActivePrompt(null);
    setScoutText("");
    setAskError(null);
  };

  const scoutActive = recommendedIds !== null;
  const scoutCity = pickRecommenderCity(filters.cities);
  const cityNotice =
    filters.cities.length > 0 && !filters.cities.some(isRecommenderCity);

  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-double border-primary/40 bg-card/70 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={bonfireLogo}
              alt="Bonfire"
              className="h-12 w-12 pixel-art rounded-sm border border-primary/20 bg-card"
            />
            <div className="leading-tight">
              <p className="font-display text-2xl text-primary tracking-tight">Bonfire</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                For students &amp; newcomers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="max-w-[1400px] mx-auto px-5 pt-8 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="vintage-card rounded-md p-6 md:p-10 relative overflow-hidden text-center"
        >
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-accent/15 blur-2xl" />
          <h1 className="font-display text-3xl md:text-5xl leading-[1.05] mx-auto max-w-3xl">
            Find a circle that feels like home.
          </h1>
          <p className="mt-3 mx-auto text-foreground/75 max-w-2xl text-sm md:text-base">
            A hand-kept directory of student associations, sports clubs and creative circles —
            starting in Delft, Den Haag and Rotterdam, with more cities on the way.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askScout(scoutText);
            }}
            className="mt-8 mx-auto flex flex-col sm:flex-row gap-3 max-w-3xl w-full"
          >
            <div className="relative flex-1">
              <Sparkles className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-primary/80" />
              <input
                value={scoutText}
                onChange={(e) => setScoutText(e.target.value)}
                placeholder="Tell The Scout what you're looking for — e.g. weekend hiking, English-speaking"
                disabled={loading}
                className="w-full pl-12 pr-4 py-4 rounded-lg border border-primary/25 bg-background/70 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={loading || !scoutText.trim()}
                className="shrink-0 px-6 py-4 h-auto text-base"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
                <span className="ml-2">Ask The Scout</span>
              </Button>
              <div className="lg:hidden">
                <MobileSheet
                  trigger={
                    <Button variant="outline" size="lg" className="border-primary/30 h-auto py-4">
                      <Filter className="h-4 w-4 mr-1" /> Filters
                    </Button>
                  }
                  title="Filters"
                >
                  <SidebarFilters
                    filters={filters}
                    onChange={setFilters}
                    onReset={() => setFilters(DEFAULT_FILTERS)}
                    communities={allCommunities}
                    query={sidebarQuery}
                    onQueryChange={setSidebarQuery}
                  />
                </MobileSheet>
              </div>
            </div>
          </form>

          <div className="mt-4 mx-auto max-w-3xl flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Try
            </span>
            {SCOUT_STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={loading}
                onClick={() => {
                  setScoutText(s);
                  void askScout(s);
                }}
                className="rounded-full border border-dashed border-primary/30 px-2.5 py-0.5 text-[11px] text-primary/80 hover:bg-primary/5 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              · Scout searches in <span className="text-primary">{scoutCity}</span>
            </span>
          </div>

          {cityNotice && (
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              The Scout only supports Delft / Den Haag / Rotterdam — defaulting to {DEFAULT_RECOMMENDER_CITY}.
            </p>
          )}

          {scoutActive && activePrompt && (
            <div className="mt-4 flex justify-center">
              <div className="inline-flex items-center gap-2 text-[11px] rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-foreground/80">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>
                  Ranked by Scout for <span className="italic">"{activePrompt}"</span>
                </span>
                <button
                  type="button"
                  onClick={resetScout}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <RotateCcw className="h-3 w-3" /> Clear
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      <main className="max-w-[1400px] mx-auto px-5 pb-16 grid lg:grid-cols-[300px_minmax(0,1fr)] gap-6">
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            <SidebarFilters
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              communities={allCommunities}
              query={sidebarQuery}
              onQueryChange={setSidebarQuery}
            />
          </div>
        </div>

        <section id="feed">
          <div className="flex items-baseline justify-between mb-4 gap-3">
            <h2 className="font-display text-2xl md:text-3xl">On the board</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {communitiesLoading
                ? "Loading…"
                : `${visible.length} listing${visible.length === 1 ? "" : "s"}${
                    scoutActive ? " · ranked by Scout" : ""
                  }`}
            </p>
          </div>

          {communitiesError && (
            <div className="vintage-card rounded-lg p-6 mb-4 text-sm text-destructive">
              <p className="font-display text-lg">Couldn't load the board.</p>
              <p className="mt-1 text-foreground/80">
                {communitiesErrorObj instanceof Error
                  ? communitiesErrorObj.message
                  : "Unknown error."}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                Make sure the backend is running on{" "}
                <code>http://localhost:8000</code>.
              </p>
            </div>
          )}

          {askError && (
            <div className="vintage-card rounded-lg p-4 mb-4 text-xs text-destructive">
              The Scout stumbled: {askError}
            </div>
          )}

          <DiscoveryFeed
            items={pageItems}
            loading={loading || communitiesLoading}
            loadingCopy={communitiesLoading ? "Fetching the latest board…" : loadingCopy}
            onSelect={setSelected}
          />

          {visible.length > 0 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              total={visible.length}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </section>
      </main>

      <CommunityDialog community={selected} onOpenChange={(o) => !o && setSelected(null)} />

      <footer id="about" className="border-t border-primary/15 bg-card/50">
        <div className="max-w-[1400px] mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© Bonfire — built by students, for students.</p>
          <p className="font-display italic">Gather around. Stay a while.</p>
        </div>
      </footer>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  total,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-6 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        Showing all {total} listing{total === 1 ? "" : "s"}
      </p>
    );
  }
  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 vintage-card rounded-lg px-4 py-3"
    >
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30"
          onClick={onPrev}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Prev
        </Button>
        <span className="text-xs font-medium text-foreground/80 px-2">
          Page {page} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="border-primary/30"
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </nav>
  );
}

function MobileSheet({
  trigger, title, children, side = "left",
}: {
  trigger: React.ReactNode;
  title: string;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side={side} className="bg-background overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
