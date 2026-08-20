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

function SectionTitle({ icon, title, count }) {
  return (
    <div className="sectionTitle">
      <div className="sectionTitleLeft">
        {icon}
        <div>
          <h2>{title}</h2>
          <span>{count} participants</span>
        </div>
      </div>
    </div>
  );
}

function ParticipantTable({ rows, absent = false, operator = false, pageSize = 10 }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const startIndex = (page - 1) * pageSize;
  const pageRows = rows.slice(startIndex, startIndex + pageSize);

  return (
    <>
      <div className={`tableShell ${absent ? "absentShell" : ""}`}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>ስም / Name</th>
              <th>ድርጅት / Organization</th>
              {operator && <th>Phone</th>}
              {operator && <th>Sex</th>}
              {operator ? <th>Status</th> : <th>{absent ? "Status" : "Checked in"}</th>}
              {operator && <th>Checked in</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.length ? (
              pageRows.map((row, index) => (
                <tr key={row.id}>
                  <td>{startIndex + index + 1}</td>
                  <td className="nameCell">{row.name || "—"}</td>
                  <td>{row.organization || "—"}</td>
                  {operator && <td>{row.phone || "—"}</td>}
                  {operator && <td>{row.sex || "—"}</td>}
                  {operator && (
                    <td>
                      {row.status === "Present" ? (
                        <span className="statusPill presentPill">PRESENT</span>
                      ) : (
                        <span className="statusPill absentPill">ABSENT</span>
                      )}
                    </td>
                  )}
                  <td>
                    {operator ? (
                      row.checkedInAt ? (
                        <span className="timeCell">
                          <Clock3 size={15} /> {formatTime(row.checkedInAt)}
                        </span>
                      ) : (
                        <span className="mutedTime">—</span>
                      )
                    ) : absent ? (
                      <span className="statusPill absentPill">ABSENT</span>
                    ) : (
                      <span className="timeCell">
                        <Clock3 size={15} /> {formatTime(row.checkedInAt)}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={operator ? 7 : 4} className="emptyCell">
                  No participants found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length > pageSize && (
        <div className="paginationBar">
          <div className="paginationInfo">
            Showing <strong>{startIndex + 1}</strong>–<strong>{Math.min(startIndex + pageSize, rows.length)}</strong> of <strong>{rows.length}</strong>
          </div>
          <div className="paginationControls">
            <button
              type="button"
              className="pageButton"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="pageNumber">Page {page} of {totalPages}</span>
            <button
              type="button"
              className="pageButton"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
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
        <LiveStats data={data} />

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
