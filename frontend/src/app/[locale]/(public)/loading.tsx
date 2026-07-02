export default function PublicLoading() {
  return (
    <main className="fixed inset-0 z-[99] overflow-hidden bg-[#050605] text-white">
      <div className="home-hero-grid absolute inset-0 opacity-20" />
      <div className="home-hero-noise absolute inset-0 opacity-10" />
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="splash-electric-mark relative h-40 w-28">
          <div
            className="absolute inset-0 animate-pulse bg-[#39ff14] shadow-[0_0_65px_rgba(57,255,20,0.48)]"
            style={{ clipPath: 'polygon(30% 0, 88% 0, 58% 39%, 92% 39%, 12% 100%, 38% 57%, 5% 57%)' }}
          />
        </div>
        <p className="mt-8 text-sm font-black uppercase tracking-[0.32em]">
          Pro <span className="text-[#39ff14]">Gym</span>
        </p>
      </div>
      <div className="absolute inset-x-6 bottom-7 h-px overflow-hidden bg-white/10">
        <div className="h-full w-1/3 animate-[loader-slide_1.1s_cubic-bezier(0.65,0,0.35,1)_infinite] bg-[#39ff14] shadow-[0_0_20px_#39ff14]" />
      </div>
    </main>
  );
}
