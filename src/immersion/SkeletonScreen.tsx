export function SkeletonScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-200 via-lime-200 to-yellow-200 p-6">
      <div className="mx-auto mt-24 h-96 max-w-4xl animate-pulse rounded-3xl bg-white/60 shadow-2xl shadow-emerald-500/20 ring-2 ring-white" />
    </div>
  );
}
