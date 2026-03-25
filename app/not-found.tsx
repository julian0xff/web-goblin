export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
      <h2 className="text-2xl font-semibold tracking-tight">Not found</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
    </div>
  );
}
