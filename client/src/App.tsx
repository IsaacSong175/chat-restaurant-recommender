import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Brain,
  Check,
  Clock3,
  DollarSign,
  HeartPulse,
  History,
  Home,
  LogOut,
  MapPin,
  MessageSquare,
  Send,
  Sparkles,
  ThumbsDown,
  Utensils
} from "lucide-react";
import { getHistory, getPreferences, getRecommendations, login, register, sendFeedback } from "./api";
import type {
  Budget,
  DistancePreference,
  FeedbackType,
  HealthPreference,
  HistorySession,
  LearnedPreferences,
  Mood,
  Recommendation
} from "./types";

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

type ActiveTab = "recommend" | "history" | "preferences";

const tabLabels: Array<[ActiveTab, string]> = [
  ["recommend", "Recommend"],
  ["history", "History"],
  ["preferences", "Preferences"]
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("recommend");
  const [message, setMessage] = useState("Tired today, do not want to walk too far, budget under $15, not Chinese food.");
  const [budget, setBudget] = useState<Budget>("10to15");
  const [distance, setDistance] = useState<DistancePreference>("nearby");
  const [mood, setMood] = useState<Mood>("tired");
  const [health, setHealth] = useState<HealthPreference>("normal");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [historySessions, setHistorySessions] = useState<HistorySession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [preferences, setPreferences] = useState<LearnedPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [dataVersion, setDataVersion] = useState(0);

  const contextSummary = useMemo(
    () => `${budgetOptions.find(([value]) => value === budget)?.[1]} / ${distance} / ${mood} / ${health}`,
    [budget, distance, mood, health]
  );

  useEffect(() => {
    if (activeTab === "history") {
      void loadHistory();
    }
    if (activeTab === "preferences") {
      void loadPreferences();
    }
  }, [activeTab, dataVersion]);

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const result = await getHistory();
      setHistorySessions(result.sessions);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Could not load history");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadPreferences() {
    setPreferencesLoading(true);
    setPreferencesError("");
    try {
      setPreferences(await getPreferences());
    } catch (err) {
      setPreferencesError(err instanceof Error ? err.message : "Could not load preferences");
    } finally {
      setPreferencesLoading(false);
    }
  }

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
      setDataVersion((version) => version + 1);
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
    setDataVersion((version) => version + 1);
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
        <nav className="tab-nav" aria-label="Workspace sections">
          {tabLabels.map(([value, label]) => (
            <button key={value} className={activeTab === value ? "active" : ""} onClick={() => setActiveTab(value)}>
              {value === "recommend" && <Home size={16} />}
              {value === "history" && <History size={16} />}
              {value === "preferences" && <Brain size={16} />}
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-block">
          <span className="eyebrow">Current context</span>
          <p>{contextSummary}</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{getTabTitle(activeTab)}</h1>
            <p>{getTabSubtitle(activeTab)}</p>
          </div>
          <Bot size={28} />
        </header>

        {activeTab === "recommend" && (
          <>
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
                <RecommendationCard key={item.category} item={item} onFeedback={feedback} />
              ))}
            </section>
          </>
        )}

        {activeTab === "history" && <HistoryPanel sessions={historySessions} loading={historyLoading} error={historyError} />}

        {activeTab === "preferences" && (
          <PreferencesPanel preferences={preferences} loading={preferencesLoading} error={preferencesError} />
        )}
      </section>
    </main>
  );
}

function RecommendationCard({
  item,
  onFeedback
}: {
  item: Recommendation;
  onFeedback: (restaurantId: number, feedbackType: FeedbackType) => void;
}) {
  return (
    <article className="result-card">
      <div className="result-heading">
        <span>{item.category}</span>
        <strong>{item.restaurant.name}</strong>
      </div>
      <p>{item.explanation}</p>
      <RestaurantMeta item={item} />
      <div className="tag-row">
        {item.restaurant.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="feedback-row">
        {feedbackLabels.map(([value, label]) => (
          <button key={value} onClick={() => onFeedback(item.restaurant.id, value)}>
            {value === "ate_this" ? <Check size={14} /> : <ThumbsDown size={14} />}
            {label}
          </button>
        ))}
      </div>
    </article>
  );
}

function HistoryPanel({ sessions, loading, error }: { sessions: HistorySession[]; loading: boolean; error: string }) {
  if (loading) return <StatusPanel title="Loading history" body="Fetching your recent recommendation sessions." />;
  if (error) return <StatusPanel title="History unavailable" body={error} />;
  if (sessions.length === 0) {
    return <StatusPanel title="No history yet" body="Generate a recommendation first, then it will appear here." />;
  }

  return (
    <section className="history-list">
      {sessions.map((session) => (
        <article className="history-card" key={session.id}>
          <div className="history-card-header">
            <div>
              <span className="eyebrow">Session #{session.id}</span>
              <h2>{session.input.message || "Quick-filter recommendation"}</h2>
            </div>
            <span className="time-chip">
              <Clock3 size={14} />
              {formatDate(session.createdAt)}
            </span>
          </div>
          <div className="meta-row">
            <span>{getBudgetLabel(session.input.budget)}</span>
            <span>{session.input.distance ?? "nearby"}</span>
            <span>{session.input.mood ?? "tired"}</span>
            <span>{session.input.health ?? "normal"}</span>
          </div>
          <div className="history-recommendations">
            {session.recommendations.map((item) => {
              const feedback = session.feedback.filter((entry) => entry.restaurantId === item.restaurant.id);
              return (
                <div className="history-pick" key={`${session.id}-${item.category}`}>
                  <div className="result-heading">
                    <span>{item.category}</span>
                    <strong>{item.restaurant.name}</strong>
                  </div>
                  <p>{item.explanation}</p>
                  <RestaurantMeta item={item} />
                  <div className="feedback-chip-row">
                    {feedback.length === 0 ? (
                      <span>No feedback yet</span>
                    ) : (
                      feedback.map((entry) => <span key={`${entry.restaurantId}-${entry.createdAt}`}>{getFeedbackLabel(entry.feedbackType)}</span>)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      ))}
    </section>
  );
}

function PreferencesPanel({
  preferences,
  loading,
  error
}: {
  preferences: LearnedPreferences | null;
  loading: boolean;
  error: string;
}) {
  if (loading) return <StatusPanel title="Loading preferences" body="Reading your saved feedback signals." />;
  if (error) return <StatusPanel title="Preferences unavailable" body={error} />;
  if (!preferences || preferences.totalFeedbackCount === 0) {
    return <StatusPanel title="No learned preferences yet" body="Use the feedback buttons after a recommendation to teach the scorer." />;
  }

  return (
    <section className="preference-grid">
      <article className="preference-summary">
        <span className="eyebrow">Learning summary</span>
        <h2>Based on {preferences.totalFeedbackCount} feedback events</h2>
        <p>
          {preferences.positiveCount} positive signals and {preferences.negativeCount} correction signals have been saved.
        </p>
        {preferences.lastUpdatedAt && <span className="time-chip">Updated {formatDate(preferences.lastUpdatedAt)}</span>}
      </article>
      <PreferenceCard title="Liked cuisines" items={preferences.likedCuisines} empty="No liked cuisines yet" />
      <PreferenceCard title="Avoided cuisines" items={preferences.avoidedCuisines} empty="No avoided cuisines yet" />
      <MetricCard
        title="Price sensitivity"
        value={preferences.priceSensitivity.tooExpensiveCount}
        body={`Affected levels: ${formatLevels(preferences.priceSensitivity.affectedPriceLevels, "$")}`}
      />
      <MetricCard
        title="Distance sensitivity"
        value={preferences.distanceSensitivity.tooFarCount}
        body={`Affected levels: ${formatLevels(preferences.distanceSensitivity.affectedDistanceLevels, "Level ")}`}
      />
    </section>
  );
}

function PreferenceCard({ title, items, empty }: { title: string; items: Array<{ cuisine: string; count: number }>; empty: string }) {
  return (
    <article className="preference-card">
      <span className="eyebrow">{title}</span>
      <div className="preference-list">
        {items.length === 0 ? (
          <p>{empty}</p>
        ) : (
          items.map((item) => (
            <div key={item.cuisine}>
              <strong>{item.cuisine}</strong>
              <span>{item.count}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function MetricCard({ title, value, body }: { title: string; value: number; body: string }) {
  return (
    <article className="preference-card metric-card">
      <span className="eyebrow">{title}</span>
      <strong>{value}</strong>
      <p>{body}</p>
    </article>
  );
}

function RestaurantMeta({ item }: { item: Recommendation }) {
  return (
    <div className="meta-row">
      <span>{item.restaurant.cuisine}</span>
      <span>{"$".repeat(item.restaurant.priceLevel)}</span>
      <span>{item.restaurant.area}</span>
      <span>Score {item.restaurant.score}</span>
    </div>
  );
}

function StatusPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="status-panel">
      <strong>{title}</strong>
      <p>{body}</p>
    </section>
  );
}

function getTabTitle(tab: ActiveTab) {
  if (tab === "history") return "Recommendation history";
  if (tab === "preferences") return "Learned preferences";
  return "Chat recommendation";
}

function getTabSubtitle(tab: ActiveTab) {
  if (tab === "history") return "Review past sessions and the feedback attached to each pick.";
  if (tab === "preferences") return "A compact summary of what your feedback has taught the recommender.";
  return "Rule-based ranking first. AI explanation second.";
}

function getBudgetLabel(value?: Budget) {
  return budgetOptions.find(([option]) => option === value)?.[1] ?? "Budget not set";
}

function getFeedbackLabel(value: FeedbackType) {
  return feedbackLabels.find(([option]) => option === value)?.[1] ?? value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatLevels(values: number[], prefix: string) {
  if (values.length === 0) return "none yet";
  return values.map((value) => `${prefix}${value}`).join(", ");
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
