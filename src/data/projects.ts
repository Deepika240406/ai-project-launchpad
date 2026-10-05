import type { InterestId, Project } from '../lib/types';

export interface Interest {
  id: InterestId;
  label: string;
  emoji: string;
  blurb: string;
}

export const INTERESTS: Interest[] = [
  { id: 'ai-ml', label: 'AI / ML', emoji: '🧠', blurb: 'Models, prompts, intelligence features' },
  { id: 'web', label: 'Web Development', emoji: '🌐', blurb: 'Interfaces people actually use' },
  { id: 'automation', label: 'Automation', emoji: '⚙️', blurb: 'Kill repetitive work with bots' },
  { id: 'data', label: 'Data Science', emoji: '📊', blurb: 'Turn messy data into decisions' },
  { id: 'security', label: 'Cybersecurity', emoji: '🛡️', blurb: 'Break it, then defend it' },
  { id: 'unsure', label: 'Not Sure Yet', emoji: '🤷', blurb: 'Pick the safest first build' },
];

/**
 * 10 starter projects.
 *
 * Design rule applied to every row: *shippable in 60 minutes by a beginner*.
 * No project needs a GPU, a paid key, or a dataset the student has to find.
 * That constraint is what makes the 500-registration promise credible.
 */
export const PROJECTS: Project[] = [
  {
    id: 'resume-analyzer',
    name: 'AI Resume Analyzer',
    tagline: 'Paste a JD, upload a resume, get a fit score + fixes.',
    description:
      "An AI tool that reads your resume against a job description and tells you exactly what's missing — keywords, impact lines and formatting. You leave with a working app AND a better resume.",
    difficulty: 'Beginner',
    tech: ['Python', 'Streamlit', 'AI API'],
    buildTime: '60 minutes',
    learn: ['AI APIs', 'Prompt engineering', 'Basic frontend', 'Project deployment'],
    interviewLine:
      'I built a tool that scores a resume against a job description and returns structured, actionable feedback.',
    interests: ['ai-ml', 'data', 'web', 'unsure'],
    problems: ['career', 'productivity'],
    experienceFloor: 'Beginner',
    accent: 'from-brand/25 via-brand/10 to-transparent',
    icon: 'FileSearch',
  },
  {
    id: 'interview-coach',
    name: 'AI Interview Coach',
    tagline: 'Answer 5 questions. Get scored feedback like a real interviewer.',
    description:
      'Type or speak answers to common placement questions. The AI scores structure, clarity and specificity, then shows you a stronger version of your own answer. Highest-regret-reduction project for final-year students.',
    difficulty: 'Beginner',
    tech: ['Python', 'Streamlit', 'AI API'],
    buildTime: '60 minutes',
    learn: ['Prompt design', 'Scoring rubrics with AI', 'State in a web app', 'Deployment'],
    interviewLine:
      'My interview coach scores practice answers against a rubric and rewrites weak ones.',
    interests: ['ai-ml', 'web', 'unsure'],
    problems: ['career'],
    experienceFloor: 'Beginner',
    accent: 'from-violet/20 via-violet/10 to-transparent',
    icon: 'MessagesSquare',
  },
  {
    id: 'expense-tracker',
    name: 'Smart Expense Tracker',
    tagline: 'Type "200 for dinner" — it categorises, totals and warns you.',
    description:
      'A natural-language expense logger. You type plain sentences, AI extracts amount + category, and the app charts where your money goes. Great first project because the result is genuinely useful to you.',
    difficulty: 'Beginner',
    tech: ['Python', 'Streamlit', 'AI API', 'Charts'],
    buildTime: '60 minutes',
    learn: ['Structured AI output (JSON)', 'Data handling', 'Charts in a web app', 'Deployment'],
    interviewLine:
      'It converts free-text expense sentences into structured data and visualises spend by category.',
    interests: ['data', 'automation', 'ai-ml', 'unsure'],
    problems: ['money', 'productivity'],
    experienceFloor: 'Beginner',
    accent: 'from-cyan/20 via-cyan/8 to-transparent',
    icon: 'Wallet',
  },
  {
    id: 'study-buddy',
    name: 'AI Study Buddy',
    tagline: 'Upload notes → get summaries, flashcards and a quiz.',
    description:
      'Turn any PDF or pasted notes into a summary, 10 flashcards and a 5-question quiz. Built around the exact loop students already use before exams, so you actually keep using it after the workshop.',
    difficulty: 'Beginner',
    tech: ['Python', 'Streamlit', 'AI API'],
    buildTime: '60 minutes',
    learn: ['Text chunking basics', 'Prompt templates', 'Quiz generation', 'Deployment'],
    interviewLine:
      'It turns raw notes into structured study artefacts — summary, flashcards and a self-test.',
    interests: ['ai-ml', 'data', 'unsure'],
    problems: ['campus'],
    experienceFloor: 'Beginner',
    accent: 'from-brand/20 via-cyan/8 to-transparent',
    icon: 'GraduationCap',
  },
  {
    id: 'campus-assistant',
    name: 'Campus Assistant',
    tagline: 'One chatbot for timetable, fees, faculty and deadlines.',
    description:
      'A RAG-lite chatbot that answers questions from a small set of documents you provide (cirulars, syllabus, timetable). Teaches retrieval, the single most-asked concept in AI interviews right now.',
    difficulty: 'Beginner+',
    tech: ['Python', 'Streamlit', 'AI API', 'Embeddings'],
    buildTime: '60–75 minutes',
    learn: ['Retrieval basics', 'Embeddings intuition', 'Grounded prompting', 'Deployment'],
    interviewLine:
      'A retrieval-augmented assistant that answers strictly from uploaded campus documents.',
    interests: ['ai-ml', 'web', 'unsure'],
    problems: ['campus', 'productivity'],
    experienceFloor: 'Intermediate',
    accent: 'from-violet/18 via-cyan/8 to-transparent',
    icon: 'Building2',
  },
  {
    id: 'content-generator',
    name: 'AI Content Generator',
    tagline: 'One idea → 3 posts, 1 caption and a thumbnail prompt.',
    description:
      'Turn a topic into platform-specific drafts. You build a working multi-output generator and learn re-prompting, tone control and output validation — the same patterns product teams use.',
    difficulty: 'Beginner',
    tech: ['Python', 'Streamlit', 'AI API'],
    buildTime: '60 minutes',
    learn: ['Multi-output prompting', 'Tone control', 'UI states', 'Deployment'],
    interviewLine:
      'A generator that produces platform-specific content variants from a single brief.',
    interests: ['ai-ml', 'web', 'automation'],
    problems: ['content', 'productivity'],
    experienceFloor: 'Beginner',
    accent: 'from-ember/20 via-ember/8 to-transparent',
    icon: 'Sparkles',
  },
  {
    id: 'notes-generator',
    name: 'AI Notes Generator',
    tagline: 'Paste a lecture transcript → clean, exam-ready notes.',
    description:
      "Paste a YouTube transcript or messy lecture notes and get structured, exam-ready output with headings, definitions and a 'remember this' box.",
    difficulty: 'Beginner',
    tech: ['Python', 'Streamlit', 'AI API'],
    buildTime: '60 minutes',
    learn: ['Summarisation prompts', 'Output formatting', 'Copy/download UX', 'Deployment'],
    interviewLine: 'It converts unstructured transcripts into a defined note schema.',
    interests: ['ai-ml', 'automation', 'unsure'],
    problems: ['campus', 'productivity'],
    experienceFloor: 'Beginner',
    accent: 'from-cyan/15 via-brand/10 to-transparent',
    icon: 'NotebookPen',
  },
  {
    id: 'attendance-system',
    name: 'Smart Attendance System',
    tagline: 'Face-based attendance with a live dashboard.',
    description:
      'A camera-based attendance logger with a live percentage dashboard and low-attendance alerts. The project every final-year student recognises — but actually finished.',
    difficulty: 'Intermediate',
    tech: ['Python', 'OpenCV', 'Streamlit', 'CSV/SQLite'],
    buildTime: '60–90 minutes',
    learn: ['Computer vision basics', 'Data persistence', 'Dashboard building', 'Deployment'],
    interviewLine:
      'A computer-vision attendance system that logs entries and surfaces attendance risk in a dashboard.',
    interests: ['ai-ml', 'data', 'security'],
    problems: ['campus'],
    experienceFloor: 'Intermediate',
    accent: 'from-brand/20 via-violet/10 to-transparent',
    icon: 'ScanFace',
  },
  {
    id: 'job-copilot',
    name: 'AI Job Application Copilot',
    tagline: 'Paste a JD → get a tailored cover letter + skill gap list.',
    description:
      'The networking project. It reads a job description, drafts a tailored cover letter from your profile and lists the skills you are missing — so you leave with a tool you use weekly.',
    difficulty: 'Beginner',
    tech: ['Python', 'Streamlit', 'AI API'],
    buildTime: '60 minutes',
    learn: ['Few-shot prompting', 'Profile templating', 'Gap analysis logic', 'Deployment'],
    interviewLine:
      'It generates role-specific application material and a prioritised skill-gap report.',
    interests: ['ai-ml', 'automation', 'web', 'unsure'],
    problems: ['career'],
    experienceFloor: 'Beginner',
    accent: 'from-violet/20 via-brand/10 to-transparent',
    icon: 'Briefcase',
  },
  {
    id: 'phishing-detector',
    name: 'AI Phishing Detector',
    tagline: 'Paste an email or URL → get a risk verdict with reasons.',
    description:
      'A security-flavoured starter project: paste a suspicious message and get a risk verdict plus the exact signals that triggered it. Great for students targeting security internships.',
    difficulty: 'Beginner',
    tech: ['Python', 'Streamlit', 'AI API'],
    buildTime: '60 minutes',
    learn: ['Classification framing', 'Explainable output', 'Security heuristics', 'Deployment'],
    interviewLine:
      'A classifier that flags phishing signals and explains each one, rather than just scoring.',
    interests: ['security', 'ai-ml', 'automation'],
    problems: ['productivity'],
    experienceFloor: 'Beginner',
    accent: 'from-ember/20 via-violet/10 to-transparent',
    icon: 'ShieldAlert',
  },
];

export const projectById = (id: string): Project | undefined =>
  PROJECTS.find((p) => p.id === id);

export const INTEREST_LABEL: Record<InterestId, string> = INTERESTS.reduce(
  (acc, i) => ({ ...acc, [i.id]: i.label }),
  {} as Record<InterestId, string>,
);
