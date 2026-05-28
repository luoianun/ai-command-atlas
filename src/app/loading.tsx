// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="max-w-[1120px] mx-auto px-6 py-12">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[var(--surface)] rounded-[var(--r)] w-48" />
        <div className="h-4 bg-[var(--surface)] rounded-[var(--r)] w-96" />
        <div className="h-4 bg-[var(--surface)] rounded-[var(--r)] w-72" />
      </div>
    </div>
  );
}
