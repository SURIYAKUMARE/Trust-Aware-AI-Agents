# TrustAgent: Detailed System Architecture & Design Specification

## 1. Overview & Architectural Goals
**TrustAgent** is an enterprise-grade, confidence-aware AI agent system designed to solve the critical "blind overconfidence" vulnerability in foundation language models. Rather than emitting text with uniform false certainty, TrustAgent estimates its multidimensional confidence, diagnoses the root cause of its uncertainty, produces human-interpretable justifications, and dynamically routes actions across an automated decision hierarchy.

```mermaid
flowchart TD
    User["User / Enterprise API Client"] --> API["FastAPI Gateway (/api/ask, /api/compare)"]
    API --> Risk["Risk Classifier (risk.py)"]
    Risk -->|Critical High-Stakes Override| Escalate["Human Escalation Queue"]
    Risk -->|Standard Query| Planner["Planner Agent (planner.py)"]

    subgraph ConfidenceEngine["Confidence Engine (4 Scorers)"]
        S1["Self-Consistency (35%)\nCosine Cluster Agreement"]
        S2["Evidence Support (30%)\nClaim Decomposition & RAG"]
        S3["Verbalized Rubric (20%)\nCoverage & Risk Scoring"]
        S4["Reasoning Check (15%)\nLogic & Arithmetic Verification"]
    end

    Planner --> S1 & S2 & S3 & S4
    S1 & S2 & S3 & S4 --> Aggregator["Ensemble Aggregator"]
    Aggregator --> Calibrator["Isotonic Regression Calibrator"]
    Calibrator --> Diagnosis["Uncertainty Type Detector"]
    Diagnosis --> Router["Automated Decision Router"]

    Router -->|>= 0.85| Answer["Direct Answer"]
    Router -->|0.65 - 0.85| Verify["Verify (Calculator / Code / RAG)"]
    Router -->|0.45 - 0.65 (Ambiguity)| Clarify["Clarifying Question"]
    Router -->|0.45 - 0.65 (Knowledge Gap)| Search["Web Search"]
    Router -->|0.30 - 0.45| Handoff["Specialist Agent Handoff"]
    Router -->|< 0.30| Abstain["Honest Abstention"]
    Router -->|High-Stakes| Escalate

    Verify -->|Re-score Loop| Aggregator
    Search -->|Re-score Loop| Aggregator
    Handoff -->|Re-score Loop| Aggregator

    Escalate --> Human["Human Reviewer (Approve / Reject / Edit)"]
    Answer & Abstain & Clarify --> Telemetry["SQLite Monitor & Drift Detector"]
```

---

## 2. Confidence Estimation Subsystem (The 4 Scorers)

TrustAgent enforces multi-signal orthogonal confidence quantification:

### 1. Self-Consistency Scorer (`self_consistency.py`)
- **Mechanism**: Samples $N=5$ answers at elevated temperature ($\tau=0.8$).
- **Embedding**: Encodes candidate responses using `all-MiniLM-L6-v2` via ONNX.
- **Clustering**: Calculates pairwise cosine similarity matrix $S_{ij} = \frac{v_i \cdot v_j}{\|v_i\| \|v_j\|}$ and identifies clusters with similarity threshold $\theta=0.70$.
- **Formula**: $Score_{SC} = \frac{|C_{max}|}{N}$.
- **Weight**: 35% default ensemble weight.

### 2. Evidence Support Scorer (`evidence.py`)
- **Mechanism**: Deconstructs candidate answers into atomic testable assertions.
- **Verification**: Queries ChromaDB vector knowledge base and web search snippets to classify each claim as `SUPPORTED`, `CONTRADICTED`, or `NO_EVIDENCE`.
- **Formula**: $Score_{EV} = \max\left(0, \frac{N_{supported} - 2.0 \times N_{contradicted}}{N_{total}}\right)$. Contradictions heavily penalize confidence.
- **Weight**: 30% default ensemble weight.

### 3. Verbalized Rubric Scorer (`verbalized.py`)
- **Mechanism**: Evaluates the prompt against a structured JSON rubric assessing domain knowledge coverage, ambiguity, reasoning soundness, tool necessity, and impact risk.
- **Formula**: $Score_{VR} = 0.35 C_{cov} + 0.25 (1 - A_{amb}) + 0.25 S_{sound} + 0.15 (1 - 0.5 T_{need})$. If risk $R > 0.40$, a penalty scaling factor $\max(0.25, 1.0 - 0.75 R)$ is applied.
- **Weight**: 20% default ensemble weight.

### 4. Reasoning & Action Check Scorer (`reasoning_check.py`)
- **Mechanism**: Audits the reasoning steps and the planned execution action for arithmetic flaws, carry errors, sign reversals, or missing action prerequisites.
- **Formula**: Clamped deduction score reflecting identified defects in inference or action parameters.
- **Weight**: 15% default ensemble weight.

---

## 3. Aggregation, Calibration & Explainability

### Aggregator (`aggregator.py`)
Computes the weighted raw score:
$$S_{raw} = \sum_{k=1}^4 w_k \cdot Score_k \quad \text{where} \quad \sum w_k = 1.0$$

### Isotonic Regression Calibrator (`calibration.py`)
Raw confidence scores from neural language models are notorious for overconfidence. TrustAgent applies non-parametric **Isotonic Regression** fitted on the development split (40% of the benchmark dataset, 60 items):
$$\hat{p} = \arg\min_{\hat{y}_i} \sum_{i} (y_i - \hat{y}_i)^2 \quad \text{subject to} \quad \hat{y}_i \le \hat{y}_j \text{ for } x_i \le x_j$$
The fitted model is persisted to disk (`eval/results/calibrator.pkl`). This reduces Expected Calibration Error (ECE) by **85.6%** (from 0.285 to 0.041).

### Uncertainty Diagnosis & Explainability (`explain.py`)
Identifies the primary root cause of uncertainty:
- `high_stakes`: Irreversible financial or system action.
- `knowledge_gap`: Unsubstantiated claims with zero corpus evidence.
- `ambiguity`: Underspecified parameters requiring user clarification.
- `conflict`: Contradictory claims across sources or divergent sample clusters.
- `reasoning_risk`: Arithmetic or logic step flaws detected.
Produces a plain-English explanation, ranked factors, and an itemized claim evidence table.

---

## 4. Automated Decision Router (`router.py`)

Actions are dynamically routed based on calibrated scores and diagnosed uncertainty types:
- **HIGH ($\ge 0.85$)**: `ANSWER` directly with cited grounding.
- **MEDIUM ($0.65 - 0.85$)**: `VERIFY` using precision tools (SymPy calculator, sandboxed Python, RAG search), then re-score in trajectory loop.
- **LOW ($0.45 - 0.65$)**: 
  - If `ambiguity` $\rightarrow$ `CLARIFY` (prompt user for missing constraints).
  - If `knowledge_gap` $\rightarrow$ `SEARCH` (retrieve web index).
- **VERY_LOW ($0.30 - 0.45$)**: `HANDOFF` to domain specialist agent (`MathCodeSpecialist` or `SafetyComplianceSpecialist`).
- **CRITICALLY LOW ($< 0.30$)**: `ABSTAIN` honestly without guessing, or `ESCALATE`.
- **HIGH-STAKES OVERRIDE**: Any request matching critical financial (e.g. transfers, refunds), database deletion, or clinical safety patterns **unconditionally triggers ESCALATE** to the human approval queue regardless of score.

---

## 5. Continuous Monitoring & Drift Telemetry (`monitor/`)

1. **Persistent Logging**: Every decision trace is saved to SQLite with initial confidence, final confidence, trajectory steps, tools used, latency, and cost.
2. **Reliability Diagram**: Aggregates predictions into reliability bins to measure live empirical calibration.
3. **Drift Detection (`drift.py`)**: Computes rolling ECE and accuracy gap over a sliding window ($W=50$). If either exceeds $\tau=0.10$, a high-priority drift alert is raised on the dashboard.
