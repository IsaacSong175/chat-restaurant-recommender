import { FormEvent, useMemo, useState } from "react";
import { Bot, Check, DollarSign, HeartPulse, LogOut, MapPin, MessageSquare, Send, Sparkles, ThumbsDown, Utensils } from "lucide-react";
import { getRecommendations, login, register, sendFeedback } from "./api";
import type { Budget, DistancePreference, FeedbackType, HealthPreference, Mood, Recommendation } from "./types";

const budgetOptions: Array<[Budget, string]> = [
  ["under10", "<$10"],
  ["10to15", "$10-15"],
  ["15to20", "$15-20"],
  ["nolimit", "No limit"]
];

const distanceOptions: Array<[DistancePreference, string]> = [
  ["nearby", "Nearby"],
  ["medium", "Medium"],
  ["flexible", "Flexible"]
];

const moodOptions: Array<[Mood, string]> = [
  ["tired", "Tired"],
  ["happy", "Happy"],
  ["stressed", "Stressed"],
  ["bored", "Bored"]
];

const healthOptions: Array<[HealthPreference, string]> = [
  ["healthy", "Healthy"],
  ["normal", "Normal"],
  ["comfort", "Comfort"]
];

const feedbackLabels: Array<[FeedbackType, string]> = [
  ["ate_this", "Ate this"],
  ["not_interested", "Not interested"],
  ["too_expensive", "Too expensive"],
  ["too_far", "Too far"],
  ["dont_like_cuisine", "Don't like cuisine"]
];

export function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [email, setEmail] = useState(localStorage.getItem("email") ?? "");

  if (!token) {
    return (
      <AuthScreen
        onAuthed={(nextToken, nextEmail) => {
          localStorage.setItem("token", nextToken);
          localStorage.setItem("email", nextEmail);
          setToken(nextToken);
          setEmail(nextEmail);
        }}
      />
    );
  }

  return (
    <RecommendationScreen
      email={email}
      onLogout={() => {
        localStorage.clear();
        setToken(null);
        setEmail("");
      }}
    />
  );
}

function AuthScreen({ onAuthed }: { onAuthed: (token: string, email: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = mode === "login" ? await login(email, password) : await register(email, password);
      onAuthed(result.token, result.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-row">
          <div className="brand-mark">
            <Utensils size={22} />
          </div>
          <div>
            <h1>Waterloo Food Picks</h1>
            <p>Explainable chat recommendations for low-decision dinners.</p>
          </div>
        </div>
        <form onSubmit={submit} className="auth-form">
          <div className="segmented">
            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
              Login
            </button>
            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
              Register
            </button>
          </div>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              type="password"
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="primary-button" disabled={loading}>
            {loading ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>
      </section>
    </main>
  );
}

function RecommendationScreen({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [message, setMessage] = useState("今天有点累，不想走太远，预算 15 刀以内，不想吃中餐。");
  const [budget, setBudget] = useState<Budget>("10to15");
  const [distance, setDistance] = useState<DistancePreference>("nearby");
  const [mood, setMood] = useState<Mood>("tired");
  const [health, setHealth] = useState<HealthPreference>("normal");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const contextSummary = useMemo(
    () => `${budgetOptions.find(([value]) => value === budget)?.[1]} · ${distance} · ${mood} · ${health}`,
    [budget, distance, mood, health]
  );

  async function submit() {
    setLoading(true);
    setNotice("");
    try {
      const result = await getRecommendations({
        message,
        budget,
        distance,
        mood,
        health,
        wantedCuisines: [],
        avoidedCuisines: []
      });
      setRecommendations(result.recommendations);
      setSessionId(result.sessionId);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Recommendation failed");
    } finally {
      setLoading(false);
    }
  }

  async function feedback(restaurantId: number, feedbackType: FeedbackType) {
    if (!sessionId) return;
    await sendFeedback(restaurantId, sessionId, feedbackType);
    setNotice("Feedback saved. It will influence your next recommendation.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row compact">
          <div className="brand-mark">
            <Utensils size={20} />
          </div>
          <div>
            <strong>Food Picks</strong>
            <span>{email}</span>
          </div>
        </div>
        <button className="icon-text" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
        <div className="sidebar-block">
          <span className="eyebrow">Current context</span>
          <p>{contextSummary}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Chat recommendation</h1>
            <p>Rule-based ranking first. AI explanation second.</p>
          </div>
          <Bot size={28} />
        </header>

        <section className="composer">
          <label className="message-box">
            <MessageSquare size={18} />
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <div className="control-grid">
            <ControlGroup icon={<DollarSign size={16} />} label="Budget" options={budgetOptions} value={budget} onChange={setBudget} />
            <ControlGroup icon={<MapPin size={16} />} label="Distance" options={distanceOptions} value={distance} onChange={setDistance} />
            <ControlGroup icon={<Sparkles size={16} />} label="Mood" options={moodOptions} value={mood} onChange={setMood} />
            <ControlGroup icon={<HeartPulse size={16} />} label="Health" options={healthOptions} value={health} onChange={setHealth} />
          </div>
          <button className="primary-button send-button" onClick={submit} disabled={loading}>
            <Send size={17} />
            {loading ? "Scoring..." : "Recommend 3 restaurants"}
          </button>
        </section>

        {notice && <p className="notice">{notice}</p>}

        <section className="results">
          {recommendations.map((item) => (
            <article className="result-card" key={item.category}>
              <div className="result-heading">
                <span>{item.category}</span>
                <strong>{item.restaurant.name}</strong>
              </div>
              <p>{item.explanation}</p>
              <div className="meta-row">
                <span>{item.restaurant.cuisine}</span>
                <span>{"$".repeat(item.restaurant.priceLevel)}</span>
                <span>{item.restaurant.area}</span>
                <span>Score {item.restaurant.score}</span>
              </div>
              <div className="tag-row">
                {item.restaurant.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="feedback-row">
                {feedbackLabels.map(([value, label]) => (
                  <button key={value} onClick={() => feedback(item.restaurant.id, value)}>
                    {value === "ate_this" ? <Check size={14} /> : <ThumbsDown size={14} />}
                    {label}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

function ControlGroup<T extends string>({
  icon,
  label,
  options,
  value,
  onChange
}: {
  icon: React.ReactNode;
  label: string;
  options: Array<[T, string]>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="control-group">
      <div className="control-label">
        {icon}
        {label}
      </div>
      <div className="pill-grid">
        {options.map(([optionValue, text]) => (
          <button
            type="button"
            key={optionValue}
            className={value === optionValue ? "active" : ""}
            onClick={() => onChange(optionValue)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
