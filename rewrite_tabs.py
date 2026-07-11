import re

with open("src/pages/Freelancing.tsx", "r") as f:
    content = f.read()

# Replace TimeLogsTab
old_time_logs_start = "function TimeLogsTab({"
old_time_logs_end = "  );\n}"

time_logs_content = content[content.find(old_time_logs_start):content.find(old_time_logs_end, content.find(old_time_logs_start)) + len(old_time_logs_end)]

new_time_logs = """function TimeLogsTab({
  businessId,
  timeLogs,
  services,
  fetchAll,
  isAdvanced,
}: any) {
  const [activeTimer, setActiveTimer] = useState<{
    service_id: string;
    start: number;
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  
  const [isLogMessageOpen, setIsLogMessageOpen] = useState(false);
  const [logMessage, setLogMessage] = useState("");

  useEffect(() => {
    let interval: any;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeTimer.start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = (serviceId: string) => {
    setActiveTimer({ service_id: serviceId, start: Date.now() });
  };

  const stopTimer = () => {
    if (!activeTimer) return;
    setIsLogMessageOpen(true);
  };
  
  const saveTimer = async () => {
    if (!activeTimer) return;
    try {
      await fetch("/api/freelancing/time_logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          service_id: activeTimer.service_id,
          date: new Date().toISOString().split("T")[0],
          seconds: elapsed,
          description: logMessage || "Session",
        }),
      });
      setActiveTimer(null);
      setElapsed(0);
      setIsLogMessageOpen(false);
      setLogMessage("");
      fetchAll();
    } catch (e) {}
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-300">
      <div className="flex justify-between items-end">
        <h1 className="text-3xl font-black">Time Logs</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div
          className={`p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
        >
          <h3 className="font-bold text-lg mb-4">Timer</h3>
          {activeTimer ? (
            <div className="text-center">
              <p className="text-5xl font-mono font-black mb-4 text-violet-500">
                {Math.floor(elapsed / 3600)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor((elapsed % 3600) / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(elapsed % 60).toString().padStart(2, "0")}
              </p>
              <button
                onClick={stopTimer}
                className="w-full py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white flex items-center justify-center gap-2"
              >
                <Square fill="currentColor" size={16} /> Stop Timer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <select
                id="timer-service"
                className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
              >
                {services
                  .filter((s: any) => s.type === "Hourly")
                  .map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={() => {
                  const val = (
                    document.getElementById("timer-service") as HTMLSelectElement
                  )?.value;
                  if (val) startTimer(val);
                }}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${isAdvanced ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
              >
                <Play fill="currentColor" size={16} /> Start Timer
              </button>
            </div>
          )}
        </div>
        <div
          className={`lg:col-span-2 p-6 rounded-3xl border shadow-sm ${isAdvanced ? "bg-slate-800 border-slate-700" : "bg-white border-slate-100"}`}
        >
          <h3 className="font-bold text-lg mb-4">Recent Logs</h3>
          <div className="space-y-3">
            {timeLogs.map((l: any) => (
              <div
                key={l.id}
                className={`p-4 rounded-2xl flex justify-between items-center ${isAdvanced ? "bg-slate-900" : "bg-slate-50"}`}
              >
                <div>
                  <p className="font-bold text-sm">
                    {services.find((s: any) => s.id === l.service_id)?.name ||
                      "Unknown"}
                  </p>
                  <p className="text-xs text-slate-500">{l.date} • {l.description}</p>
                </div>
                <div className="font-mono font-bold text-violet-500">
                  {Math.floor(l.seconds / 3600)}h{" "}
                  {Math.floor((l.seconds % 3600) / 60)}m
                </div>
              </div>
            ))}
            {timeLogs.length === 0 && (
              <p className="text-slate-500 text-sm">No time logged yet.</p>
            )}
          </div>
        </div>
      </div>
      
      {isLogMessageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            className={`w-full max-w-md p-6 rounded-3xl ${isAdvanced ? "bg-slate-800" : "bg-white"}`}
          >
            <h3 className="text-xl font-bold mb-4">Log Time</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">
                  Description / Work Done
                </label>
                <textarea
                  rows={3}
                  value={logMessage}
                  onChange={(e) => setLogMessage(e.target.value)}
                  placeholder="e.g. Completed homepage design"
                  className={`w-full p-3 rounded-xl border outline-none ${isAdvanced ? "bg-slate-900 border-slate-700 text-white" : "bg-slate-50 border-slate-200"}`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsLogMessageOpen(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={saveTimer}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white ${isAdvanced ? "bg-violet-600 hover:bg-violet-700" : "bg-slate-900 hover:bg-slate-800"}`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}"""

content = content.replace(time_logs_content, new_time_logs)

with open("src/pages/Freelancing.tsx", "w") as f:
    f.write(content)
