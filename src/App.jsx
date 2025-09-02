import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, ShieldAlert, HeartHandshake, Download, Upload, Trash2, Send, Save, KeyRound, NotebookPen, Brain, Sparkles, Users, Info, Lock, Moon, Sun, BarChart3 } from "lucide-react";

const STORAGE_KEYS = {
  MESSAGES: "groq_therapy_messages",
  PROFILE: "groq_therapy_profile",
  SETTINGS: "groq_therapy_settings",
  THEME: "groq_therapy_theme",
};

function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}
function loadLocal(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}

const DEFAULT_PROFILE = {
  name: "",
  age: "",
  pronouns: "",
  goals: ["Reduce stress"],
  preferences: {
    tone: "Warm",
    depth: "Balanced",
  },
};

const DEFAULT_SETTINGS = {
  apiKey: "",
  useProxy: true,
  temperature: 0.4,
  top_p: 1.0,
  max_tokens: 800,
  model: "meta-llama/llama-4-maverick-17b-128e-instruct",
};

const CRISIS_TERMS = [
  "suicide", "suicidal", "kill myself", "want to die", "end my life", "self-harm",
  "hurt myself", "not worth living", "overdose", "jump off", "cut myself", "hang myself",
];

function containsCrisis(text) {
  const t = (text || "").toLowerCase();
  return CRISIS_TERMS.some((kw) => t.includes(kw));
}

function classNames(...xs) { return xs.filter(Boolean).join(" "); }

function useTheme() {
  const [theme, setTheme] = useState(() => loadLocal(STORAGE_KEYS.THEME, "light"));
  useEffect(() => { saveLocal(STORAGE_KEYS.THEME, theme); }, [theme]);
  useEffect(() => {
    try {
      if (theme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch (e) {}
  }, [theme]);
  return { theme, setTheme };
}

const SYSTEM_PROMPT = (
  profile => `You are a supportive, non‑judgmental therapeutic assistant.

IMPORTANT SAFETY & SCOPE
- You are NOT a doctor and do NOT provide diagnoses or medical instructions.
- Encourage seeking licensed professionals for medical or psychiatric concerns.
- If the user shows crisis signals (self‑harm, harm to others), respond calmly with empathy, suggest immediate help, and provide resources.

STYLE
- Tone: warm, respectful, and validating.
- Depth: ${profile?.preferences?.depth || "Balanced"}.
- Personalize using known profile: name=${profile?.name || ""}, age=${profile?.age || ""}, pronouns=${profile?.pronouns || ""}, goals=${(profile?.goals||[]).join(", ")}.
- Ask brief follow‑ups, avoid long monologues.
- Offer practical, evidence‑informed strategies (CBT-style reframing, grounding, journaling prompts), but keep general.

BOUNDARIES
- No diagnosis, prescriptions, or claims of being a therapist/doctor.
- Suggest contacting a professional for persistent or severe symptoms.
- Respect user autonomy and preferences.`
);

export default function TherapyApp() {
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = useState(() => loadLocal(STORAGE_KEYS.PROFILE, DEFAULT_PROFILE));
  const [settings, setSettings] = useState(() => loadLocal(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS));
  const [messages, setMessages] = useState(() => loadLocal(STORAGE_KEYS.MESSAGES, [
    { role: "assistant", content: "Hi! I’m your supportive companion. How are you feeling right now?", ts: Date.now() }
  ]));

  const [input, setInput] = useState("");
  const [mood, setMood] = useState(5);
  const [tab, setTab] = useState("chat");
  const [loading, setLoading] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);

  const listRef = useRef(null);

  useEffect(() => saveLocal(STORAGE_KEYS.PROFILE, profile), [profile]);
  useEffect(() => saveLocal(STORAGE_KEYS.SETTINGS, settings), [settings]);
  useEffect(() => saveLocal(STORAGE_KEYS.MESSAGES, messages), [messages]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const systemMessage = useMemo(() => ({ role: "system", content: SYSTEM_PROMPT(profile) }), [profile]);

  async function fetchGroqChat(userContent) {
    const { useProxy, apiKey, model, temperature, top_p, max_tokens } = settings;

    const payload = {
      messages: [systemMessage, ...messages.map(({ role, content }) => ({ role, content })), { role: "user", content: userContent }],
      model,
      temperature,
      top_p,
      max_tokens,
    };

    try {
      if (useProxy) {
        const res = await fetch("/api/groq", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Proxy error ${res.status} ${text}`);
        }
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? "";
      } else {
        if (!apiKey) throw new Error("Missing API Key. Add it in Settings.");
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Groq error ${res.status} ${text}`);
        }
        const data = await res.json();
        return data?.choices?.[0]?.message?.content ?? "";
      }
    } catch (err) {
      console.error(err);
      return `I'm having trouble reaching the assistant right now. ${settings.useProxy ? "(Proxy)" : "(Direct)"} Error: ${err.message}`;
    }
  }

  function CrisisCard() {
    return (
      <div className="p-4 rounded-2xl border border-red-300/60 bg-red-50 dark:bg-red-950/20 dark:border-red-800 text-red-900 dark:text-red-200">
        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-5 h-5" />
          <p className="font-semibold">You’re not alone. If you’re in immediate danger, please seek urgent help now.</p>
        </div>
        <ul className="list-disc ml-6 text-sm leading-relaxed">
          <li>India: Call 112 (emergency) or reach AASRA: 91-9820466726</li>
          <li>Global: Find local crisis lines via <a className="underline" href="https://findahelpline.com/" target="_blank" rel="noreferrer">findahelpline.com</a></li>
          <li>Consider contacting a trusted person near you to stay with you.</li>
        </ul>
      </div>
    );
  }

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    const newUserMsg = { role: "user", content: text, moodAtSend: mood, ts: Date.now() };

    const crisis = containsCrisis(text);
    setShowCrisis(crisis);

    const currentMessages = [...messages, newUserMsg];
    setMessages(currentMessages);
    setInput("");
    setLoading(true);

    let assistantText = "";
    if (crisis) {
      assistantText = "I’m really sorry you’re feeling this way. I can’t provide emergency support, but I care about your safety. If you might hurt yourself or someone else, please consider contacting emergency services or a local crisis line right now. I can also stay with you here and help you find immediate steps to feel safer.";
    } else {
      assistantText = await fetchGroqChat(text);
    }

    const newAssistantMsg = { role: "assistant", content: assistantText, ts: Date.now() };
    setMessages([...currentMessages, newAssistantMsg]);
    setLoading(false);
  };

  const clearHistory = () => {
    if (!window.confirm("Delete all conversations? This cannot be undone.")) return;
    setMessages([{ role: "assistant", content: "Hi! I’m your supportive companion. How are you feeling right now?", ts: Date.now() }]);
  };

  const exportData = () => {
    const data = { profile, settings: { ...settings, apiKey: settings.apiKey ? "***stored locally***" : "" }, messages };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `therapy-data-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = async (file) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.profile) setProfile(data.profile);
      if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings, apiKey: "" });
      if (data.messages && Array.isArray(data.messages)) setMessages(data.messages.map((m) => ({ ...m, ts: m.ts || Date.now() })));
    } catch (e) {
      console.error(e);
      window.alert("Failed to import data: invalid file");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950 text-slate-800 dark:text-slate-100">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-2 rounded-2xl bg-indigo-600 text-white">
              <HeartHandshake className="w-5 h-5" />
            </motion.div>
            <div>
              <h1 className="font-semibold text-lg">CalmCompanion</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personalized support — not a substitute for professional care</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
              {theme === "dark" ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
            </button>
            <button onClick={() => setTab("settings")} className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-2">
              <Settings className="w-4 h-4"/>
              <span className="text-sm">Settings</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4 grid md:grid-cols-4 gap-4">
        <aside className="md:col-span-1 space-y-4">
          <nav className="grid gap-2">
            <TabButton icon={<Brain className="w-4 h-4"/>} label="Chat" active={tab === "chat"} onClick={() => setTab("chat")} />
            <TabButton icon={<Users className="w-4 h-4"/>} label="Intake" active={tab === "intake"} onClick={() => setTab("intake")} />
            <TabButton icon={<NotebookPen className="w-4 h-4"/>} label="Journal" active={tab === "journal"} onClick={() => setTab("journal")} />
            <TabButton icon={<BarChart3 className="w-4 h-4"/>} label="Insights" active={tab === "insights"} onClick={() => setTab("insights")} />
            <TabButton icon={<Settings className="w-4 h-4"/>} label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
          </nav>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 shadow-sm border border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4"/>
              <p className="font-medium">Mood (1–10)</p>
            </div>
            <input type="range" min={1} max={10} value={mood} onChange={e => setMood(Number(e.target.value))} className="w-full"/>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Current: <span className="font-medium">{mood}</span></p>
          </div>

          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 shadow-sm border border-slate-200/60 dark:border-slate-800">
            <p className="font-medium mb-2">Your Data</p>
            <div className="flex gap-2">
              <button onClick={exportData} className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 text-sm"><Download className="w-4 h-4"/>Export</button>
              <label className="flex-1 cursor-pointer px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-2 text-sm">
                <Upload className="w-4 h-4"/> Import
                <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}/>
              </label>
            </div>
            <button onClick={clearHistory} className="mt-2 w-full px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-900 dark:text-rose-100 flex items-center justify-center gap-2 text-sm"><Trash2 className="w-4 h-4"/>Reset</button>
          </div>

          <div className="p-4 rounded-2xl border border-yellow-300/60 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100 text-sm">
            <div className="flex items-center gap-2 mb-1"><Info className="w-4 h-4"/><span className="font-semibold">Important</span></div>
            <p>CalmCompanion offers general support and coping strategies. It is <span className="font-semibold">not</span> a licensed clinician and does not give medical advice or diagnoses.</p>
          </div>
        </aside>

        <section className="md:col-span-3 space-y-4">
          <AnimatePresence mode="wait">
            {tab === "chat" && (
              <motion.div key="chat" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-3">
                {showCrisis && <CrisisCard />}
                <div ref={listRef} className="h-[58vh] overflow-y-auto rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 p-4 space-y-3 shadow-sm">
                  {messages.map((m, i) => (
                    <div key={i} className={classNames("max-w-[85%] rounded-2xl px-4 py-3 shadow-sm", m.role === "assistant" ? "bg-slate-100/80 dark:bg-slate-800/60" : "ml-auto bg-indigo-600 text-white")}>
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{m.content}</div>
                      {m.moodAtSend && (
                        <div className="mt-1 text-[11px] opacity-70">Mood at send: {m.moodAtSend}</div>
                      )}
                    </div>
                  ))}
                  {loading && <div className="text-sm text-slate-500">Assistant is thinking…</div>}
                </div>
                <div className="flex items-end gap-2">
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Share what's on your mind…" rows={2} className="flex-1 resize-none rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"/>
                  <button onClick={sendMessage} disabled={loading || !input.trim()} className="h-[42px] px-4 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center gap-2"><Send className="w-4 h-4"/>Send</button>
                </div>
              </motion.div>
            )}

            {tab === "intake" && (
              <motion.div key="intake" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <Card title="About You" icon={<Users className="w-4 h-4"/>}>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Name"><input value={profile.name} onChange={(e)=>setProfile({ ...profile, name: e.target.value })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/></Field>
                    <Field label="Age"><input value={profile.age} onChange={(e)=>setProfile({ ...profile, age: e.target.value })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/></Field>
                    <Field label="Pronouns"><input value={profile.pronouns} onChange={(e)=>setProfile({ ...profile, pronouns: e.target.value })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/></Field>
                    <Field label="Your goals (comma-separated)"><input value={profile.goals.join(", ")} onChange={(e)=>setProfile({ ...profile, goals: e.target.value.split(",").map(s=>s.trim()).filter(Boolean) })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/></Field>
                  </div>
                </Card>

                <Card title="Preferences" icon={<Sparkles className="w-4 h-4"/>}>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Field label="Tone">
                      <select value={profile.preferences.tone} onChange={(e)=>setProfile({ ...profile, preferences: { ...profile.preferences, tone: e.target.value } })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option>Warm</option>
                        <option>Neutral</option>
                        <option>Direct</option>
                      </select>
                    </Field>
                    <Field label="Depth">
                      <select value={profile.preferences.depth} onChange={(e)=>setProfile({ ...profile, preferences: { ...profile.preferences, depth: e.target.value } })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option>Brief</option>
                        <option>Balanced</option>
                        <option>In-depth</option>
                      </select>
                    </Field>
                    <div className="flex items-end">
                      <button onClick={()=> setTab("chat")} className="w-full px-3 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center gap-2"><Save className="w-4 h-4"/>Save & Return</button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {tab === "journal" && (
              <motion.div key="journal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <Card title="Quick Journaling" icon={<NotebookPen className="w-4 h-4"/>}>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Try a prompt: "What’s one small thing I can do today to feel 5% better?"</p>
                  <textarea rows={8} placeholder="Write freely…" className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2" onChange={(e)=>{
                    const content = `Journal — ${new Date().toLocaleString()}:\n${e.target.value}`;
                    try { localStorage.setItem("groq_therapy_journal", content); } catch (e) {}
                  }}/>
                </Card>
              </motion.div>
            )}

            {tab === "insights" && (
              <motion.div key="insights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <Card title="Session Insights (local-only)" icon={<BarChart3 className="w-4 h-4"/>}>
                  <ul className="list-disc ml-6 text-sm space-y-1 text-slate-600 dark:text-slate-300">
                    <li>Messages stored: <b>{messages.length}</b></li>
                    <li>First interaction: <b>{messages[0]?.ts ? new Date(messages[0].ts).toLocaleString() : "—"}</b></li>
                    <li>Most recent: <b>{messages[messages.length-1]?.ts ? new Date(messages[messages.length-1].ts).toLocaleString() : "—"}</b></li>
                    <li>Current mood slider: <b>{mood}</b></li>
                    <li>Profile name: <b>{profile.name || "—"}</b></li>
                  </ul>
                </Card>
              </motion.div>
            )}

            {tab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4">
                <Card title="Connection" icon={<Lock className="w-4 h-4"/>}>
                  <div className="grid md:grid-cols-2 gap-3 items-end">
                    <Field label="Use secure proxy (recommended)">
                      <select value={String(settings.useProxy)} onChange={(e)=> setSettings({ ...settings, useProxy: e.target.value === "true" })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <option value="true">Yes — call /api/groq</option>
                        <option value="false">No — direct (dev only)</option>
                      </select>
                    </Field>
                    <Field label="Groq API Key (stored locally if provided)">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 opacity-70"/>
                        <input type="password" placeholder="sk-..." value={settings.apiKey} onChange={(e)=> setSettings({ ...settings, apiKey: e.target.value })} className="flex-1 rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Never commit or deploy client-side keys. Use serverless proxy for production.</p>
                    </Field>
                  </div>
                </Card>

                <Card title="Model & Generation" icon={<Brain className="w-4 h-4"/>}>
                  <div className="grid md:grid-cols-4 gap-3">
                    <Field label="Model">
                      <input value={settings.model} onChange={(e)=> setSettings({ ...settings, model: e.target.value })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/>
                    </Field>
                    <Field label="Temperature">
                      <input type="number" step="0.1" min="0" max="2" value={settings.temperature} onChange={(e)=> setSettings({ ...settings, temperature: parseFloat(e.target.value) || 0 })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/>
                    </Field>
                    <Field label="top_p">
                      <input type="number" step="0.05" min="0" max="1" value={settings.top_p} onChange={(e)=> setSettings({ ...settings, top_p: parseFloat(e.target.value) || 0 })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/>
                    </Field>
                    <Field label="max_tokens">
                      <input type="number" min="1" max="4096" value={settings.max_tokens} onChange={(e)=> setSettings({ ...settings, max_tokens: parseInt(e.target.value || "0", 10) || 0 })} className="w-full rounded-xl border px-3 py-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"/>
                    </Field>
                  </div>
                </Card>

                <Card title="Legal & Safety" icon={<ShieldAlert className="w-4 h-4"/>}>
                  <ul className="text-sm list-disc ml-6 space-y-1 text-slate-600 dark:text-slate-300">
                    <li>This app offers general wellness support and education only.</li>
                    <li>It is not a substitute for professional diagnosis or treatment.</li>
                    <li>In emergencies, contact local services immediately.</li>
                  </ul>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <footer className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Built with ❤️ using the Groq API. Your data stays on this device unless you export it.
      </footer>
    </div>
  );
}

function TabButton({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={classNames(
      "px-3 py-2 rounded-xl flex items-center gap-2 text-sm",
      active ? "bg-indigo-600 text-white" : "bg-white/70 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800"
    )}>
      {icon} <span>{label}</span>
    </button>
  );
}

function Card({ title, icon, children }) {
  return (
    <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">{icon}</div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-slate-600 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}
