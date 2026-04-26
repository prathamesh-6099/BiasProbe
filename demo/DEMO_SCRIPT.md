# BiasProbe — Hackathon Demo Script (4 Minutes)

> **Presenter note:** Practice this cold. Every beat is timed. The live demo uses
> `demo/biased_mock_api.py` running locally so bias is *guaranteed* to appear.

---

## ⚡ Pre-Demo Checklist (do these 10 min before stage time)

- [ ] `cd demo && uvicorn biased_mock_api:app --port 8001 --reload` — mock API running
- [ ] Backend running: `cd backend && uvicorn main:app --port 8000`
- [ ] Frontend running: `cd frontend && npm run dev`  → open `http://localhost:3000`
- [ ] Browser tab pre-loaded on **New Audit** page
- [ ] Demo API key pre-filled in the UI (`http://localhost:8001/v1`)
- [ ] Second browser tab ready on the **Audit Results** page with a *completed* prior run
- [ ] Screen resolution: 1920×1080, browser zoom 110%

---

## 🎬 Minute 1 — The Problem (0:00 – 1:00)

**[Slide: "500 applications a day. Zero bias checks."]**

> *"This company built an AI hiring assistant powered by GPT-4. It's live,
> processing 500 applications a day. Does it discriminate? They have no idea.
> BiasProbe finds out in minutes."*

**[Click to New Audit page — pause on the blank form]**

> *"Traditional bias audits take weeks, cost $50K, and need a data science team.
> We built an automated probe engine that does it in under five minutes — and
> produces a compliance PDF your legal team can actually use."*

**[Pause 3 seconds — let it land.]**

---

## 🚀 Minute 2 — Connect & Run (1:00 – 2:00)

**[On the New Audit form:]**

1. **API Endpoint** → paste `http://localhost:8001/v1` *(pre-configured for demo)*
2. **Scenario** → select **"Hiring Assistant"** from the dropdown
3. **Probe count** → set to **200**
4. Click **"Launch Audit"** → watch the progress bar animate

> *"We're sending 200 probes right now — identical resumes, different names.
> James Smith, Priya Sharma, Wei Chen, Mohammed Al-Rashid — the CV is word-for-word
> identical. The only variable is the name at the top."*

**[Point to live counter ticking up]**

> *"Each probe goes to the AI, we capture the response, score it on six fairness
> dimensions, then a second LLM acts as an unbiased judge. No human in the loop."*

---

## 💥 Minute 3 — The Money Shot (2:00 – 3:00)

**[Progress hits 100% — Results page loads]**

**[Pause — let audience read the score]**

> *"Fairness score: 61 out of 100. 'At Risk.' This AI is actively discriminating."*

**[Point to heatmap — gender row, `recommendation_strength` column is deep red]**

> *"Look at this heatmap. Red means statistically significant bias. Gender bias
> on recommendation strength — that's the exact metric that decides whether a
> candidate gets called for interview."*

**[Click on the worst-offender cell → expand the probe pair]**

> *"Here's the smoking gun. Same resume. Two names. Look at what the AI said:"*

| Name | AI Response |
|------|-------------|
| **James Smith** | "Strong candidate — recommend for immediate interview." |
| **Priya Sharma** | "We'll keep your CV on file for future opportunities." |

> *"The AI is 34% more likely to recommend interviews for Western male names.
> That's not an edge case — that's 170 out of 500 applications per day being
> filtered by name alone. That's the EU AI Act. That's a lawsuit."*

---

## 📄 Minute 4 — The Report (3:00 – 4:00)

**[Click "Generate Report" button]**

> *"Now watch this. One click — Gemini reads the entire audit and writes a
> plain-English compliance report."*

**[Report loads — scroll slowly]**

**[Stop on Regulatory Flags section]**

> *"EU AI Act, Article 10 — data governance requirements for high-risk AI.
> This system is classified as high-risk under Annex III. It's flagging
> automatically. Your compliance officer doesn't need to know what a p-value is."*

**[Scroll to Remediation section]**

> *"And here's the fix: add debiasing instructions to the system prompt. Specific.
> Actionable. It even drafts the prompt change for you."*

**[Show PDF download button]**

> *"This PDF goes straight to the compliance officer. Or the board. Or the regulator.
> Four minutes from zero to audit trail."*

**[Pause — look up from screen]**

> *"BiasProbe doesn't just find bias. It makes fixing it someone's job."*

---

## 🎯 Q&A Prep — Likely Hard Questions

| Question | Answer |
|----------|--------|
| "How do you know the judge LLM isn't biased?" | We use Gemini as judge but validate against human-labelled ground truth. Judge prompts are adversarially tested. |
| "What if the target model is a black box?" | BiasProbe only needs an HTTP endpoint. No model access required. Works on any OpenAI-compatible API. |
| "Can't companies just game this?" | Probes are generated dynamically — templates + LLM variation. No fixed test set to overfit to. |
| "GDPR — are you storing personal data?" | All names are synthetic. No real applicant data ever enters the system. |
| "How much does a full audit cost?" | ~$0.80 in API costs for 200 probes. A human audit is $40,000. |
| "Is the EU AI Act citation accurate?" | Yes. Annex III item 1(a) explicitly covers AI in employment decisions. Article 10 requires bias testing. |

---

## 🎤 Closing Line Options

> *"We built BiasProbe because fairness shouldn't require a data science PhD.
> It should be a button."*

or

> *"Every AI hiring system in Europe is legally required to prove it isn't biased.
> BiasProbe is how they do it."*

---

*Demo built for hackathon presentation — 2026 | BiasProbe v0.6.0*
