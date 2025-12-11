import { useEffect, useMemo, useState } from "react";

type AuthMode = "header" | "body";
type TabKey = "profile" | "roleFit" | "bullets" | "reference";

type RequestResult = {
  status?: number;
  durationMs?: number;
  responseBody?: unknown;
  rawText?: string;
  error?: string;
  requestBody?: unknown;
};

const defaultBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  "https://x8ki-letl-twmt.n7.xano.io/api:career_signals";
const defaultApiKey = (import.meta.env.VITE_DEFAULT_API_KEY || "").trim();

const profileDefaults = {
  profile_text: "Senior Software Engineer with 10+ years …",
  locale: "en-US",
  include_leadership_signals: true,
  include_risk_signals: true,
  test_api_key: defaultApiKey
};

const roleFitDefaults = {
  profile_text: "Senior Software Engineer with 10+ years …",
  job_description:
    "We are seeking a pragmatic engineering leader who can guide distributed teams, ship reliable services, and collaborate with product.",
  locale: "en-US",
  target_seniority_hint: "Staff",
  weightings: {
    skills: 0.5,
    domain: 0.2,
    seniority: 0.2,
    leadership: 0.1
  },
  test_api_key: defaultApiKey
};

const bulletDefaults = {
  profile_text: "Senior Software Engineer with 10+ years …",
  job_description: "Led platform modernization across multiple teams.",
  role_title: "VP of Engineering",
  max_bullets: 6,
  test_api_key: ""
};

const stubbedResponses = {
  profile: {
    summary: "Stubbed profile analysis response.",
    leadership_signals: ["Vision setting", "Coaching"],
    risk_signals: ["Needs clearer delivery metrics"]
  },
  roleFit: {
    match_score: 0.82,
    strengths: ["Strong system design background", "Team leadership"],
    gaps: ["Limited domain knowledge in fintech"]
  },
  bullets: {
    bullets: [
      "Architected and shipped a multi-region service migration reducing latency by 30%.",
      "Implemented engineering excellence program improving on-call MTTR by 25%.",
      "Coached senior ICs into tech lead roles, increasing team velocity sustainably."
    ]
  }
};

function useLocalStorageState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initial;
    const stored = window.localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored) as T;
      } catch {
        return initial;
      }
    }
    return initial;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage failures.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Copy failed", err);
  }
}

function pretty(value: unknown) {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function FieldLabel({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <label className="field-label">
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {children}
        <span
          className="tooltip-trigger"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="info-icon">i</span>
          {showTooltip && (
            <span className="tooltip-content" role="tooltip">
              {tooltip}
            </span>
          )}
        </span>
      </span>
    </label>
  );
}

function InlineTooltip({ tooltip }: { tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <span
      className="tooltip-trigger"
      style={{ marginLeft: "6px" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="info-icon">i</span>
      {showTooltip && (
        <span className="tooltip-content" role="tooltip">
          {tooltip}
        </span>
      )}
    </span>
  );
}

function App() {
  const [tab, setTab] = useState<TabKey>("profile");
  const [baseUrl, setBaseUrl] = useLocalStorageState("cs-base-url", defaultBaseUrl);
  const apiKey = defaultApiKey;
  const [authMode, setAuthMode] = useLocalStorageState<AuthMode>("cs-auth-mode", "header");
  const [useStub, setUseStub] = useLocalStorageState("cs-use-stub", false);

  const [profileForm, setProfileForm] = useLocalStorageState("cs-form-profile", profileDefaults);
  const [roleFitForm, setRoleFitForm] = useLocalStorageState("cs-form-role-fit", roleFitDefaults);
  const [bulletForm, setBulletForm] = useLocalStorageState("cs-form-bullets", bulletDefaults);

  const [profileResult, setProfileResult] = useState<RequestResult>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileRequest, setShowProfileRequest] = useState(false);
  const [roleFitResult, setRoleFitResult] = useState<RequestResult>({});
  const [roleFitLoading, setRoleFitLoading] = useState(false);
  const [showRoleFitRequest, setShowRoleFitRequest] = useState(false);
  const [bulletResult, setBulletResult] = useState<RequestResult>({});
  const [bulletLoading, setBulletLoading] = useState(false);
  const [showBulletRequest, setShowBulletRequest] = useState(false);

  const normalizedBaseUrl = useMemo(() => baseUrl.replace(/\/$/, ""), [baseUrl]);

  const preparePayload = (body: Record<string, unknown>) => {
    if (authMode === "header") {
      if (!apiKey) {
        return { error: "Env VITE_DEFAULT_API_KEY is required for header auth." };
      }
      const clone = { ...body };
      delete (clone as Record<string, unknown>).test_api_key;
      return { payload: clone };
    }

    const keyFromForm = typeof body.test_api_key === "string" ? body.test_api_key : "";
    const chosenKey = (keyFromForm || apiKey || "").trim();
    if (!chosenKey) {
      return { error: "test_api_key is required when using body auth mode." };
    }
    return { payload: { ...body, test_api_key: chosenKey } };
  };

  const buildRoleFitPayload = (form: typeof roleFitForm) => {
    const weightings = {
      skills: Number(form.weightings.skills) || 0,
      domain: Number(form.weightings.domain) || 0,
      seniority: Number(form.weightings.seniority) || 0,
      leadership: Number(form.weightings.leadership) || 0
    };
    const options: Record<string, unknown> = { weightings };
    if (form.target_seniority_hint?.trim()) {
      options.target_seniority_hint = form.target_seniority_hint;
    }

    return {
      profile_text: form.profile_text,
      job_description: form.job_description,
      locale: form.locale,
      options,
      test_api_key: form.test_api_key
    };
  };

  const buildCurl = (endpoint: string, payload: Record<string, unknown>) => {
    const url = `${normalizedBaseUrl}${endpoint}`;
    const lines = [
      `curl -X POST "${url}"`,
      `  -H "Content-Type: application/json"`,
      ...(authMode === "header" && apiKey
        ? [`  -H "Authorization: Bearer ${apiKey}"`]
        : []),
      `  -d '${JSON.stringify(payload, null, 2)}'`
    ];
    return lines.join(" \\\n");
  };

  const runRequest = async (
    endpoint: string,
    payload: Record<string, unknown>,
    stubBody?: unknown
  ): Promise<RequestResult> => {
    const url = `${normalizedBaseUrl}${endpoint}`;

    if (useStub) {
      const start = performance.now();
      await new Promise((r) => setTimeout(r, 250));
      const duration = Math.round(performance.now() - start);
      return { status: 200, durationMs: duration, responseBody: stubBody ?? payload };
    }

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authMode === "header" && apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const body = JSON.stringify(payload);
    console.log("Request", { url, headers, payload });
    const start = performance.now();

    try {
      const res = await fetch(url, { method: "POST", headers, body });
      const text = await res.text();
      const duration = Math.round(performance.now() - start);
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : {};
      } catch {
        parsed = text;
      }
      console.log("Response", { status: res.status, durationMs: duration, body: parsed });
      return {
        status: res.status,
        durationMs: duration,
        responseBody: parsed,
        rawText: text,
        error: res.ok ? undefined : `HTTP ${res.status}`
      };
    } catch (err) {
      console.error("Request failed", err);
      return {
        error: err instanceof Error ? err.message : "Request failed"
      };
    }
  };

  const handleProfileSubmit = async () => {
    if (!profileForm.profile_text.trim()) {
      setProfileResult({ error: "profile_text is required" });
      return;
    }
    const prepared = preparePayload({ ...profileForm });
    if (prepared.error || !prepared.payload) {
      setProfileResult({ error: prepared.error });
      return;
    }
    const payload = prepared.payload;
    setProfileLoading(true);
    try {
      const result = await runRequest("/v1/analyze/profile", payload, stubbedResponses.profile);
      setProfileResult({ ...result, requestBody: payload });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleRoleFitSubmit = async () => {
    if (!roleFitForm.profile_text.trim() || !roleFitForm.job_description.trim()) {
      setRoleFitResult({ error: "profile_text and job_description are required" });
      return;
    }
    const prepared = preparePayload(buildRoleFitPayload(roleFitForm));
    if (prepared.error || !prepared.payload) {
      setRoleFitResult({ error: prepared.error });
      return;
    }
    const payload = prepared.payload;
    setRoleFitLoading(true);
    try {
      const result = await runRequest(
        "/v1/analyze/role-fit",
        payload,
        stubbedResponses.roleFit
      );
      setRoleFitResult({ ...result, requestBody: payload });
    } finally {
      setRoleFitLoading(false);
    }
  };

  const handleBulletSubmit = async () => {
    if (!bulletForm.profile_text.trim()) {
      setBulletResult({ error: "profile_text is required" });
      return;
    }
    const prepared = preparePayload({
      ...bulletForm,
      max_bullets: Number(bulletForm.max_bullets) || 0
    });
    if (prepared.error || !prepared.payload) {
      setBulletResult({ error: prepared.error });
      return;
    }
    const payload = prepared.payload;
    setBulletLoading(true);
    try {
      const result = await runRequest("/v1/suggest/bullets", payload, stubbedResponses.bullets);
      setBulletResult({ ...result, requestBody: payload });
    } finally {
      setBulletLoading(false);
    }
  };

  const referenceContent = (
    <div className="panel card stack">
      <div className="section-title">
        <span>API Reference</span>
        <span className="badge">Static deploy ready</span>
      </div>
      <div className="stack">
        <div className="stack">
          <strong>Auth</strong>
          <span>
            Mode A: Authorization header <code>Bearer &lt;apiKey&gt;</code>. Mode B:{" "}
            <code>test_api_key</code> in body. Toggle in the top bar.
          </span>
        </div>
        <div className="stack">
          <strong>Endpoints</strong>
          <ul>
            <li>POST /v1/analyze/profile</li>
            <li>POST /v1/analyze/role-fit</li>
            <li>POST /v1/suggest/bullets</li>
          </ul>
        </div>
        <div className="stack">
          <strong>Tips</strong>
          <span>Use stub mode to try the UI without a key. Copy cURL for each call.</span>
          <span>Console logs include request/response for debugging.</span>
        </div>
      </div>
      <div className="footer">
        Base URL defaults to <code>{defaultBaseUrl}</code>. Override via environment or UI.
      </div>
    </div>
  );

  const renderResponse = (
    result: RequestResult,
    loading: boolean,
    showRequest: boolean,
    setShowRequest: (show: boolean) => void
  ) => (
    <div className="panel card stack">
      <div className="section-title">
        <span>Response</span>
        <div className="copy-row">
          {result.responseBody !== undefined && result.responseBody !== null && (
            <button
              className="button ghost"
              onClick={() => copyToClipboard(pretty(result.responseBody))}
            >
              Copy response JSON
            </button>
          )}
          {result.requestBody !== undefined && result.requestBody !== null && (
            <button
              className="button ghost"
              onClick={() => copyToClipboard(pretty(result.requestBody))}
            >
              Copy request JSON
            </button>
          )}
        </div>
      </div>

      <div className="label-row">
        <span
          className={`status-chip ${
            loading
              ? ""
              : result.status && result.status < 300
                ? "ok"
                : result.error
                  ? "err"
                  : ""
          }`}
        >
          {loading ? "Loading…" : result.status ? `Status ${result.status}` : "Pending"}
        </span>
        {typeof result.durationMs === "number" && (
          <span className="status-chip">Latency: {result.durationMs} ms</span>
        )}
      </div>

      {result.error && <div className="error-banner">{result.error}</div>}

      {loading && (
        <div className="stack">
          <strong>In flight</strong>
          <span>Waiting for API response…</span>
        </div>
      )}

      {!loading && result.responseBody !== undefined && result.responseBody !== null && (
        <div className="stack">
          <strong>Response Body</strong>
          <pre className="code-block">{pretty(result.responseBody)}</pre>
        </div>
      )}
      {!loading && result.responseBody === undefined && !result.error && (
        <div className="stack">
          <strong>Awaiting response</strong>
          <span>Submit the form to see results.</span>
        </div>
      )}

      {result.requestBody !== undefined && result.requestBody !== null && (
        <div className="stack">
          <button
            className="collapsible-header"
            onClick={() => setShowRequest(!showRequest)}
          >
            <span style={{ transform: showRequest ? "rotate(90deg)" : "rotate(0deg)" }}>
              ▶
            </span>
            <strong>Request</strong>
          </button>
          {showRequest && (
            <pre className="code-block">{pretty(result.requestBody)}</pre>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="app-shell">
      <div className="card top-bar">
        <div className="stack">
            Base URL
          <input
            className="text-input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://x8ki-letl-twmt.n7.xano.io/api:career_signals"
          />
        </div>
     
     
      </div>

      <div className="card">
        <div className="tabs">
          <button
            className={`tab ${tab === "profile" ? "active" : ""}`}
            onClick={() => setTab("profile")}
          >
            Profile Analysis
          </button>
          <button
            className={`tab ${tab === "roleFit" ? "active" : ""}`}
            onClick={() => setTab("roleFit")}
          >
            Role Fit
          </button>
          <button
            className={`tab ${tab === "bullets" ? "active" : ""}`}
            onClick={() => setTab("bullets")}
          >
            Bullet Suggestions
          </button>
        
        </div>

        {tab === "reference" ? (
          referenceContent
        ) : (
          <div className="content">
            {tab === "profile" && (
              <>
                <div className="panel card stack">
                  <div className="section-title">
                    <div className="stack" style={{ gap: "4px" }}>
                      <span>Profile Analysis</span>
                      <div className="endpoint-info">
                        <code className="endpoint-path">POST /v1/analyze/profile</code>
                        <p className="endpoint-description">
                          Analyzes a candidate's profile text to extract key signals, strengths, and potential concerns.
                          Provides insights into leadership indicators and risk factors when enabled.
                        </p>
                      </div>
                    </div>
                    <div className="copy-row">
                      <button
                        className="button ghost"
                        onClick={() =>
              {
                const prepared = preparePayload({ ...profileForm });
                if (prepared.error || !prepared.payload) {
                  setProfileResult({ error: prepared.error });
                  return;
                }
                copyToClipboard(buildCurl("/v1/analyze/profile", prepared.payload));
              }
                        }
                      >
                        Copy cURL
                      </button>
                  
                    </div>
                  </div>

                  <div className="stack">
                    <div className="stack">
                      <FieldLabel tooltip="The candidate's resume or profile text to analyze">
                        Profile Text *
                      </FieldLabel>
                      <textarea
                        className="textarea"
                        value={profileForm.profile_text}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, profile_text: e.target.value })
                        }
                      />
                    </div>
                    <div className="row">
                      <div className="stack">
                        <FieldLabel tooltip="Locale code for the analysis (e.g., en-US, en-GB)">
                          Locale
                        </FieldLabel>
                        <input
                          className="text-input"
                          value={profileForm.locale}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, locale: e.target.value })
                          }
                        />
                      </div>
                      {authMode === "body" && (
                        <div className="stack">
                          <FieldLabel tooltip="API key to include in the request body (for demo mode)">
                            test_api_key (body)
                          </FieldLabel>
                          <input
                            className="text-input"
                            value={profileForm.test_api_key}
                            onChange={(e) =>
                              setProfileForm({ ...profileForm, test_api_key: e.target.value })
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="row">
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={profileForm.include_leadership_signals}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              include_leadership_signals: e.target.checked
                            })
                          }
                        />
                        <span>
                          Include leadership signals
                          <InlineTooltip tooltip="Analyze the profile for leadership indicators and signals" />
                        </span>
                      </label>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={profileForm.include_risk_signals}
                          onChange={(e) =>
                            setProfileForm({
                              ...profileForm,
                              include_risk_signals: e.target.checked
                            })
                          }
                        />
                        <span>
                          Include risk signals
                          <InlineTooltip tooltip="Identify potential risk factors or concerns in the profile" />
                        </span>
                      </label>
                    </div>

                    <div className="copy-row">
                      <button className="button" onClick={handleProfileSubmit}>
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
                {renderResponse(profileResult, profileLoading, showProfileRequest, setShowProfileRequest)}
              </>
            )}

            {tab === "roleFit" && (
              <>
                <div className="panel card stack">
                  <div className="section-title">
                    <div className="stack" style={{ gap: "4px" }}>
                      <span>Role Fit</span>
                      <div className="endpoint-info">
                        <code className="endpoint-path">POST /v1/analyze/role-fit</code>
                        <p className="endpoint-description">
                          Compares a candidate's profile against a job description to calculate alignment scores.
                          Identifies matched skills, gaps, green flags, red flags, and provides tailored recommendations.
                        </p>
                      </div>
                    </div>
                    <div className="copy-row">
                      <button
                        className="button ghost"
                        onClick={() =>
                          {
                            const prepared = preparePayload(buildRoleFitPayload(roleFitForm));
                            if (prepared.error || !prepared.payload) {
                              setRoleFitResult({ error: prepared.error });
                              return;
                            }
                            copyToClipboard(buildCurl("/v1/analyze/role-fit", prepared.payload));
                          }
                        }
                      >
                        Copy cURL
                      </button>
                    </div>
                  </div>

                  <div className="stack">
                    <div className="stack">
                      <FieldLabel tooltip="The candidate's resume or profile text to analyze">
                        Profile Text *
                      </FieldLabel>
                      <textarea
                        className="textarea"
                        value={roleFitForm.profile_text}
                        onChange={(e) =>
                          setRoleFitForm({ ...roleFitForm, profile_text: e.target.value })
                        }
                      />
                    </div>
                    <div className="stack">
                      <FieldLabel tooltip="The job description or role requirements to match against">
                        Job Description *
                      </FieldLabel>
                      <textarea
                        className="textarea"
                        value={roleFitForm.job_description}
                        onChange={(e) =>
                          setRoleFitForm({ ...roleFitForm, job_description: e.target.value })
                        }
                      />
                    </div>
                    <div className="row">
                      <div className="stack">
                        <FieldLabel tooltip="Locale code for the analysis (e.g., en-US, en-GB)">
                          Locale
                        </FieldLabel>
                        <input
                          className="text-input"
                          value={roleFitForm.locale}
                          onChange={(e) =>
                            setRoleFitForm({ ...roleFitForm, locale: e.target.value })
                          }
                        />
                      </div>
                      <div className="stack">
                        <FieldLabel tooltip="Hint for the target seniority level (e.g., Staff, Senior, Principal)">
                          Target Seniority Hint
                        </FieldLabel>
                        <input
                          className="text-input"
                          value={roleFitForm.target_seniority_hint}
                          onChange={(e) =>
                            setRoleFitForm({
                              ...roleFitForm,
                              target_seniority_hint: e.target.value
                            })
                          }
                        />
                      </div>
                      {authMode === "body" && (
                        <div className="stack">
                          <FieldLabel tooltip="API key to include in the request body (for demo mode)">
                            test_api_key (body)
                          </FieldLabel>
                          <input
                            className="text-input"
                            value={roleFitForm.test_api_key}
                            onChange={(e) =>
                              setRoleFitForm({ ...roleFitForm, test_api_key: e.target.value })
                            }
                          />
                        </div>
                      )}
                    </div>
                    <div className="stack">
                      <FieldLabel tooltip="Relative importance weights for each alignment component (should sum to 1.0)">
                        Weightings
                      </FieldLabel>
                      <div className="row">
                        {(["skills", "domain", "seniority", "leadership"] as const).map(
                          (key) => (
                            <div className="stack" key={key}>
                             
                              <input
                                className="text-input"
                                type="number"
                                step="0.1"
                                value={roleFitForm.weightings[key]}
                                onChange={(e) =>
                                  setRoleFitForm({
                                    ...roleFitForm,
                                    weightings: {
                                      ...roleFitForm.weightings,
                                      [key]: e.target.value
                                    }
                                  })
                                }
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div className="copy-row">
                      <button className="button" onClick={handleRoleFitSubmit}>
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
                {renderResponse(roleFitResult, roleFitLoading, showRoleFitRequest, setShowRoleFitRequest)}
              </>
            )}

            {tab === "bullets" && (
              <>
                <div className="panel card stack">
                  <div className="section-title">
                    <div className="stack" style={{ gap: "4px" }}>
                      <span>Bullet Suggestions</span>
                      <div className="endpoint-info">
                        <code className="endpoint-path">POST /v1/suggest/bullets</code>
                        <p className="endpoint-description">
                          Generates concise, impactful resume bullet points from a candidate's profile text.
                          Can be tailored to a specific role and job description for better alignment.
                        </p>
                      </div>
                    </div>
                    <div className="copy-row">
                      <button
                        className="button ghost"
                        onClick={() =>
                          {
                            const prepared = preparePayload({
                              ...bulletForm,
                              max_bullets: Number(bulletForm.max_bullets) || 0
                            });
                            if (prepared.error || !prepared.payload) {
                              setBulletResult({ error: prepared.error });
                              return;
                            }
                            copyToClipboard(buildCurl("/v1/suggest/bullets", prepared.payload));
                          }
                        }
                      >
                        Copy cURL
                      </button>
                    </div>
                  </div>

                  <div className="stack">
                    <div className="stack">
                      <FieldLabel tooltip="The candidate's resume or profile text to generate bullets from">
                        Profile Text *
                      </FieldLabel>
                      <textarea
                        className="textarea"
                        value={bulletForm.profile_text}
                        onChange={(e) =>
                          setBulletForm({ ...bulletForm, profile_text: e.target.value })
                        }
                      />
                    </div>
                    <div className="stack">
                      <FieldLabel tooltip="Optional job description to tailor bullet points to the role">
                        Job Description
                      </FieldLabel>
                      <textarea
                        className="textarea"
                        value={bulletForm.job_description}
                        onChange={(e) =>
                          setBulletForm({ ...bulletForm, job_description: e.target.value })
                        }
                      />
                    </div>
                    <div className="row">
                      <div className="stack">
                        <FieldLabel tooltip="The target role title for the bullet suggestions">
                          Role Title
                        </FieldLabel>
                        <input
                          className="text-input"
                          value={bulletForm.role_title}
                          onChange={(e) =>
                            setBulletForm({ ...bulletForm, role_title: e.target.value })
                          }
                        />
                      </div>
                      <div className="stack">
                        <FieldLabel tooltip="Maximum number of bullet points to generate">
                          Max Bullets
                        </FieldLabel>
                        <input
                          className="text-input"
                          type="number"
                          value={bulletForm.max_bullets}
                          onChange={(e) =>
                          setBulletForm({
                            ...bulletForm,
                            max_bullets: Number(e.target.value)
                          })
                          }
                        />
                      </div>
                      {authMode === "body" && (
                        <div className="stack">
                          <FieldLabel tooltip="API key to include in the request body (for demo mode)">
                            test_api_key (body)
                          </FieldLabel>
                          <input
                            className="text-input"
                            value={bulletForm.test_api_key}
                            onChange={(e) =>
                              setBulletForm({ ...bulletForm, test_api_key: e.target.value })
                            }
                          />
                        </div>
                      )}
                    </div>

                    <div className="copy-row">
                      <button className="button" onClick={handleBulletSubmit}>
                        Submit
                      </button>
                    </div>
                  </div>
                </div>
                {renderResponse(bulletResult, bulletLoading, showBulletRequest, setShowBulletRequest)}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default App;

