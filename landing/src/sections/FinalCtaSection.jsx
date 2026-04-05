import { APP_URL } from "../config/appConfig";

export default function FinalCtaSection() {
  const handleClick = () => {
    window.location.href = APP_URL;
  };

  return (
    <section className="mx-auto max-w-4xl px-6 pb-20">
      <div className="rounded-3xl border border-[#7C5CFF]/60 bg-gradient-to-r from-[#0a0f1c] via-[#020617] to-[#0b1120] p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.95)]">
        <h2 className="text-3xl font-semibold text-white sm:text-4xl">
          Start fixing your pipelines today
        </h2>
        <p className="mt-3 text-sm text-slate-300 sm:text-base">
          Connect DCPVAS to your CI/CD in minutes and let AI handle the failure analysis.
        </p>
        <button
          type="button"
          onClick={handleClick}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#7C5CFF] px-7 py-3 text-sm font-semibold text-white shadow-[0_0_28px_rgba(124,92,255,0.8)] transition hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(124,92,255,0.9)] active:scale-[0.98]"
        >
          Try DCPVAS Free
        </button>
      </div>
    </section>
  );
}
