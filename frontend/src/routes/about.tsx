import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass, Heart, Users, MapPin, Lightbulb, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import bonfireLogo from "@/assets/bonfire-logo.jpeg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Bonfire" },
      { name: "description", content: "Learn about Bonfire, the community directory built by students for students." },
      { property: "og:title", content: "About — Bonfire" },
      { property: "og:description", content: "Learn about Bonfire, the community directory built by students for students." },
    ],
  }),
  component: AboutPage,
});

const fadeIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function AboutPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-double border-primary/40 bg-card/70 backdrop-blur">
        <div className="max-w-[1400px] mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
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
          </Link>
          <div className="flex items-center gap-5">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-foreground/70 hover:text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to the board
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-5 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="vintage-card rounded-md p-8 md:p-10 relative overflow-hidden mb-10"
        >
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-accent/15 blur-2xl" />
          <h1 className="font-display text-3xl md:text-5xl leading-[1.05]">
            Gather around.
          </h1>
          <p className="mt-4 text-foreground/75 text-base md:text-lg leading-relaxed max-w-xl">
            Bonfire is a hand-kept directory of student associations, sports clubs, creative circles, and hobby groups — built for students and newcomers who want to find their people.
          </p>
        </motion.div>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">Why Bonfire?</h2>
          </div>
          <div className="space-y-4 text-foreground/80 leading-relaxed">
            <p>
              Every student knows the feeling: you move to a new city, step off the train with a suitcase and a vague idea of where your dorm is. The next few weeks are a blur of introductions, new faces, and the quiet hope that somewhere out there is a group of people who share the thing you care about — whether that is theater, basketball, board games, or building robots.
            </p>
            <p>
              Finding those groups should not require hunting through scattered Facebook pages, outdated university portals, or word-of-mouth whispers at 2 AM. Bonfire exists to make that search simple, warm, and human.
            </p>
          </div>
        </motion.section>

        <div className="dashed-rule mb-12" />

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <Compass className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">What we do</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="vintage-card rounded-md p-5">
              <Users className="h-5 w-5 text-accent mb-2" />
              <h3 className="font-medium mb-1">Curated listings</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every community on the board is verified and described with the details that matter: who it is for, what it costs, where it meets, and how to join.
              </p>
            </div>
            <div className="vintage-card rounded-md p-5">
              <MapPin className="h-5 w-5 text-accent mb-2" />
              <h3 className="font-medium mb-1">City by city</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We started in Delft, Den Haag, and Rotterdam. The goal is to light a bonfire in every student city worth calling home.
              </p>
            </div>
            <div className="vintage-card rounded-md p-5">
              <Heart className="h-5 w-5 text-accent mb-2" />
              <h3 className="font-medium mb-1">Built with care</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This is a student-made project. No corporate engine, no infinite scrolling addiction design — just a clean bulletin board that respects your time.
              </p>
            </div>
            <div className="vintage-card rounded-md p-5">
              <Lightbulb className="h-5 w-5 text-accent mb-2" />
              <h3 className="font-medium mb-1">AI Scout</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Not sure what you are looking for? Ask The Scout. Describe your interests in plain language and get matched with communities that fit your vibe.
              </p>
            </div>
          </div>
        </motion.section>

        <div className="dashed-rule mb-12" />

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl">The mission</h2>
          </div>
          <div className="space-y-4 text-foreground/80 leading-relaxed">
            <p>
              Bonfire is built on a simple belief: community is not a luxury, it is a necessity. The right club or circle can shape a student's entire experience of a city — turning a temporary stay into a place that genuinely feels like home.
            </p>
            <p>
              Our objective is to lower the barrier to entry for every student and newcomer who wants to belong. We want to make discovering local communities as easy as checking the weather — and as rewarding as finding a favorite café.
            </p>
            <p>
              This is version 1.1, and there is much more to come. If you have feedback, want to add a community, or just want to say hello, we are listening.
            </p>
          </div>
        </motion.section>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="vintage-card rounded-md p-6 text-center"
        >
          <p className="font-display italic text-xl text-primary mb-2">
            &ldquo;Gather around. Stay a while.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground">
            Built by students, for students. With warmth, always.
          </p>
        </motion.div>
      </main>

      <footer className="border-t border-primary/15 bg-card/50 mt-12">
        <div className="max-w-[1400px] mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© Bonfire — built by students, for students.</p>
          <p className="font-display italic">Gather around. Stay a while.</p>
        </div>
      </footer>
    </div>
  );
}
