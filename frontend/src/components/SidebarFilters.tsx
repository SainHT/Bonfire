import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import type { CommunityMatch, DiscoveryFilters } from "@/types";
import { useMemo } from "react";

interface Props {
  filters: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
  onReset: () => void;
  communities: CommunityMatch[];
  query: string;
  onQueryChange: (value: string) => void;
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function SidebarFilters({ filters, onChange, onReset, communities, query, onQueryChange }: Props) {
  // Every filter option is derived from the actual stored data — nothing hardcoded.
  const opts = useMemo(() => {
    const tagCount = new Map<string, number>();
    communities.forEach((c) => c.tags.forEach((t) => tagCount.set(t, (tagCount.get(t) ?? 0) + 1)));
    return {
      cities: unique(communities.map((c) => c.city)).sort(),
      categories: unique(communities.map((c) => c.category)).sort(),
      languages: unique(communities.map((c) => c.primary_language)).sort(),
      institutions: unique(communities.map((c) => c.institution)).sort(),
      venues: unique(communities.map((c) => c.location_type)).sort(),
      tags: Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([t]) => t),
      maxFee: Math.max(0, ...communities.map((c) => c.estimated_annual_fee_eur ?? 0)),
      ageMin: communities.length ? Math.min(...communities.map((c) => c.min_age ?? 99)) : 14,
      ageMax: communities.length ? Math.max(...communities.map((c) => c.max_age ?? 0)) : 80,
    };
  }, [communities]);

  const toggle = <K extends "cities" | "categories" | "languages" | "institutions" | "tags" | "locationTypes">(
    key: K,
    value: string,
  ) => {
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next } as DiscoveryFilters);
  };

  return (
    <aside className="vintage-card rounded-lg p-5 space-y-5 text-sm">
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80">The Filing Cabinet</p>
        <h2 className="font-display text-xl">Narrow your search</h2>
        <div className="dashed-rule mt-3" />
      </header>

      <section className="space-y-2">
        <Label className="font-display text-sm">Quick filter</Label>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-primary/70" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Name, tag, or keyword…"
            className="w-full pl-8 pr-7 py-2 rounded-md border border-primary/25 bg-background/70 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="Clear filter text"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Plain string match — for The Scout's AI search, use the bar up top.
        </p>
      </section>

      <div className="dashed-rule" />

      <section className="space-y-2">
        <Label className="font-display text-sm">Sort by</Label>
        <Select value={filters.sort} onValueChange={(v) => onChange({ ...filters, sort: v as DiscoveryFilters["sort"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Featured</SelectItem>
            <SelectItem value="alphabetical">A → Z</SelectItem>
            <SelectItem value="fee-asc">Fee: low to high</SelectItem>
            <SelectItem value="fee-desc">Fee: high to low</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <div className="dashed-rule" />

      <ChecklistSection label="City" options={opts.cities} selected={filters.cities} onToggle={(v) => toggle("cities", v)} />
      <div className="dashed-rule" />

      <ChipSection label="Category" options={opts.categories} selected={filters.categories} onToggle={(v) => toggle("categories", v)} />
      <div className="dashed-rule" />

      <ChecklistSection label="Institution" options={opts.institutions} selected={filters.institutions} onToggle={(v) => toggle("institutions", v)} />
      <div className="dashed-rule" />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-display text-sm">Age range</Label>
          <span className="text-xs text-muted-foreground">{filters.ageRange[0]} – {filters.ageRange[1]}</span>
        </div>
        <Slider
          min={Math.min(14, opts.ageMin)} max={Math.max(80, opts.ageMax)} step={1}
          value={filters.ageRange}
          onValueChange={(v) => onChange({ ...filters, ageRange: [v[0], v[1]] as [number, number] })}
        />
      </section>

      <div className="dashed-rule" />

      <ChecklistSection label="Language" options={opts.languages} selected={filters.languages} onToggle={(v) => toggle("languages", v)} />
      <div className="dashed-rule" />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-display text-sm">Free only</Label>
          <Switch checked={filters.freeOnly} onCheckedChange={(v) => onChange({ ...filters, freeOnly: v })} />
        </div>
        {!filters.freeOnly && (
          <>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Max annual fee</Label>
              <span className="text-xs text-muted-foreground">€ {filters.maxFee}</span>
            </div>
            <Slider min={0} max={Math.max(50, opts.maxFee)} step={10}
              value={[filters.maxFee]}
              onValueChange={(v) => onChange({ ...filters, maxFee: v[0] })}
            />
          </>
        )}
      </section>

      <div className="dashed-rule" />

      <ChecklistSection label="Venue type" options={opts.venues} selected={filters.locationTypes} onToggle={(v) => toggle("locationTypes", v)} scroll />
      <div className="dashed-rule" />

      {opts.tags.length > 0 && (
        <ChipSection label="Popular tags" options={opts.tags} selected={filters.tags} onToggle={(v) => toggle("tags", v)} />
      )}

      <Button variant="outline" className="w-full border-primary/30" onClick={onReset}>
        Reset filters
      </Button>
    </aside>
  );
}

function ChecklistSection({
  label, options, selected, onToggle, scroll,
}: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; scroll?: boolean }) {
  return (
    <section className="space-y-2">
      <Label className="font-display text-sm">{label}</Label>
      <div className={`grid gap-1.5 ${scroll ? "max-h-36 overflow-y-auto pr-1" : ""}`}>
        {options.map((o) => (
          <label key={o} className="flex items-center gap-2 cursor-pointer text-xs">
            <Checkbox checked={selected.includes(o)} onCheckedChange={() => onToggle(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

function ChipSection({
  label, options, selected, onToggle,
}: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <section className="space-y-2">
      <Label className="font-display text-sm">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              onClick={() => onToggle(o)}
              className={`rounded-full px-3 py-1 text-xs border transition ${
                active ? "bg-primary text-primary-foreground border-primary" : "border-primary/30 hover:bg-primary/10"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </section>
  );
}
