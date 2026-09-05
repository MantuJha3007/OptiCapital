import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { SystemProvider, useSystem } from "./store/system";
import { AppShell } from "./components/shell/AppShell";
import { Spinner } from "./components/ui/primitives";
import Overview from "./routes/Overview";
import RiskView from "./routes/RiskView";
import Contagion from "./routes/Contagion";
import StressStudio from "./routes/StressStudio";
import Ledger from "./routes/Ledger";

/* The routes read system state through useReadySystem(), so they are only
   mounted once the first load has resolved. That keeps every view free of
   null-checking against data that is guaranteed to exist by the time it
   renders. */
function Gate() {
  const { status, error, refresh, refreshing } = useSystem();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Spinner size={22} />
        <p className="text-[12.5px] text-fg-3">Reading portfolio state and computing risk…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="panel p-6 max-w-md w-full">
          <div className="flex items-center gap-2.5 mb-3">
            <AlertTriangle size={17} style={{ color: "var(--color-crisis)" }} />
            <h1 className="text-[14px] font-semibold">Engine unreachable</h1>
          </div>
          <p className="text-[12.5px] text-fg-2 leading-relaxed">{error}</p>
          <ol className="mt-4 flex flex-col gap-1.5 text-[11.5px] text-fg-3">
            <li>1. Start PostgreSQL — docker compose up -d</li>
            <li>2. Seed the database — python -m app.seed.seed_database</li>
            <li>3. Start the API — uvicorn app.main:app --reload</li>
          </ol>
          <button className="btn btn-primary mt-5 w-full" onClick={() => void refresh()} disabled={refreshing}>
            {refreshing ? <Spinner size={13} /> : <RefreshCw size={14} />} Retry connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/risk" element={<RiskView />} />
        <Route path="/contagion" element={<Contagion />} />
        <Route path="/stress" element={<StressStudio />} />
        <Route path="/ledger" element={<Ledger />} />
        <Route path="*" element={<Overview />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SystemProvider>
        <Gate />
      </SystemProvider>
    </BrowserRouter>
  );
}
