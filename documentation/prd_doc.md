# RESQ

## Predictive Multi-Agent Disaster Relief & Emergency Resource Coordinator

### Final 24-Hour Hackathon Specification

---

# 1. Project Vision

**RESQ** is a human-supervised, multi-agent disaster-response coordination platform that continuously analyzes disaster information, estimates severity and resource needs, optimizes resource allocation, and dynamically replans when conditions change.

The system combines:

* Machine Learning
* Agentic AI
* Resource Optimization
* Predictive Forecasting
* Digital Twin Simulation
* Real-time coordination
* Human-in-the-loop decision making

The core objective is:

> **Observe → Understand → Predict → Prioritize → Optimize → Approve → Act → Replan**

The system should not simply display disaster information. It should continuously determine **what should happen next** as the disaster evolves.

---

# 2. Problem Being Solved

During disasters, information is:

* incomplete
* rapidly changing
* distributed across multiple sources
* sometimes duplicated or contradictory

At the same time, resources such as:

* rescue teams
* ambulances
* food
* water
* medical kits
* shelter capacity

are limited.

Traditional approaches often depend on manual coordination and static allocation.

RESQ addresses this by creating an intelligent coordination loop that can:

1. Understand incoming incidents.
2. Verify and deduplicate reports.
3. Estimate severity.
4. Estimate current and future resource demand.
5. Match available resources.
6. Optimize allocation under constraints.
7. Coordinate agencies.
8. Detect changing conditions.
9. Dynamically reallocate resources.
10. Maintain a transparent audit trail.

---

# 3. Core System Model

RESQ uses three primary entities.

## 3.1 Disaster Zones — Macro Demand

A disaster zone represents a larger affected geographical area.

Each zone contains:

* zone ID
* name
* center coordinates
* radius
* disaster type
* population estimate
* severity
* severity confidence
* estimated resource needs
* forecasted needs
* current status

Example:

```text
Zone C
Flood
Population: 12,000
Severity: HIGH
Confidence: 91%
```

A zone can receive resources even when no individual SOS report exists.

This is important because disaster response cannot depend entirely on individual field reports. The friend's PRD already establishes this macro-zone model and baseline allocation approach.

---

# 4. Field SOS Reports — Micro Incidents

A field report represents a specific emergency within or near a disaster zone.

Example:

> "Hospital basement flooded. 40 patients stranded without electricity."

The report contains:

* report ID
* coordinates
* zone ID
* raw description
* timestamp
* source
* extracted entities
* severity signal
* verification status
* confidence

The frontend displays these as **red incident markers** on the map.

---

# 5. Helping Points — Supply Nodes

Helping Points represent locations from which resources can be deployed.

Examples:

* Government warehouses
* NDRF/rescue bases
* NGOs
* Hospitals
* Municipal depots
* Military bases

Each helping point contains:

* location
* organization
* agency type
* available resources
* committed resources
* reliability
* capabilities
* operational status

Example:

```text
NDRF Base Alpha

Rescue Teams: 10
Medical Kits: 250
Water: 5000 L

Capability:
Rescue + Medical

Status:
Available
```

---

# 6. Resources

The MVP will support a controlled set of resources.

### Primary resources

* Drinking water
* Food
* Medical kits
* Rescue teams
* Ambulances
* Rescue boats
* Shelter beds

The system tracks:

```text
Total
Available
Reserved
In Transit
Delivered
```

This keeps resource allocation measurable and easy to demonstrate.

---

# 7. Incident Input

The frontend should support two forms of incident input.

## Structured Input

The responder can enter:

```text
Incident Type
Location / Zone
People Affected
Stranded People
Medical Emergencies
Vulnerable Population
Infrastructure Damage
Road Condition
Description
Image/Video
```

## Natural Language Input

The responder can simply write:

> "Heavy flooding near Zone C. Around 200 people are stranded and elderly residents need medical assistance. Main road is blocked."

The Incident Intelligence Agent converts this into structured information.

Example:

```json
{
  "incident_type": "flood",
  "zone": "Zone C",
  "people_affected": 200,
  "stranded": 200,
  "medical_need": "high",
  "vulnerable_population": true,
  "road_status": "blocked",
  "urgency": "critical"
}
```

The extracted information must be validated before entering the operational pipeline.

---

# 8. AI/ML Architecture

The intelligence layer will contain specialized components rather than asking one LLM to perform everything.

## 8.1 Incident Intelligence Agent

Responsibilities:

* Parse natural-language reports.
* Extract entities.
* Classify incident type.
* Identify missing information.
* Convert unstructured reports into structured data.

---

# 9. Verification Agent

The Verification Agent handles uncertainty and unreliable information.

It checks:

* duplicate reports
* source reliability
* timestamp freshness
* location consistency
* conflicting reports
* agreement between different evidence sources

Example:

```text
Report A → Hospital flooded
Report B → Hospital flooded
Sensor → Water rising

Result:
High confidence
```

If reports conflict:

```text
Report A → Hospital operational
Report B → Hospital overwhelmed

Result:
Conflict detected
Verification required
```

Original reports should never simply be deleted because they appear duplicated.

---

# 10. Duplicate Detection

Duplicate detection uses multiple signals.

Conceptually:

```text
Duplicate Score =
Semantic Similarity
+ Location Similarity
+ Time Proximity
+ Incident-Type Agreement
+ Entity Overlap
```

The system should flag likely duplicates rather than automatically deleting them.

Frontend:

```text
Possible Duplicate

Report #102
Report #117

Similarity: 92%

[Merge]
[Keep Separate]
[Request Verification]
```

---

# 11. Severity Intelligence

Severity should not be a manually assigned static value.

The system should calculate severity using multiple inputs:

```text
Population affected
Stranded population
Water level
Rainfall
Medical emergencies
Infrastructure damage
Hospital capacity
Shelter capacity
Road accessibility
Duration
Forecast trajectory
```

Output:

```text
Severity Score: 0.88
Level: CRITICAL
Confidence: 91%
```

For the hackathon:

### Primary model

**XGBoost**

### Baseline

Rule-based severity score.

### Advanced benchmark if time permits

FT-Transformer.

The project should compare model performance rather than assuming that a more complicated model is automatically better.

---

# 12. Predictive Intelligence

This is the major addition beyond the friend's original MVP.

The system should forecast future disaster conditions and resource demand when feasible.

Potential forecasts:

* water level
* medical demand
* food demand
* water demand
* shelter demand
* hospital occupancy
* future severity

Concept:

```text
Current State
     ↓
Time-Series Forecast
     ↓
Future State
     ↓
Future Demand
     ↓
Pre-position Resources
```

Example:

```text
CURRENT

Zone C
Severity: HIGH
Hospital: 78%

FORECAST

+1 hour → Hospital 87%
+3 hours → Hospital 96%

ACTION

Pre-position:
2 ambulances
150 medical kits
1 rescue team
```

This changes RESQ from a purely reactive system into a **predictive disaster-response system**.

---

# 13. Needs Assessment Agent

The Needs Assessment Agent determines:

```text
What does each zone need?
How much?
How urgently?
Now and in the near future?
```

Example:

```text
Zone C

Water: 8000 L
Food: 4000 units
Medical: 350 kits
Rescue: 5 teams
Shelter: 300 beds
```

Needs are generated from:

* population
* severity
* stranded population
* medical emergencies
* disaster type
* duration
* forecast
* current resource availability

---

# 14. Resource Agent

The Resource Agent determines:

* which helping points have required resources
* which agencies have required capabilities
* available quantities
* alternative resources
* possible substitutions
* current commitments

Example:

```text
Zone C needs:
5 rescue teams

Available:
NDRF → 3
Fire → 2
NGO → 1

Resource Agent:
Combine NDRF + Fire
```

---

# 15. Optimization Engine

Resource allocation must not depend only on proximity.

RESQ will use **OR-Tools** for constrained allocation.

The agents produce structured requirements.

The optimizer determines the feasible allocation.

### Objective

Maximize:

```text
Priority-weighted demand satisfaction
+
Critical-zone coverage
+
Vulnerable-population coverage
```

Minimize:

```text
Travel cost
+
Unmet demand
+
Wastage
+
Unnecessary reallocations
```

### Constraints

```text
Resource availability
Vehicle capacity
Road accessibility
Agency capability
Facility capacity
Zone requirements
Safety constraints
```

This gives us a defensible answer when judges ask:

> "How do you know this is the best allocation?"

Answer:

> "The agents reason about the situation and generate structured requirements, but final resource allocation is solved by a constrained optimization engine rather than allowing an LLM to invent an allocation."

---

# 16. Fairness-Aware Allocation

Allocation should not depend only on severity.

The system also considers:

* elderly population
* children
* vulnerable groups
* medical emergencies
* population affected

Example:

```text
Zone A
Severity: 0.85
Affected: 5000

Zone B
Severity: 0.80
Affected: 2500
Vulnerable: 900
Medical: 200
```

Zone B may receive higher priority because of vulnerable and medically affected populations.

This introduces **fairness-aware disaster allocation**.

---

# 17. Multi-Agent Architecture

The final system will use a manageable number of meaningful agents.

```text
                 Coordinator Agent
                         │
       ┌─────────────────┼──────────────────┐
       ↓                 ↓                  ↓
Incident Agent    Verification Agent   Prediction Agent
       │                 │                  │
       └─────────────────┼──────────────────┘
                         ↓
                  Severity Agent
                         ↓
                Needs Assessment Agent
                         ↓
                   Resource Agent
                         ↓
                Optimization Engine
                         ↓
                  Safety / Approval
                         ↓
                     Allocation
```

The Coordinator Agent manages the overall workflow and triggers re-planning when the environment changes.

---

# 18. Human-in-the-Loop

RESQ should be described as:

> **Human-supervised autonomous disaster coordination.**

Agents can autonomously:

* analyze
* verify
* predict
* prioritize
* plan
* optimize
* recommend
* replan

But high-impact actions require human approval.

Example:

```text
ACTION REQUIRES APPROVAL

Send:
2 Rescue Teams
2 Ambulances
2400 L Water
180 Medical Kits

Destination:
Zone C

Reason:
Critical severity
+
Medical emergency
+
Road blockage

[APPROVE]
[REJECT]
[MODIFY]
```

This makes the system safer and more realistic.

---

# 19. Dynamic Reallocation

This is one of the central features.

Initial state:

```text
Zone C → HIGH
```

New emergency:

```text
Hospital flooded
Water rising
Road blocked
```

System:

```text
New evidence
    ↓
Verification
    ↓
Severity update
    ↓
Needs update
    ↓
Resource update
    ↓
Optimization
    ↓
New allocation
```

Frontend displays:

```text
REALLOCATION DETECTED

Zone C became CRITICAL.

+2 Rescue Teams
+900 L Water
+150 Medical Kits

Resources redirected from stable Zone A.
```

---

# 20. Reallocation Stability

The system should not constantly move resources because of tiny changes.

Reallocation occurs only when:

```text
Benefit of new allocation
>
Switching cost + threshold
```

This prevents resource thrashing.

This can be implemented even in a simplified form during the hackathon.

---

# 21. Digital Twin

The Digital Twin is the simulated disaster environment.

It represents:

```text
Zones
Roads
Hospitals
Shelters
Warehouses
Resources
Vehicles
Agencies
Population
Weather
Incidents
```

The Digital Twin changes as actions occur.

```text
AI Decision
     ↓
Digital Twin
     ↓
Environment Changes
     ↓
AI Observes New State
     ↓
Forecast
     ↓
Replan
```

This creates a closed-loop simulation.

---

# 22. Simulation Controls

The frontend should provide:

```text
Scenario
Current Time
Rainfall
Water Level
Hospital Capacity
Road Status
Stranded Population
```

Controls:

```text
[PLAY]
[PAUSE]
[+1 HOUR]
[INJECT SOS]
[RESET]
```

This allows judges to directly see the system react.

---

# 23. Frontend — Emergency Command Center

The frontend will be built using:

* React.js
* JSX
* Tailwind CSS
* Leaflet
* OpenStreetMap
* Recharts where required

The UI should look like an **Emergency Operations Center**, not a generic admin dashboard.

---

# 24. Main Frontend Sections

```text
COMMAND CENTER
LIVE MAP
INCIDENTS
RESOURCES
AGENCIES
PREDICTIONS
AI ACTIVITY
ALLOCATIONS
SIMULATOR
AUDIT LOG
```

However, for the 24-hour build, these can be implemented as panels within a small number of major screens rather than ten completely separate pages.

---

# 25. Command Center

Top KPIs:

```text
Critical Zones
Affected Population
Active Incidents
Available Resources
Pending Actions
System Confidence
```

Main area:

```text
LIVE DISASTER MAP
```

Supporting panels:

```text
Incident Feed
Resource Status
AI Activity
Alerts
```

---

# 26. Live Map

Map displays:

### Disaster zones

Circular overlays.

```text
Critical → Red
High → Red/Orange
Moderate → Orange
Low → Yellow/Green
```

### SOS reports

Pulsing red markers.

### Helping points

Markers for:

* NGO
* government
* hospital
* rescue base
* warehouse

### Allocation trajectories

Lines between:

```text
Helping Point
       ↓
Zone / SOS
```

The line represents an allocation trajectory, not necessarily a real road route unless a routing engine is implemented.

---

# 27. Zone Detail

Clicking a zone should show:

```text
Zone C

Population:
12,000

Affected:
7,500

Stranded:
800

Severity:
CRITICAL

Confidence:
91%

Hospital:
92%

Road:
Blocked

Forecast:
Worsening

Current Needs:
Water
Medical
Rescue
```

Also provide:

> **Why was this zone prioritized?**

Example:

```text
Priority increased because:

+ High population affected
+ 180 stranded people
+ Hospital nearing capacity
+ Rising water level
+ Medical emergency reports
```

---

# 28. Incident Screen

Table:

```text
ID
Zone
Type
Severity
Confidence
Status
Time
```

Clicking an incident shows:

* raw report
* extracted information
* evidence
* duplicate candidates
* verification result
* agent decisions

---

# 29. Resource Screen

Show:

```text
Resource
Total
Available
Reserved
In Transit
Used
```

Example:

```text
Water
Total: 20,000 L
Available: 8,500 L
Reserved: 5,000 L
In Transit: 3,000 L
```

Also show which helping point holds each resource.

---

# 30. AI Activity Panel

Show a live timeline:

```text
14:40:01
Incident Agent received SOS

14:40:02
Information extracted

14:40:03
Verification completed

14:40:04
Severity changed:
HIGH → CRITICAL

14:40:05
Needs increased

14:40:06
Optimizer generated new plan

14:40:07
Human approval requested
```

This is how judges visually understand the multi-agent architecture.

---

# 31. Allocation Screen

Show:

```text
Zone × Resource
```

Example:

```text
             Water   Medical   Rescue
Zone A        2000      80        1
Zone B        3000     120        2
Zone C        8000     350        5
```

Also display:

```text
Demand Satisfaction
Critical Coverage
Travel Cost
Unmet Demand
Fairness
```

---

# 32. Audit Log

Every important action is recorded.

Example:

```text
14:40:02
Verification Agent
Report #101 verified

14:40:04
Severity Agent
Zone C → Critical

14:40:06
Optimization Engine
New allocation generated

14:40:08
Coordinator
Approval requested
```

The audit log makes the system transparent and explainable.

---

# 33. Real-Time Architecture

Frontend:

```text
React
   ↑
WebSocket
   ↑
Backend
```

Events:

```text
incident.created
incident.updated
severity.updated
forecast.updated
agent.started
agent.completed
agent.failed
resource.updated
allocation.created
allocation.updated
reallocation.triggered
approval.requested
approval.completed
simulation.tick
```

This makes the dashboard feel genuinely live.

---

# 34. Backend Architecture

Recommended architecture:

```text
React Frontend
      │
      ▼
Node.js Gateway
      │
      ├──────── PostgreSQL
      │
      ├──────── WebSocket
      │
      ▼
Python FastAPI
      │
      ├── ML Models
      ├── Agent Engine
      ├── Forecasting
      ├── Duplicate Detection
      └── Optimization
```

The friend's PRD already establishes this React → Node.js → Python service separation, so it can remain the implementation architecture.

---

# 35. Database Core Tables

Essential tables:

```text
zones
zone_needs
reports
helping_points
resources
resource_inventory
allocations
agencies
facilities
audit_log
simulation_state
```

Important allocation fields:

```text
point_id
zone_id
report_id
resource_id
quantity
target_lat
target_lng
status
hold_reason
```

The nullable `report_id` allows the system to distinguish:

```text
Helping Point → Zone
```

from:

```text
Helping Point → Specific SOS
```

This is already a strong design decision in the friend's PRD.

---

# 36. Technology Stack

## Frontend

```text
React.js
JSX
Tailwind CSS
Leaflet
OpenStreetMap
Recharts
```

## Backend

```text
Node.js
FastAPI
Python
WebSockets
```

## Database

```text
PostgreSQL
```

## AI / ML

```text
scikit-learn
XGBoost
PyTorch
BGE-M3
Chronos-2 / TimesFM 2.5 if feasible
```

## Agents

```text
LangGraph or lightweight state-machine orchestration
```

## Optimization

```text
Google OR-Tools
```

## Deployment

```text
Docker
```

---

# 37. AI Provider Strategy

The LLM should be used for tasks where language reasoning is valuable:

* incident extraction
* explanation generation
* coordination reasoning
* summarization

The LLM should NOT directly control inventory or invent allocations.

Architecture:

```text
LLM
 ↓
Structured JSON
 ↓
Validation
 ↓
Agent Logic
 ↓
Optimizer
 ↓
Feasible Action
```

If a cloud LLM is unavailable, the system should degrade gracefully to rule-based or local components wherever possible.

---

# 38. What We Are NOT Building

To protect the 24-hour deadline, the following are NOT core requirements:

```text
GNN
Reinforcement Learning
Custom Transformer training
Large-model fine-tuning
Satellite imagery pipeline
Full autonomous vehicle routing
Complex real-world IoT deployment
Multiple disaster types with separate models
```

These may be discussed as future extensions but must not block the MVP.

---

# 39. Optional Multimodal Layer

If the core system becomes stable, add image-based evidence.

Example:

```text
User uploads image
       ↓
Vision Model
       ↓
Evidence extraction
       ↓
Verification
       ↓
Severity / Needs pipeline
```

Possible evidence:

```text
Flooded road
People stranded
Vehicle obstruction
Infrastructure damage
Water accumulation
```

The vision model provides **evidence**, not the final operational decision.

---

# 40. Graceful Degradation

RESQ must continue operating if an advanced AI component fails.

Example:

```text
LLM unavailable
     ↓
Rule-based extraction

Forecast unavailable
     ↓
Current-demand allocation

Vision unavailable
     ↓
Text + structured reports

Optimizer unavailable
     ↓
Safe heuristic fallback
```

The core disaster coordination system should never completely depend on one external AI API.

---

# 41. Final End-to-End Flow

The complete system becomes:

```text
                  INCIDENT / SENSOR / SIMULATION
                              │
                              ▼
                    Incident Intelligence
                              │
                              ▼
                         Verification
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
              Severity Model       Forecasting
                    │                   │
                    └─────────┬─────────┘
                              ▼
                     Needs Assessment
                              │
                              ▼
                       Resource Agent
                              │
                              ▼
                       OR-Tools Solver
                              │
                              ▼
                       Safety Validation
                              │
                              ▼
                       Human Approval
                              │
                              ▼
                          Allocation
                              │
                              ▼
                        Digital Twin
                              │
                        State changes
                              │
                              ▼
                         Re-observe
                              │
                              ▼
                           REPLAN
                              │
                              └───────────────🔄
```

---

# 42. Hackathon Demonstration Scenario

Use a deterministic flood scenario with approximately five zones.

### Initial state

```text
Zone A → Moderate
Zone B → High
Zone C → High
Zone D → Low
Zone E → Moderate
```

Resources are distributed across multiple helping points.

The system initially allocates resources.

---

## Event 1 — SOS

Inject:

> "Hospital in Zone C flooded. 40 patients stranded."

System:

```text
Incident detected
       ↓
Report parsed
       ↓
Verified
       ↓
Zone C severity increases
       ↓
Medical demand increases
       ↓
Optimizer reallocates
```

---

## Event 2 — Road blockage

Inject:

```text
Road between Zone C and nearest depot = BLOCKED
```

System identifies the route/resource constraint and selects an alternative helping point.

---

## Event 3 — Water level rises

Simulator:

```text
Water:
2.4m → 3.2m
```

Forecast:

```text
Zone C expected to worsen
```

System pre-positions additional resources.

---

## Event 4 — Resource shortage

Medical inventory becomes insufficient.

Resource Agent identifies alternative available resources/agencies.

System generates a new plan.

---

## Final screen

Show:

```text
Initial Allocation
        ↓
Emergency
        ↓
Agent Reasoning
        ↓
Reallocation
        ↓
Optimized Final Plan
        ↓
Audit Trail
```

This demonstrates the entire PS20 concept in approximately 5 minutes.

---

# 43. Evaluation Metrics

The project should show measurable performance.

## ML

```text
Precision
Recall
F1
ROC-AUC
Calibration
```

## Forecasting

```text
MAE
RMSE
```

## Duplicate Detection

```text
Precision
Recall
F1
```

## Allocation

```text
Demand Satisfaction %
Critical-Zone Coverage
Travel Cost
Unmet Demand
Wastage
Fairness
```

## Agent System

```text
Task Completion
Tool-call validity
Invalid action rate
Latency
```

For the Digital Twin, results should explicitly be described as **simulation results**, not claims about real lives saved.

---

# 44. Final MVP

The project is considered complete when these work end-to-end:

```text
✓ Five disaster zones

✓ Multiple helping points

✓ Multiple resources

✓ Incident reporting

✓ Natural-language incident input

✓ Severity calculation

✓ Needs assessment

✓ Resource inventory

✓ Agent coordination

✓ OR-Tools allocation

✓ Dynamic reallocation

✓ Duplicate detection

✓ Digital Twin

✓ Interactive React map

✓ Real-time updates

✓ Agent activity stream

✓ Human approval

✓ Audit log
```

---

# 45. Advanced Features — Only If Core Is Stable

Add in this order:

```text
1. Demand forecasting
2. Confidence / uncertainty
3. Fairness-aware allocation
4. Resource substitution
5. Image/VLM analysis
```

Do not move to advanced features until the basic end-to-end demo works.

---

# 46. Final Project Identity

### Project Name

**RESQ**

### Full Name

**Predictive Multi-Agent Disaster Relief & Emergency Resource Coordinator**

### One-Line Description

> **RESQ is a human-supervised multi-agent disaster-response Digital Twin that continuously analyzes changing evidence, predicts future needs, optimizes constrained resource allocation, and dynamically replans emergency response.**

### Core Differentiator

Traditional systems:

```text
Detect → Display → Manually Respond
```

RESQ:

```text
Observe
  ↓
Understand
  ↓
Verify
  ↓
Predict
  ↓
Prioritize
  ↓
Optimize
  ↓
Approve
  ↓
Act
  ↓
Simulate
  ↓
Replan
```

---

# 47. What the Team Should Do Now

The scope is now **FROZEN**.

Do not add another major technology unless there is a clear reason.

### Build order

```text
PHASE 1
Database + seed disaster scenario

PHASE 2
Backend APIs

PHASE 3
Basic React Command Center + Map

PHASE 4
Incident creation

PHASE 5
Severity + Needs Assessment

PHASE 6
Resource allocation

PHASE 7
OR-Tools optimization

PHASE 8
Multi-agent workflow

PHASE 9
Dynamic reallocation

PHASE 10
Digital Twin simulator

PHASE 11
WebSocket real-time updates

PHASE 12
Audit + explanations

PHASE 13
Forecasting / uncertainty if time remains

PHASE 14
Full demo testing
```

---

# 48. Final Rule for the 24-Hour Hackathon

The team should follow one principle:

> **A smaller number of fully working intelligent features is better than a large number of half-working AI technologies.**

The winning demonstration should make the judges see:

**"The system understands the disaster, reasons about priorities, makes a constrained decision, explains it, and changes its decision when the world changes."**

That is the heart of RESQ.
