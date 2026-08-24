import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";
import { io } from "socket.io-client";
import {
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  Monitor,
  RefreshCw,
  Search,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import "./style.css";

const API =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:10000/api";
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  API.replace(/\/api\/?$/, "");

const api = axios.create({ baseURL: API });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function formatTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("am-ET", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("am-ET", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}


function AddisAnalogClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Addis_Ababa",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(now);

  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const hours = Number(value.hour) % 12;
  const minutes = Number(value.minute);
  const seconds = Number(value.second);
  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6 + seconds * 0.1;
  const secondAngle = seconds * 6;

  return (
    <div className="ceremonyClock" aria-label="Current Addis Ababa time">
      <div className="clockFace">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            className="clockTick"
            style={{ transform: `rotate(${index * 30}deg)` }}
          >
            <i />
          </span>
        ))}
        <span className="clockNumber n12">12</span>
        <span className="clockNumber n3">3</span>
        <span className="clockNumber n6">6</span>
        <span className="clockNumber n9">9</span>
        <span className="clockHand hourHand" style={{ transform: `rotate(${hourAngle}deg)` }} />
        <span className="clockHand minuteHand" style={{ transform: `rotate(${minuteAngle}deg)` }} />
        <span className="clockHand secondHand" style={{ transform: `rotate(${secondAngle}deg)` }} />
        <span className="clockCenterDot" />
      </div>
      <span className="clockZone">ADDIS ABABA</span>
    </div>
  );
}

function LiveStats({ data }) {
  return (
    <section className="heroStats">
      <div className="heroCard registered">
        <span>የተመዘገቡ</span>
        <div className="heroMetricRow">
          <strong>{data.totalRegistered}</strong>
          <div className="heroPercent">
            <b>100%</b>
            <small>REGISTERED</small>
          </div>
        </div>
      </div>
      <div className="heroCard present">
        <span>የተገኙ</span>
        <div className="heroMetricRow">
          <strong>{data.totalPresent}</strong>
          <div className="heroPercent">
            <b>{percent(data.presentPercent)}</b>
            <small>PRESENT</small>
          </div>
        </div>
      </div>
      <div className="heroCard absent">
        <span>ያልተገኙ</span>
        <div className="heroMetricRow">
          <strong>{data.totalAbsent}</strong>
          <div className="heroPercent">
            <b>{percent(data.absentPercent)}</b>
            <small>ABSENT</small>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrganizationGenderCards({
  analytics = {},
  organizationStats = [],
  presentRows = [],
  absentRows = [],
}) {
  // IMPORTANT: the live endpoint already returns the actual database rows in
  // `present` and `absent`. Build the organization totals from those rows on
  // the client as a safety net. This prevents the projector from showing
  // "No organization" when an older backend omits organizationStats.
  const organizations = useMemo(() => {
    const normalizeSex = (value) => {
      const sex = String(value ?? "").trim().toLowerCase();
      if (["ወንድ", "male", "m", "man", "men"].includes(sex)) return "male";
      if (["ሴት", "female", "f", "woman", "women"].includes(sex)) return "female";
      return "unknown";
    };

    const makeBucket = () => ({ total: 0, male: 0, female: 0, unknown: 0 });
    const add = (bucket, row) => {
      bucket.total += 1;
      bucket[normalizeSex(row?.sex)] += 1;
    };

    const allRows = [
      ...(Array.isArray(presentRows) ? presentRows : []),
      ...(Array.isArray(absentRows) ? absentRows : []),
    ];

    const map = new Map();
    for (const row of allRows) {
      const name = String(row?.organization ?? "").replace(/\s+/g, " ").trim();
      const organization = name || "ያልተገለጸ ድርጅት / Unknown organization";

      if (!map.has(organization)) {
        map.set(organization, {
          organization,
          registered: makeBucket(),
          present: makeBucket(),
          absent: makeBucket(),
        });
      }

      const item = map.get(organization);
      add(item.registered, row);
      const isPresent =
        String(row?.status ?? "").toLowerCase() === "present" ||
        Boolean(row?.checkedInAt);

      if (isPresent) add(item.present, row);
      else add(item.absent, row);
    }

    // Prefer the live database rows above. If they are unavailable for any
    // reason, use the backend's organizationStats response.
    if (map.size > 0) {
      return [...map.values()].sort((a, b) => b.registered.total - a.registered.total);
    }

    const rows = Array.isArray(organizationStats) ? organizationStats : [];
    return rows
      .filter((item) => String(item?.organization || item?.organizationName || "").trim())
      .map((item) => ({
        ...item,
        organization: String(item.organizationName || item.organization).trim(),
      }));
  }, [organizationStats, presentRows, absentRows]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((current) => {
      if (!organizations.length) return 0;
      return Math.min(current, organizations.length - 1);
    });
  }, [organizations.length]);

  useEffect(() => {
    if (organizations.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % organizations.length);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [organizations.length]);

  const safeBucket = (bucket = {}) => {
    const total = Number(bucket?.total ?? 0);
    const male = Number(bucket?.male ?? bucket?.men ?? 0);
    const female = Number(bucket?.female ?? bucket?.women ?? 0);
    const malePercent = Number.isFinite(Number(bucket?.malePercent))
      ? Number(bucket.malePercent)
      : total > 0 ? Number(((male / total) * 100).toFixed(1)) : 0;
    const femalePercent = Number.isFinite(Number(bucket?.femalePercent))
      ? Number(bucket.femalePercent)
      : total > 0 ? Number(((female / total) * 100).toFixed(1)) : 0;
    return { total, male, female, malePercent, femalePercent };
  };

  // The backend's organizationStats is the source of truth. Each organization
  // contains its own registered, present and absent gender totals.
  const selected = organizations[activeIndex] || null;
  const selectedName = String(
    selected?.organizationName || selected?.organization || "ድርጅት አልተገኘም / No organization"
  ).trim();

  const registered = safeBucket(selected?.registered);
  const present = safeBucket(selected?.present);
  const absent = safeBucket(selected?.absent);
  const recent = analytics?.recent || {};
  const isRecentOrganization =
    String(recent?.organization || "").trim() === selectedName;
  const latestParticipant = isRecentOrganization ? recent?.latestParticipant : null;

  const metric = (bucket) => (
    <div className="bigAnalyticsMetric">
      <div className="bigAnalyticsMetricHead">
        <span>ወንድ / MEN</span>
        <strong>{bucket.male}</strong>
      </div>
      <div className="bigAnalyticsProgress">
        <span style={{ width: `${Math.min(100, Math.max(0, bucket.malePercent))}%` }} />
      </div>
      <small>{percent(bucket.malePercent)}</small>

      <div className="bigAnalyticsMetricHead femaleRow">
        <span>ሴት / WOMEN</span>
        <strong>{bucket.female}</strong>
      </div>
      <div className="bigAnalyticsProgress">
        <span style={{ width: `${Math.min(100, Math.max(0, bucket.femalePercent))}%` }} />
      </div>
      <small>{percent(bucket.femalePercent)}</small>
    </div>
  );

  const stateBlock = (title, bucket, tone) => (
    <article className={`bigAnalyticsState ${tone}`}>
      <div className="bigAnalyticsStateTitle">
        <span>{title}</span>
        <strong>{bucket.total}</strong>
      </div>
      {metric(bucket)}
    </article>
  );

  return (
    <section className="organizationAnalytics" aria-live="polite">
      <div className="bigAnalyticsCard">
        <div className="bigAnalyticsTop">
          <div className="bigAnalyticsTitle">
            <span className="analyticsKicker">LIVE ORGANIZATION ANALYTICS</span>
            <h2>{selectedName}</h2>
            <p>Organization-by-organization live attendance • changes automatically every 15 seconds</p>
          </div>

          <div className="bigAnalyticsRotation" aria-label="Organization rotation">
            <span>{organizations.length ? `${activeIndex + 1} / ${organizations.length}` : "0 / 0"}</span>
            <div className="bigAnalyticsDots">
              {organizations.slice(0, 20).map((item, index) => (
                <i key={`${item.organization}-${index}`} className={index === activeIndex ? "active" : ""} />
              ))}
              {organizations.length > 20 && <b>+{organizations.length - 20}</b>}
            </div>
          </div>
        </div>

        {selected ? (
          <>
            <div className="bigAnalyticsOrganizationBar">
              <span>ORGANIZATION</span>
              <strong title={selectedName}>{selectedName}</strong>
            </div>

            <div className="bigAnalyticsStates">
              {stateBlock("የተመዘገቡ / REGISTERED", registered, "registeredState")}
              {stateBlock("የተገኙ / PRESENT", present, "presentState")}
              {stateBlock("ያልተገኙ / ABSENT", absent, "absentState")}
            </div>

            <div className="bigAnalyticsFooter">
              <div>
                <span>ORGANIZATION TOTAL</span>
                <strong>{registered.total}</strong>
              </div>
              <div>
                <span>PRESENT</span>
                <strong>{present.total}</strong>
              </div>
              <div>
                <span>ABSENT</span>
                <strong>{absent.total}</strong>
              </div>
              <div className="bigAnalyticsLatest">
                <span>RECENTLY PRESENT</span>
                <strong>{latestParticipant?.name || "—"}</strong>
              </div>
            </div>
          </>
        ) : (
          <div className="bigAnalyticsEmpty">ድርጅት አልተገኘም / No organization data available.</div>
        )}
      </div>
    </section>
  );
}

function RecentCheckinTicker({ rows = [] }) {
  const recentRows = Array.isArray(rows) ? rows.slice(0, 12) : [];
  const tickerRows = recentRows.length ? [...recentRows, ...recentRows] : [];

  return (
    <section className="recentCheckinTicker" aria-label="Live check-ins">
      <div className="tickerLabel">
        <span className="tickerPulse" />
        <strong>LIVE CHECK-INS</strong>
      </div>

      <div className="tickerViewport">
        {tickerRows.length ? (
          <div className="tickerTrack">
            {tickerRows.map((row, index) => (
              <div className="tickerItem" key={`${row.id || row.name}-${index}`}>
                <span className="tickerCheck">✓</span>
                <div className="tickerPerson">
                  <strong>{row.name || "—"}</strong>
                  <small>{row.organization || "—"}</small>
                </div>
                <time>{formatTime(row.checkedInAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <div className="tickerEmpty">No check-ins yet.</div>
        )}
      </div>
    </section>
  );
}

function SectionTitle({ icon, title, count }) {
  return (
    <div className="sectionTitle">
      <div className="sectionTitleLeft">
        {icon}
        <div>
          <h2>{title}</h2>
          <span>{count} participant{count === 1 ? "" : "s"}</span>
        </div>
      </div>
    </div>
  );
}

function ParticipantTable({ rows = [], absent = false, operator = false }) {
  const [page, setPage] = useState(1);
  const perPage = 8;

  useEffect(() => setPage(1), [rows, operator, absent]);

  const safeRows = Array.isArray(rows) ? rows : [];
  const totalPages = Math.max(1, Math.ceil(safeRows.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = safeRows.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <div className={`tableShell ${absent ? "absentShell" : ""}`}>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>ስም / NAME</th>
            <th>ድርጅት / ORGANIZATION</th>
            <th>ፆታ / SEX</th>
            {operator && <th>PHONE</th>}
            <th>{operator ? "STATUS" : "CHECKED IN"}</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.length ? (
            visibleRows.map((row, index) => {
              const isPresent = row.status
                ? String(row.status).toLowerCase() === "present"
                : Boolean(row.checkedInAt);

              return (
                <tr key={row.id || `${row.name}-${index}`}>
                  <td>{(currentPage - 1) * perPage + index + 1}</td>
                  <td className="nameCell">{row.name || "—"}</td>
                  <td>{row.organization || "—"}</td>
                  <td>{row.sex || "—"}</td>
                  {operator && <td>{row.phone || "—"}</td>}
                  <td>
                    {isPresent ? (
                      <span className="timeCell">
                        <Clock3 size={14} />
                        {formatTime(row.checkedInAt)}
                      </span>
                    ) : (
                      <span className="absentPill">ABSENT</span>
                    )}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td className="emptyCell" colSpan={operator ? 6 : 5}>
                No participants found.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {safeRows.length > 0 && (
        <div className="paginationBar">
          <span className="paginationInfo">
            Page {currentPage} of {totalPages} • {safeRows.length} total
          </span>
          <div className="paginationControls">
            <button
              className="pageButton"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="pageNumber">{currentPage}</span>
            <button
              className="pageButton"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LivePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [connected, setConnected] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get("/attendance/live");
      setData(response.data);
      setUpdatedAt(new Date());
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Unable to load attendance.");
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 5000);
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    const refreshEvents = [
      "participantCheckedIn",
      "attendance:reset",
      "booking:created",
      "newBooking",
      "bookingDeleted",
    ];
    refreshEvents.forEach((event) => socket.on(event, load));
    return () => {
      window.clearInterval(timer);
      socket.disconnect();
    };
  }, [load]);

  if (!data) {
    return (
      <div className="screenCenter">
        <RefreshCw className="spin" size={40} />
        <h1>Loading live attendance…</h1>
        {error && <p className="loadError">{error}</p>}
      </div>
    );
  }

  return (
    <div className="livePage">
      <header className="liveHeader">
        <div>
          <div className="eventKicker">GUBAE BETESEB</div>
          <h1>የጉባኤው ተሳትፎ ማሳያ</h1>
          <p>LIVE ATTENDANCE • የተሳታፊዎች የቀጥታ ተሳትፎ መረጃ</p>
        </div>
        <div className="liveHeaderRight">
          <AddisAnalogClock />
          <div className="liveStatus">
            <span className={connected ? "dot online" : "dot"}></span>
            {connected ? "LIVE" : "RECONNECTING"}
          </div>
        </div>
      </header>

      <main className="liveMain">
        <RecentCheckinTicker rows={data.present} />
        <LiveStats data={data} />
        <OrganizationGenderCards
          analytics={data.analytics || {}}
          organizationStats={data.organizationStats || []}
          presentRows={data.present || []}
          absentRows={data.absent || []}
        />

        <div className="rateBanner">
          <div>
            <span>ATTENDANCE RATE</span>
            <strong>{percent(data.presentPercent)}</strong>
          </div>
          <div className="rateBar">
            <div style={{ width: `${Math.min(100, Math.max(0, data.presentPercent))}%` }} />
          </div>
          <small>
            {data.totalPresent} of {data.totalRegistered} participants have checked in
          </small>
        </div>

        <section className="tableSection">
          <SectionTitle
            icon={<UserCheck size={28} />}
            title="የተገኙ ተሳታፊዎች"
            count={data.present.length}
          />
          <ParticipantTable rows={data.present} />
        </section>

        <section className="tableSection absentSection">
          <SectionTitle
            icon={<UserX size={28} />}
            title="ያልተገኙ ነገር ግን የተመዘገቡ ተሳታፊዎች"
            count={data.absent.length}
          />
          <ParticipantTable rows={data.absent} absent />
        </section>

        <footer className="liveFooter">
          <span>Last updated: {formatDateTime(updatedAt)}</span>
          <a href="/operator">Operator / Admin Search</a>
        </footer>
      </main>
    </div>
  );
}

function OperatorLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("adminToken", response.data.token);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screenCenter operatorLogin">
      <form className="loginCard" onSubmit={submit}>
        <Monitor size={42} />
        <h1>Attendance Operator</h1>
        <p>Search and verify registered participants during the ceremony.</p>
        <input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={busy}><LogIn size={18} /> {busy ? "Signing in…" : "Sign in"}</button>
        {error && <div className="errorBox">{error}</div>}
        <a href="/">← Back to live display</a>
      </form>
    </div>
  );
}

function OperatorPage() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("adminToken")));
  const [data, setData] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [organization, setOrganization] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadSummary = useCallback(async () => {
    try {
      const response = await api.get("/attendance/live");
      setSummary(response.data);
    } catch (err) {
      if (err.response?.status === 401) logout();
    }
  }, []);

  const search = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/attendance/operator", {
        params: { q: query, status, organization },
      });
      setData(response.data.participants || []);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
        return;
      }
      setError(err.response?.data?.message || "Unable to search participants.");
    } finally {
      setLoading(false);
    }
  }, [query, status, organization]);

  useEffect(() => {
    if (!authenticated) return;

    loadSummary();
    search();
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    const refresh = () => {
      loadSummary();
      search();
    };
    ["participantCheckedIn", "attendance:reset", "booking:created", "newBooking", "bookingDeleted"].forEach((event) => socket.on(event, refresh));
    const timer = window.setInterval(loadSummary, 5000);
    return () => {
      window.clearInterval(timer);
      socket.disconnect();
    };
  }, [authenticated, loadSummary, search]);

  const logout = () => {
    localStorage.removeItem("adminToken");
    setAuthenticated(false);
  };

  const organizations = useMemo(() => {
    const set = new Set((summary?.absent || []).map((row) => row.organization).filter(Boolean));
    (summary?.present || []).forEach((row) => set.add(row.organization));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [summary]);

  if (!authenticated) return <OperatorLogin onLogin={() => setAuthenticated(true)} />;

  return (
    <div className="operatorPage">
      <header className="operatorHeader">
        <div>
          <div className="eventKicker">GUBAE BETESEB</div>
          <h1>Attendance Operator</h1>
          <p>Search / filter to verify whether a participant has already checked in.</p>
        </div>
        <div className="operatorActions">
          <a className="secondaryButton" href="/"><Monitor size={17} /> Live Screen</a>
          <button className="secondaryButton" onClick={logout}><LogOut size={17} /> Logout</button>
        </div>
      </header>

      <main className="operatorMain">
        {summary && <LiveStats data={summary} />}

        <section className="searchCard">
          <div className="searchTitle"><Search size={22} /><div><h2>Participant Search</h2><p>Search by Amharic name, organization, or phone.</p></div></div>
          <div className="searchGrid">
            <label>Search<input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="ስም / ድርጅት / 09…" /></label>
            <label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All</option><option value="present">Present</option><option value="absent">Absent</option></select></label>
            <label>Organization<select value={organization} onChange={(e) => setOrganization(e.target.value)}><option value="">All organizations</option>{organizations.map((org) => <option key={org} value={org}>{org}</option>)}</select></label>
            <button className="searchButton" onClick={search} disabled={loading}><Search size={18} /> {loading ? "Searching…" : "Search"}</button>
          </div>
          {error && <div className="errorBox">{error}</div>}
        </section>

        <section className="operatorResults">
          <div className="resultsHead"><div><h2>Search Results</h2><p>{data?.length || 0} participant(s)</p></div><button className="refreshButton" onClick={search}><RefreshCw size={17} /> Refresh</button></div>
          <ParticipantTable rows={data || []} operator />
        </section>
      </main>
    </div>
  );
}

function logout() {
  localStorage.removeItem("adminToken");
  window.location.href = "/operator";
}

function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return path === "/operator" ? <OperatorPage /> : <LivePage />;
}

createRoot(document.getElementById("root")).render(<App />);
