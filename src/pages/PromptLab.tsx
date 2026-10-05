import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ClipboardCopy, FlaskConical, Terminal, Wand2 } from 'lucide-react';
import { CtaBand, NextSteps, PageHero, PageShell } from '../components/PageShell';
import { Button, Card, NoteTag, Section, SectionHeading, useCopy } from '../components/ui';
import { BUILD_STAGES } from '../lib/buildStages';
import { PROJECTS, projectById } from '../data/projects';
import { useApp } from '../store/AppStore';
import { useRegistration } from '../components/RegistrationProvider';
import { cn } from '../lib/utils';
import { track } from '../lib/analytics';

/**
 * PROMPT LAB  (/prompt-lab)
 * ---------------------------------------------------------------------------
 * The gap between "I have an idea" and "I have working code" is usually one
 * thing: not knowing how to ask. This builds the prompt a student pastes into
 * their AI tool of choice — role, task, output contract, constraints, guardrails
 * — and shows *why* each block exists, so they learn the pattern rather than
 * copy a magic string.
 *
 * Entirely client-side and deterministic. No API key, no cost, works offline.
 */

const OUTPUTS = [
  { id: 'code', label: 'Working code (single file)', hint: 'Best when you want to run something immediately.' },
  { id: 'plan', label: 'Step-by-step build plan', hint: 'Best when the project feels too big to start.' },
  { id: 'debug', label: 'Debug an error I am hitting', hint: 'Paste the traceback below and paste this into your AI tool.' },
] as const;

type OutputId = (typeof OUTPUTS)[number]['id'];

const TOOLS = ['ChatGPT', 'Claude', 'Gemini', 'Copilot', 'Any AI tool'] as const;

export function PromptLab() {
  const { savedIdeaId, quiz, student, showToast } = useApp();
  const { openRegistration } = useRegistration();

  const defaultId = savedIdeaId ?? student?.recommendedProjectId ?? PROJECTS[0].id;
  const [projectId, setProjectId] = useState(defaultId);
  const [output, setOutput] = useState<OutputId>('code');
  const [tool, setTool] = useState<(typeof TOOLS)[number]>('ChatGPT');
  const [audience, setAudience] = useState<'self' | 'interviewer'>('self');
  const [errorText, setErrorText] = useState('');
  const { copied, copy } = useCopy();

  const project = projectById(projectId) ?? PROJECTS[0];
  const band = quiz ? quiz.band : null;

  const prompt = useMemo(() => {
    const lines: string[] = [];

    lines.push(`ROLE`);
    lines.push(
      `You are a senior engineer mentoring a final-year engineering student in India who has ${
        band === 'strong' ? 'solid basics' : band === 'ready' ? 'basic Python skills' : 'almost no coding experience'
      }.`,
    );
    lines.push('');
    lines.push(`TASK`);
    if (output === 'code') {
      lines.push(
        `Build a working first version of "${project.name}" — ${project.tagline} — as a single runnable Python file using ${project.tech.join(', ')}.`,
      );
    } else if (output === 'plan') {
      lines.push(
        `Give me a step-by-step build plan for "${project.name}" — ${project.tagline} — that a beginner can finish in 60 minutes, using ${project.tech.join(', ')}.`,
      );
    } else {
      lines.push(`Help me debug ${project.name}, which I am building with ${project.tech.join(', ')}.`);
    }
    lines.push('');
    lines.push(`OUTPUT CONTRACT`);
    if (output === 'code') {
      lines.push('- One file I can save as app.py and run directly.');
      lines.push('- The AI call must return strict JSON: { "summary": string, "score": number, "fixes": string[] }.');
      lines.push('- Show the UI with a plain text input and a submit button. No styling libraries.');
    } else if (output === 'plan') {
      lines.push('- Exactly 6 steps, in order, each with: what to build, ~how many minutes, and how I know it works.');
      lines.push('- End with the single most likely thing that will break, and the fix.');
    } else {
      lines.push('- The most likely cause, ranked 1–3.');
      lines.push('- The exact line to change, and the corrected version.');
      lines.push('- One smaller step I can take if the fix does not work.');
    }
    lines.push('');
    lines.push(`CONSTRAINTS`);
    lines.push('- Assume zero prior AI experience. Explain anything non-obvious in one short comment.');
    lines.push('- Use only free tools and a free tiers. No paid API, no GPU, no Docker.');
    lines.push('- Keep it under ~120 lines. If it needs more, cut features rather than adding files.');
    lines.push('- Do not invent environment variables I have not defined.');
    lines.push('');
    lines.push(`GUARDRAILS`);
    lines.push(
      `- If anything in this request is ambiguous or too large for 60 minutes, say so and propose a smaller version before writing code.`,
    );
    lines.push(`- Flag any claim you are not confident about instead of guessing silently.`);
    if (output === 'debug' && errorText.trim()) {
      lines.push('');
      lines.push(`MY ERROR`);
      lines.push('```');
      lines.push(errorText.trim().slice(0, 1200));
      lines.push('```');
    }
    if (audience === 'interviewer') {
      lines.push('');
      lines.push(`ALSO`);
      lines.push(
        `End with 3 interview questions a placement panel could ask about this project, and a one-line answer for each.`,
      );
    }
    lines.push('');
    lines.push(`Before you start, ask me up to 3 clarifying questions if you need them. Then build.`);
    return lines.join('\n');
  }, [project, output, band, audience, errorText]);

  const blocks = [
    { label: 'Role', why: 'Frames the level of explanation you get. Without it, AI writes for other AI engineers.' },
    { label: 'Task', why: 'One project, one file, one outcome. Vague tasks produce files you cannot run.' },
    { label: 'Output contract', why: 'The contract is what makes the result usable instead of "here is some code".' },
    { label: 'Constraints', why: 'Budget, length and tool limits. This is the block students skip and regret.' },
    { label: 'Guardrails', why: 'Gives the model permission to push back — that is where the useful honesty comes from.' },
  ];

  return (
    <PageShell>
      <PageHero
        eyebrow={
          <>
            <FlaskConical className="h-3 w-3 text-brand-deep" />
            Prompt lab
          </>
        }
        title={
          <>
            The build prompt
            <br />
            <span className="text-ink-muted">you should have started with.</span>
          </>
        }
        subtitle="Most students get stuck because they ask for “an AI project” and receive 400 lines they cannot run. Pick your project, and this writes a prompt with a role, a task, an output contract, constraints and guardrails — then shows you why each block is there."
      />

      <Section className="pt-4">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-8">
          {/* ------------------------------------------------------- controls */}
          <div className="space-y-4">
            <Card className="p-5 sm:p-6">
              <p className="mono-label">Project</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {PROJECTS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProjectId(p.id);
                      track('project_selected', { projectId: p.id, source: 'prompt_lab' });
                    }}
                    aria-pressed={p.id === projectId}
                    className={cn(
                      'truncate rounded-xl border px-3 py-2.5 text-left text-[12px] font-semibold transition',
                      p.id === projectId
                        ? 'border-brand-deep/40 bg-brand/[0.14] text-ink'
                        : 'border-line bg-surface-2 text-ink-muted hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="mono-label">What do you want back?</p>
              <div className="mt-4 space-y-2">
                {OUTPUTS.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setOutput(o.id)}
                    aria-pressed={output === o.id}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition',
                      output === o.id
                        ? 'border-brand-deep/40 bg-brand/[0.14]'
                        : 'border-line bg-surface-2 hover:border-line-strong',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border',
                        output === o.id ? 'border-brand-deep bg-brand-deep' : 'border-line-strong',
                      )}
                    >
                      {output === o.id ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} /> : null}
                    </span>
                    <span>
                      <span className="block text-[12.5px] font-semibold text-ink">{o.label}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-muted">{o.hint}</span>
                    </span>
                  </button>
                ))}
              </div>

              {output === 'debug' ? (
                <div className="mt-4">
                  <label htmlFor="err" className="mono-label block">
                    Paste your error
                  </label>
                  <textarea
                    id="err"
                    value={errorText}
                    onChange={(e) => setErrorText(e.target.value)}
                    rows={4}
                    placeholder={'Traceback (most recent call last):\n  File "app.py", line 14 …'}
                    className="field mt-2.5 resize-none font-mono text-[11px]"
                  />
                </div>
              ) : null}
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="mono-label">Options</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-[12px] font-medium text-ink-muted">Which tool will you paste this into?</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {TOOLS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTool(t)}
                        aria-pressed={tool === t}
                        className={cn(
                          'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                          tool === t
                            ? 'border-brand-deep/40 bg-brand/[0.16] text-ink'
                            : 'border-line bg-surface-2 text-ink-faint hover:border-line-strong',
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-ink-faint">
                    The prompt is written to work in any of them — {tool} is just for your clipboard label.
                  </p>
                </div>

                <div>
                  <p className="text-[12px] font-medium text-ink-muted">Extra</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'self' as const, label: 'Just build it' },
                        { id: 'interviewer' as const, label: 'Also prep me for interview questions' },
                      ] as const
                    ).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setAudience(a.id)}
                        aria-pressed={audience === a.id}
                        className={cn(
                          'rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition',
                          audience === a.id
                            ? 'border-violet/30 bg-violet/10 text-violet'
                            : 'border-line bg-surface-2 text-ink-faint hover:border-line-strong',
                        )}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ---------------------------------------------------------- output */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
                <span className="inline-flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-brand-deep" />
                  <span className="mono-label">Your prompt</span>
                </span>
                <span className="font-mono text-[10px] text-ink-faint">
                  {prompt.length} chars · for {tool}
                </span>
              </div>

              <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap bg-surface-2 p-4 font-mono text-[11.5px] leading-relaxed text-ink-muted">
                {prompt}
              </pre>

              <div className="flex flex-wrap gap-2.5 border-t border-line p-4">
                <Button
                  className="flex-1"
                  onClick={async () => {
                    const ok = await copy(prompt);
                    if (ok) {
                      track('referral_link_copied', { kind: 'prompt', projectId: project.id });
                      showToast({
                        title: 'Prompt copied',
                        description: `Paste it into ${tool} and answer its questions.`,
                        variant: 'success',
                      });
                    }
                  }}
                  aria-live="polite"
                >
                  {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  {copied ? 'Copied to clipboard' : 'Copy prompt'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    const blob = new Blob([prompt], { type: 'text/plain' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${project.id}-build-prompt.txt`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                >
                  Download .txt
                </Button>
              </div>
            </Card>

            <Card className="p-5">
              <p className="mono-label flex items-center gap-2">
                <Wand2 className="h-3.5 w-3.5 text-violet" />
                Why these five blocks
              </p>
              <ul className="mt-4 space-y-3">
                {blocks.map((b) => (
                  <li key={b.label}>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-brand-deep">
                      {b.label}
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">{b.why}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-muted">
                Learn this pattern once and it works for every project you build after this workshop. That is
                the part that transfers.
              </p>
            </Card>

            <Card className="p-5">
              <p className="mono-label">Where this fits the 60 minutes</p>
              <ol className="mt-4 space-y-2.5">
                {BUILD_STAGES.map((s, i) => (
                  <li key={s.id} className="flex items-start gap-3">
                    <span
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-md border font-mono text-[10px] font-bold',
                        s.id === 'prompt'
                          ? 'border-brand-deep/40 bg-brand/[0.16] text-brand-deep'
                          : 'border-line bg-surface-2 text-ink-faint',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        'pt-0.5 text-[12px]',
                        s.id === 'prompt' ? 'font-semibold text-ink' : 'text-ink-muted',
                      )}
                    >
                      {s.label}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>

            <div className="flex flex-wrap items-center gap-3">
              <NoteTag label="Runs entirely in your browser" />
              <p className="text-[11px] leading-relaxed text-ink-faint">
                No API key, no request. Generate, copy, paste.
              </p>
            </div>

            <Button
              variant="ink"
              className="w-full"
              onClick={() => openRegistration({ projectId: project.id, source: 'prompt_lab' })}
            >
              Reserve my seat for {project.name}
            </Button>
          </div>
        </div>
      </Section>

      <Section className="border-t border-line pt-12">
        <SectionHeading eyebrow="More tools" title="Finish the loop." />
        <NextSteps
          className="mt-8"
          items={[
            { label: 'Idea Vault', detail: 'Store the idea and run the six-stage checklist as you build.', to: '/vault' },
            { label: 'Card Studio', detail: 'Show what you are building — card, QR code, one tap to share.', to: '/card' },
            { label: 'Readiness check', detail: 'Havent scored yourself yet? Five questions, two minutes.', to: '/quiz' },
          ]}
        />
      </Section>

      <CtaBand
        source="prompt_lab_final"
        title="Now do it with a deadline."
        body="A prompt gets you started. An hour with someone walking the same workflow gets you finished — and ships something that exists on the internet."
        secondary={{ label: 'See the 60-minute run of show', to: '/workshop' }}
      />
    </PageShell>
  );
}
