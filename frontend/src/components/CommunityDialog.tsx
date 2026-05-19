import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Languages, GraduationCap, ExternalLink, Mail, Instagram, Banknote, Users } from "lucide-react";
import type { CommunityMatch } from "@/types";

interface Props {
  community: CommunityMatch | null;
  onOpenChange: (open: boolean) => void;
}

export function CommunityDialog({ community, onOpenChange }: Props) {
  const c = community;
  return (
    <Dialog open={!!c} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 bg-card max-h-[88vh] overflow-y-auto [&>button]:top-3 [&>button]:right-3 [&>button]:bg-card/90 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:border [&>button]:border-primary/30 [&>button]:shadow">
        {c && (
          <>
            {c.image_url && (
              <div className="h-48 w-full overflow-hidden border-b border-primary/15">
                <img src={c.image_url} alt={c.name} className="h-full w-full object-cover sepia-[0.12] saturate-[0.9]" />
              </div>
            )}
            <div className="p-6 space-y-4">
              <DialogHeader>
                <p className="text-[11px] uppercase tracking-[0.25em] text-primary/80">
                  {c.city} · {c.category} · {c.is_university_affiliated ? "University" : "Independent"}
                </p>
                <DialogTitle className="font-display text-3xl leading-tight">
                  {c.name}
                  {c.acronym && <span className="text-muted-foreground text-base font-sans"> · {c.acronym}</span>}
                </DialogTitle>
              </DialogHeader>

              <p className="text-sm leading-relaxed text-foreground/85">
                {c.description_full || c.description_short}
              </p>

              <div className="dashed-rule" />

              <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                <Row icon={MapPin} label="Where">{c.address ? `${c.address}${c.postal_code ? `, ${c.postal_code}` : ""}` : c.location_type}</Row>
                <Row icon={GraduationCap} label="Institution">{c.institution}</Row>
                <Row icon={Languages} label="Language">{c.primary_language}</Row>
                <Row icon={Users} label="Ages">{c.min_age ?? "—"}–{c.max_age ?? "—"}</Row>
                <Row icon={Banknote} label="Annual fee">
                  {c.estimated_annual_fee_eur != null && c.estimated_annual_fee_eur > 0
                    ? `€ ${c.estimated_annual_fee_eur}`
                    : "Free"}
                </Row>
                <Row label="Venue">{c.location_type}</Row>
              </dl>

              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {c.tags.map((t) => (
                    <span key={t} className="text-[10px] uppercase tracking-wider text-primary/80 border border-dashed border-primary/30 rounded-full px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <div className="dashed-rule" />

              <div className="flex flex-wrap gap-3 text-sm">
                {c.website_url && (
                  <a href={c.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> Visit website
                  </a>
                )}
                {c.contact_email && (
                  <a href={`mailto:${c.contact_email}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {c.contact_email}
                  </a>
                )}
                {c.instagram_url && (
                  <a href={c.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-foreground/80 hover:text-primary">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ icon: Icon, label, children }: { icon?: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 text-primary/70 mt-0.5" />}
      <div>
        <dt className="uppercase tracking-wider text-[10px] text-muted-foreground">{label}</dt>
        <dd className="text-foreground/90">{children}</dd>
      </div>
    </div>
  );
}
