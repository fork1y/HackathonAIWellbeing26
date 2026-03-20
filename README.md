# BalanceAI — AI Schedule Arranger & Burnout Alert

## 👥 Team Members
- **Freeman Yiu** — Integration / Repo Lead / QA
- **Youcheng Taing** — Scheduler / Optimizer
- **Yen Nguyen** — Frontend / UX (Streamlit)
- **Matthew Yeung** — Burnout Detection Engine

---

## 📌 Project Overview
BalanceAI is an AI-powered web application designed to help students manage their schedules while avoiding burnout.

Students can input their:
- Classes
- Work shifts
- Tasks and assignments
- Deadlines
- Estimated task durations

The system analyzes their schedule, detects burnout risk, and intelligently rearranges tasks into a healthier, more balanced plan.

---

## 🎯 Problem Statement
Students often overload their schedules without realizing the long-term impact on their health and productivity.

Current tools (calendars, planners) help organize tasks but:
- Do not detect burnout risk
- Do not provide intelligent scheduling suggestions
- Do not optimize workload distribution

---

## 💡 Our Solution
BalanceAI goes beyond scheduling.

It:
1. **Analyzes workload patterns**
2. **Detects burnout risk**
3. **Explains why the schedule is unhealthy**
4. **Automatically generates a healthier schedule**

---

## 🧠 How AI is Used
We use a hybrid AI approach combining rules, heuristics, and intelligent scheduling:

### 1. Burnout Detection
- Rule-based scoring system
- Factors include:
  - Daily workload
  - Deadline clustering
  - Lack of breaks
  - Late-night work
  - Consecutive heavy days

### 2. Schedule Optimization
- Constraint-based scheduling
- Heuristic optimization
- Respects:
  - Fixed commitments (class/work)
  - Deadlines
  - Sleep windows

### 3. Explainability
- Generates human-readable insights:
  - "You have 3 deadlines within 48 hours"
  - "Thursday exceeds safe workload limits"

---

## 🔄 System Workflow
1. User inputs schedule
2. System builds initial schedule
3. Burnout engine analyzes risk
4. Optimizer rearranges tasks
5. System compares before vs after
6. User sees improvements and insights

---

## ✨ Features

### ✅ Core Features
- Input classes, work shifts, and tasks
- Burnout risk scoring (Low / Medium / High)
- Explanation of risk factors
- AI-based schedule optimization
- Before vs After comparison

### 🚧 Optional / Future Features
- Break recommendations
- Personalized preferences
- Energy-based scheduling
- Export schedule
- Authentication system

---

## 🛠️ Tech Stack

### Frontend
- Streamlit

### Backend
- Python

### Libraries
- Pandas (data handling)
- OR-Tools / custom heuristics (optimization)

### Data Storage
- JSON / in-memory (for hackathon)

---

## 📁 Project Structure
```
balanceai/
├── app.py
├── requirements.txt
├── README.md
│
├── src/
│   ├── burnout/
│   │   ├── scorer.py
│   │   └── explainer.py
│   ├── scheduler/
│   │   ├── optimizer.py
│   │   └── constraints.py
│   ├── integration/
│   │   └── pipeline.py
│   ├── ui/
│   │   ├── forms.py
│   │   └── views.py
│   └── utils/
│       └── validators.py
│
├── data/
│   └── sample_input.json
│
└── tests/
```

---

## 🚀 Getting Started

### 1. Clone the repository
```
git clone https://github.com/your-repo/balanceai.git
cd balanceai
```

### 2. Install dependencies
```
pip install -r requirements.txt
```

### 3. Run the app
```
streamlit run app.py
```

---

## 🧪 Example Use Case

### Input
- 3 classes
- 1 work shift
- 3 assignments (same week)

### Output
- Burnout Risk: **High**
- Reasons:
  - Heavy workload on Thursday
  - Deadlines clustered within 2 days

### After Optimization
- Tasks redistributed across week
- Burnout Risk reduced to **Moderate**

---

## 🏆 Innovation

Unlike traditional planners, BalanceAI:
- Detects burnout **before it happens**
- Automatically **restructures schedules**
- Provides **explainable AI insights**

---

## 🌍 Impact
- Helps students maintain mental health
- Improves productivity and time management
- Scales globally as a lightweight web tool

---

## 📌 Future Improvements
- Machine learning-based personalization
- Mobile app version
- Integration with Google Calendar
- Long-term burnout prediction

---

## 📣 Acknowledgments
Built for AI Hackathon 2026.

---

## 📄 License
MIT License

