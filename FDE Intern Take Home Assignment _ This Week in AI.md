# **Build an AI Editorial Workspace**

**Role:** Forward Deployed Engineer Intern  
**Deliverables:** Working application, source code, product note, and a sample editorial output

## **1\. The context**

At This Week in AI, we help founders, builders, and business operators understand what's happening in AI and, more importantly, why it matters.

Our editorial team consumes articles, product announcements, research papers, and industry discussions every week. But finding information is only half the job. We need to identify meaningful stories, separate facts from speculation, and turn complex developments into clear, useful writing.

We want to build tools that make this workflow faster without compromising editorial quality.

As a Forward Deployed Engineer, you'll be expected to understand the problem, make product decisions, build a working solution, and communicate your thinking clearly.

## **2\. Your mission**

Build a lightweight **AI Editorial Workspace** that helps a newsletter editor go from raw information to a polished, readable draft.

The workspace should have two core capabilities:

1. **Research Assistant:** Turn a collection of articles into an evidence-backed research brief.  
2. **Writing Assistant:** Help a writer improve the clarity, readability, and quality of a draft.

You decide how these capabilities should work together. You do not need to build a complete publishing platform.

We care more about the quality of your decisions and execution than the number of features you ship.

## **3\. Part A: Build the Research Assistant**

Create a workflow that accepts at least three articles or source URLs and produces a useful research brief.

The brief should help an editor answer:

* What happened?  
* Why does it matter?  
* Who should care?  
* What is the evidence supporting the claims?  
* Is there an interesting story, practical implication, or opportunity worth exploring?

### **Requirements**

* Accept articles, tweets or URLs as input.  
* Generate concise, structured summaries.  
* Identify why each development matters to founders, builders, or business operators.  
* Include links to original sources.  
* Distinguish verifiable facts from analysis or speculation.  
* Suggest at least one potential newsletter angle.

You may choose the input method, interface, model, and architecture.

**The goal isn't to summarize articles. It's to help an editor discover a story worth telling.**

## **4\. Part B: Build the Writing Assistant**

Build a lightweight editor inspired by tools such as [Hemingway Editor](https://hemingwayapp.com/).

A writer should be able to paste a draft, receive actionable feedback, and improve it without losing their intended meaning.

### **Requirements**

**1\. Analyze the draft**

Implement at least three writing-quality checks. Examples include:

* Long or difficult-to-follow sentences.  
* Unnecessary jargon or unexplained technical terms.  
* Passive voice.  
* Filler phrases and unnecessary words.  
* Paragraphs that are difficult to understand.  
* Repetitive or unnecessarily complex phrasing.

You may implement these checks using deterministic rules, an LLM, or a combination of both.

**2\. Provide actionable feedback**

For each issue identified:

* Show the relevant sentence or passage.  
* Explain what could be improved and why.  
* Offer a suggested rewrite where appropriate.

**3\. Keep the writer in control**

* Let the writer accept or reject a suggestion.  
* Preserve the original draft until changes are accepted.  
* Make it possible to compare the original and revised text.

**4\. Show useful writing metrics**

Display a small set of relevant metrics, such as word count, average sentence length, reading time, or a readability score.

Explain what these metrics indicate. Do not treat a readability score as a definitive measure of writing quality.

### **The editorial principle**

Clear writing does not mean making every sentence short or removing every technical term.

A good writing assistant should preserve factual accuracy, technical nuance, and the author's intended meaning. It should help writers make better decisions, not blindly optimize a score.

## **5\. Part C: Produce a sample editorial output**

Use your application to produce a short newsletter-style piece based on the sources you researched.

Your piece should include:

* A compelling headline.  
* A clear explanation of what happened.  
* Enough context for a reader who doesn't follow every AI development.  
* Your analysis of why the development matters.  
* A practical implication, question, or opportunity for the reader.  
* Links to the sources supporting your claims.

Aim for approximately 300–500 words.

Run your draft through your Writing Assistant and show how its feedback changes the final piece.

We will evaluate both the quality of the writing and the quality of the edits. A grammatically polished but generic summary is not the goal.

## **6\. Part D: Explain your decisions**

Submit a short product and engineering note covering the following.

### **Product thinking**

* Who is the primary user?  
* What is the most important problem you chose to solve?  
* What is the core workflow?  
* Which features did you prioritize, and which did you deliberately leave out?  
* How would you measure whether the product is useful?

### **Engineering**

* How is the application structured?  
* Which parts use AI, and which use deterministic logic?  
* How do you handle inaccessible URLs, missing content, unreliable outputs, and failed requests?  
* How do you ensure source links support the claims being made?  
* What would you improve with another day of work?

### **Editorial judgment**

* What makes a piece of writing clear and useful?  
* How would you evaluate whether your Writing Assistant genuinely improves a draft?  
* What kinds of writing changes should the tool avoid making automatically?

You do not need a lengthy document. Concise, well-reasoned answers are preferred.

## **7\. Deliverables**

Please submit:

1. **Working application:** A deployed URL or a reproducible local setup.  
2. **Source code:** A repository with a clear README.  
3. **Product and engineering note:** Your assumptions, decisions, and trade-offs.  
4. **Sample editorial output:** Your final 300–500-word piece, with source links.  
5. **Before-and-after example:** The original draft, the Writing Assistant's feedback, and the revised version.

Include setup instructions and any required environment variables. Do not commit API keys or other secrets.

You may use AI coding assistants, LLM APIs, open-source libraries, and other tools. Please disclose which tools you used and what you personally implemented, tested, and verified.

## **8\. Constraints**

* Do not aim for production readiness.  
* A simple, functional interface is sufficient.  
* You may use mock data for nonessential integrations, but the core workflow should work end to end.  
* Make reasonable assumptions where requirements are ambiguous and document them.  
* If you cannot finish everything, prioritize the most valuable workflow and explain what remains incomplete.

## **9\. What we're looking for**

There is no single correct solution.

We're looking for someone who can move between understanding a user's problem, making product decisions, building software, and communicating ideas clearly.

A small tool that solves a real problem exceptionally well will be more impressive than a large collection of disconnected features.

## **10\. Submissions**

You can share your submissions directly at [hardeep@thisweekinai.club](mailto:hardeep@thisweekinai.club)

In your submission, please add the following:

- Solution Live Link  
- Github Link  
- A Readme (in Github) that walks us through your submission and shares what product decisions you took and why.