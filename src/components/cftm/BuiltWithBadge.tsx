export function BuiltWithBadge() {
  return (
    <a
      href="https://lovable.dev"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-4 right-4 z-30 hidden rounded-full border border-white/10 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-lg backdrop-blur-md transition hover:border-primary/30 hover:text-foreground md:inline-flex"
    >
      Built with <span className="ml-1 text-primary">Lovable</span>
      <span className="mx-1 text-white/20">·</span> Supabase
      <span className="mx-1 text-white/20">·</span> OpenAI
    </a>
  );
}
