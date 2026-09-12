# Fluxcast Backend — Coding Agent Build Plan

This document is the instruction set for a coding agent building the backend of **Fluxcast**, the AI-powered renewable generation forecasting and grid decision platform. The agent should treat `openapi.yaml` (provided alongside this document) as the **source of truth for all API contracts** — every route, request body, and response shape must match that spec exactly. This document explains *how* to build what the spec describes: the tech stack, folder structure, database, the agentic AI workflow, and each tool the agents will use.

---

## 1. Instructions for the Coding Agent

1. **Read `openapi.yaml` first, fully, before writing any route.** Every endpoint you implement must match its path, method, parameters, request body schema, and response schema exactly as defined there. If something is ambiguous in the spec, make the smallest reasonable assumption and note it in a code comment — do not silently deviate.
2. **Build in this order** (each phase should be runnable and testable before moving to the next):
   1. Project scaffold + MongoDB Atlas connection + health-check route.
   2. Auth (`/auth/login`) and the `Plant` CRUD routes.
   3. Telemetry ingestion routes.
   4. Weather connector services (Open-Meteo first, since it's the simplest; then MOSDAC and NASA adapters).
   5. MCP tool servers wrapping the above services.
   6. LangGraph agent workflow (Weather-Reasoning → Forecasting → Decision → Explainability).
   7. Forecast, Recommendation, and Explain routes (wired to the agent workflow).
   8. Simulation route.
   9. Alerts (generation + list + acknowledge) and Socket.IO real-time push.
   10. Portfolio aggregation route.
3. **Validate every request body** against the OpenAPI schema (use a library like `express-openapi-validator` so the spec is enforced automatically rather than re-implemented by hand).
4. **Never hard-code an external API call inside an agent.** All calls to Open-Meteo, MOSDAC, NASA, or the database must go through an MCP tool, so the agent workflow stays swappable and testable.
5. **Write one Jest test file per route group and per MCP tool.** Mock external HTTP calls (Open-Meteo, MOSDAC, NASA) in tests — never call real external APIs in the test suite.
6. **Log every agent step** (which agent ran, what tool it called, what it returned) to make the reasoning chain debuggable — this is a decision-support system, so operators will ask "why did it recommend this?"
7. **Use JavaScript (not TypeScript)** throughout, per project requirement. Use JSDoc comments on exported functions for editor type-hinting instead.

---

## 2. Tech Stack & Core Tools

| Layer | Technology | Why |
|---|---|---|
| Runtime | **Node.js** (LTS) | Required by project spec. |
| Web framework | **Express.js** | Required by project spec; simple, well-documented REST routing. |
| Database | **MongoDB Atlas** | Required by project spec; cloud-hosted, flexible schema for time-series-like forecast/telemetry data, built-in vector search for RAG. |
| ODM | **Mongoose** | Schema validation and easier querying against MongoDB. |
| Agent framework | **LangChain.js** | Builds the individual agents (prompt + tools + memory). |
| Agent orchestration | **LangGraph.js** | Defines the multi-agent graph — which agent runs next, retries, and shared state. |
| Tool protocol | **MCP (Model Context Protocol)** | Standardizes how agents call external data sources and internal functions as "tools," instead of hard-coded API calls. |
| Vector search (RAG) | **MongoDB Atlas Vector Search** | Reuses the same Atlas cluster to store embeddings of historical generation/weather patterns — avoids running a second database. |
| LLM provider | **Anthropic Claude API** (via `@anthropic-ai/sdk` or LangChain's Anthropic integration) | Powers the reasoning inside each agent. |
| Scheduling | **node-cron** | Triggers periodic weather pulls and forecast runs. |
| Real-time updates | **Socket.IO** | Pushes alerts and forecast updates to the dashboard live. |
| Validation | **express-openapi-validator** | Enforces `openapi.yaml` automatically on every request/response. |
| Auth | **jsonwebtoken** + **bcrypt** | Issues/verifies JWTs for `/auth/login`; hashes stored passwords. |
| HTTP client | **axios** | Calls Open-Meteo, MOSDAC, and NASA endpoints. |
| Caching (optional) | **Redis** | Caches recent weather responses to reduce redundant external calls. |
| Testing | **Jest** + **Supertest** | Unit tests for tools/agents, integration tests for routes. |
| Env config | **dotenv** | Manages API keys and DB connection strings. |

---

## 3. Project Structure

```
/fluxcast-backend
  /src
    /routes
      auth.routes.js
      plants.routes.js
      weather.routes.js
      forecast.routes.js
      recommendation.routes.js
      simulate.routes.js
      alerts.routes.js
      portfolio.routes.js
    /models                      → Mongoose schemas
      Plant.js
      Telemetry.js
      WeatherSnapshot.js
      ForecastResult.js
      Recommendation.js
      Alert.js
      User.js
    /services
      /connectors                → raw external API wrappers (plain functions, no agent logic)
        openMeteoConnector.js
        mosdacConnector.js
        nasaConnector.js
        telemetryConnector.js
      /mcp-tools                 → MCP tool definitions that wrap the connectors above
        openMeteoTool.js
        mosdacTool.js
        nasaGisTool.js
        telemetryTool.js
        batteryStatusTool.js
        demandDataTool.js
        ragRetrieverTool.js
        dbReadWriteTool.js
        notificationTool.js
      /agents                    → LangChain agent definitions
        weatherReasoningAgent.js
        forecastingAgent.js
        decisionAgent.js
        explainabilityAgent.js
      /graph
        forecastWorkflow.js       → LangGraph graph wiring the four agents together
      /auth
        authService.js
    /jobs
      scheduledForecastJob.js     → node-cron job calling the workflow per plant
      scheduledWeatherPull.js
    /middleware
      authMiddleware.js
      errorHandler.js
      openApiValidatorSetup.js
    /sockets
      alertSocket.js
    /config
      db.js
      env.js
    app.js                        → Express app setup (middleware, routes)
    server.js                     → entry point (starts HTTP + Socket.IO server)
  /tests
    /routes
    /services
    /agents
  openapi.yaml                    → the provided spec (kept in the repo root, used for validation)
  .env.example
  package.json
```

---

## 4. Database (MongoDB Atlas)

- Use **one Atlas cluster**, one database (e.g. `fluxcast`), with these collections, matching the OpenAPI schemas:
  - `users` — login credentials and role (`grid_operator`, `utility_admin`, `plant_owner`, `admin`).
  - `plants` — matches the `Plant` schema (name, type, coordinates, capacity, solar/wind spec, `hasLimitedHistory` flag).
  - `telemetry` — matches `TelemetryPoint`; indexed on `(plantId, timestamp)` for fast recent-history lookups.
  - `weatherSnapshots` — matches `WeatherSnapshot`; stores the reconciled hourly weather data per plant per run, so repeated forecast runs don't always need fresh external calls.
  - `forecastResults` — matches `ForecastResult`, including `riskWindows`.
  - `recommendations` — matches `Recommendation`.
  - `alerts` — matches `Alert`.
  - `historicalEmbeddings` — vector-indexed collection (Atlas Vector Search) storing embeddings of past generation/weather patterns, used by the RAG Retriever Tool.
- Use Mongoose schemas that mirror the OpenAPI component schemas field-for-field, so the API validator and the database layer never disagree on shape.

---

## 5. API Endpoints — Descriptions & Use Cases

*(Full request/response detail lives in `openapi.yaml`; this section explains the intent behind each group so the agent understands what each route is for, not just its shape.)*

### Auth
- **`POST /auth/login`** — Issues a JWT for a registered user. Used by the frontend to authenticate grid operators, utility admins, or plant owners before they can see any plant data.

### Plants
- **`GET /plants`** — Lists all plants, filterable by type (`solar`/`wind`). Use case: populate the portfolio dashboard's plant list and map markers.
- **`POST /plants`** — Registers a new plant site. Use case: onboarding a newly commissioned plant (may have `hasLimitedHistory: true`, which the Forecasting Agent will read to trigger the proxy-data fallback).
- **`GET /plants/{plantId}`** — Fetch one plant's static details (location, capacity, specs). Use case: plant detail page.
- **`PATCH /plants/{plantId}`** — Update plant metadata (e.g., capacity changed after an upgrade).
- **`DELETE /plants/{plantId}`** — Decommission a plant record.

### Telemetry
- **`GET /plants/{plantId}/telemetry`** — Returns the last N days (default 4) of actual generation and sensor status. Use case: feeds the Forecasting Agent's short-term trend input, and powers the dashboard's "actual vs. forecast" chart.
- **`POST /plants/{plantId}/telemetry`** — Ingests one new reading from the plant's SCADA/inverter feed. Use case: called by a small on-site agent or polling job at the plant, not by end users.

### Weather
- **`GET /plants/{plantId}/weather`** — Returns weather data for the plant's coordinates, already reconciled across Open-Meteo, MOSDAC, and NASA by the Weather-Reasoning Agent. Use case: dashboard weather panel, and direct input to the Forecasting Agent.

### Forecasts
- **`GET /plants/{plantId}/forecast`** — Returns the most recently generated forecast (expected MW, uncertainty bounds, risk windows) for a given horizon (24/48/72h). Use case: main dashboard chart.
- **`POST /plants/{plantId}/forecast`** — Triggers a fresh run of the full agent workflow for this plant (rather than waiting for the next scheduled job). Use case: "Refresh forecast" button, or triggered automatically after new telemetry/weather data arrives. Returns a `jobId` immediately (async — the workflow runs in the background).

### Recommendations & Explainability
- **`GET /plants/{plantId}/recommendation`** — Returns the Decision Agent's latest suggested action (charge/discharge battery, curtail, export, activate backup, or hold), with the constraints it considered. Use case: operator's action panel.
- **`GET /plants/{plantId}/explain`** — Returns the Explainability Agent's plain-language summary of *why* the forecast/recommendation look the way they do. Use case: the dashboard's root-cause tooltip/panel.

### Simulation
- **`POST /simulate`** — Re-runs the workflow with overridden assumptions (e.g., "demand +10%, turbine offline 6h") without touching stored forecasts. Use case: the "what-if" panel operators use to stress-test decisions before committing to them.

### Alerts
- **`GET /alerts`** — Lists active alerts, filterable by severity or plant. Use case: dashboard alert feed / notification bell.
- **`POST /alerts/{alertId}/acknowledge`** — Marks an alert as seen/handled. Use case: operator clears an alert after acting on it.

### Portfolio
- **`GET /portfolio/forecast`** — Aggregates forecasts across some or all plants into a single combined view. Use case: utility-company users who manage many sites and want one combined supply picture rather than checking each plant individually.

---

## 6. Agentic AI Workflow — Agents & Tools in Detail

The workflow is a **LangGraph state graph**. State is passed between nodes (agents); each agent reads what it needs from the shared state, calls its tools, and writes its output back into the state for the next agent.

```
[Weather-Reasoning Agent] → [Forecasting Agent] → [Decision Agent] → [Explainability Agent] → (save to DB + emit alert if needed)
```

### 6.1 Weather-Reasoning Agent
- **Purpose:** Fetch weather data for the plant's coordinates from all three sources and produce one reconciled hourly weather dataset, resolving disagreements (e.g., if Open-Meteo says 20% cloud cover and MOSDAC says 60%, decide which to trust or blend them).
- **Tools it calls:** Open-Meteo Tool, MOSDAC Tool, NASA GIS Tool.
- **Output:** A `WeatherSnapshot`-shaped object, saved via the DB Read/Write Tool.

### 6.2 Forecasting Agent
- **Purpose:** Combine the reconciled weather data with the plant's recent generation history (and, for new plants, similar-plant data from RAG) to produce expected generation with a confidence range for the requested horizon.
- **Tools it calls:** Plant Telemetry Tool, RAG Retriever Tool, DB Read/Write Tool (to save the `ForecastResult`).
- **Output:** A `ForecastResult`-shaped object, including flagged `riskWindows`.

### 6.3 Decision Agent
- **Purpose:** Turn the forecast into a concrete recommended action, respecting real-world constraints.
- **Tools it calls:** Battery/Storage Status Tool, Grid/Demand Data Tool, DB Read/Write Tool (to save the `Recommendation`).
- **Output:** A `Recommendation`-shaped object (action, amount, duration, reasoning, constraints considered).

### 6.4 Explainability Agent
- **Purpose:** Convert the forecast + recommendation into a short, plain-language explanation for the dashboard, and answer what-if questions when called from the Simulation route.
- **Tools it calls:** None external — it reads the outputs of the previous three agents (already in shared state) and, if a risk window was flagged, calls the Notification Tool to raise an alert.
- **Output:** A short text summary + factor list, plus (conditionally) a new `Alert`.

---

## 7. MCP Tools — Full Reference

Each tool below should be implemented as its own MCP tool definition (name, description, input schema, and a handler function that calls the underlying connector). Descriptions should be written for the LLM to read, so keep them specific about *when* to use the tool.

| Tool name | Description (for the agent) | External resource called | Notes |
|---|---|---|---|
| **openMeteoTool** | "Fetch hourly weather forecast (cloud cover, solar radiation, wind speed/direction, rain probability, temperature) for a given latitude/longitude and horizon in hours." | `GET https://api.open-meteo.com/v1/forecast` (open-meteo.com) | No API key needed for non-commercial use. Request only the variables relevant to the plant type (solar vs. wind) to keep responses small. |
| **mosdacTool** | "Fetch ISRO satellite-derived cloud cover, rainfall, and insolation data for a location within the Indian subcontinent." | MOSDAC data services (mosdac.gov.in) | MOSDAC does not expose a simple public JSON API like Open-Meteo — this tool should wrap whatever access method is available (registered API/download endpoint), and normalize the response into the same shape as `openMeteoTool`'s output. Flag in code if this currently requires a manual/batch download rather than live calls, so the workflow can fall back gracefully. |
| **nasaGisTool** | "Fetch supporting satellite/GIS weather layer data (e.g., solar radiation, cloud layers) for a location, primarily for cross-checking irradiance and for map overlays." | NASA Earth data / ArcGIS map service layers | This is GIS layer data, not a single REST JSON endpoint — wrap the relevant ArcGIS REST service query in this tool and normalize the output the same way as the other two weather tools. |
| **telemetryTool** | "Read a plant's own recent actual generation output, sensor status, and outage history for the last N days." | Internal MongoDB Atlas (`telemetry` collection) | No external call — a direct DB read via Mongoose. |
| **batteryStatusTool** | "Read current battery/storage charge level and available capacity for a plant." | Internal MongoDB Atlas (or a connected storage/BMS system, if available) | Placeholder for real BMS integration; start with a DB-backed mock. |
| **demandDataTool** | "Read current or forecast electricity demand relevant to a plant/grid region." *(optional data source)* | Internal MongoDB Atlas, or a grid-demand API if the utility provides one | Optional per the original problem statement — can be stubbed initially. |
| **ragRetrieverTool** | "Search historical generation and weather-pattern embeddings for records similar to the current situation — used especially for newly commissioned plants with little history." | MongoDB Atlas Vector Search (`historicalEmbeddings` collection) | Embeddings generated ahead of time (or on ingestion) using an embedding model; queried by vector similarity. |
| **dbReadWriteTool** | "Save or retrieve forecasts, recommendations, and alerts to/from the database." | Internal MongoDB Atlas (`forecastResults`, `recommendations`, `alerts` collections) | Used by multiple agents to persist their output. |
| **notificationTool** | "Raise a real-time alert when a risk window (curtailment, shortfall, storage limit, sensor fault, extreme weather) is detected." | Internal — writes to `alerts` collection, then emits via Socket.IO | Also the hook point for future email/SMS integration. |

---

## 8. Non-Functional Requirements

- **Error handling:** every route uses a shared `errorHandler` middleware; external tool calls (Open-Meteo/MOSDAC/NASA) must catch failures and let the Weather-Reasoning Agent fall back to whichever sources succeeded, rather than failing the whole workflow.
- **Retries:** wrap external API calls with a small retry-with-backoff (e.g., 2 retries) before treating a source as unavailable for that run.
- **Security:** all routes except `/auth/login` require a valid JWT (`authMiddleware`); role checks (e.g., only `admin`/`utility_admin` can delete plants) should be added where relevant even though the OpenAPI spec doesn't encode roles explicitly.
- **Rate limiting:** add basic rate limiting on `/simulate` and `POST /plants/{plantId}/forecast` since these trigger LLM calls and external API hits.
- **Observability:** log each agent's tool calls and durations; expose a simple `/health` route (not in the OpenAPI spec, but useful for deployment checks) that verifies the MongoDB Atlas connection.
- **Testing:** contract-test every route against `openapi.yaml` using `express-openapi-validator`'s response validation in test mode, in addition to normal Jest assertions.

---

## 9. Suggested Milestones

1. Scaffold + Atlas connection + `/auth/login` + `Plant` CRUD — deployable and testable.
2. Telemetry ingestion + weather connectors (Open-Meteo only) returning real data.
3. MOSDAC + NASA adapters added, Weather-Reasoning Agent reconciling all three.
4. Forecasting Agent + RAG retriever wired up, `GET/POST /forecast` working end-to-end.
5. Decision Agent + Explainability Agent, `/recommendation` and `/explain` routes live.
6. Simulation route reusing the same graph with overridden state.
7. Alerts + Socket.IO real-time push.
8. Portfolio aggregation route.
9. Full test suite pass + OpenAPI contract validation pass.
