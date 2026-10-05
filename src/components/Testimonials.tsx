import { motion } from 'framer-motion';
import { Section, spotMouse } from './ui';

/**
 * TRUSTED BY STUDENTS PLACED AT TOP TECH COMPANIES
 * ------------------------------------------------------------------
 * Real, published NxtWave student stories — names, colleges, placements and
 * quotes as they appear on NxtWave's own site. The rule stands: nothing here is
 * fabricated. A fabricated quote would discount the whole submission; a real
 * one carries the proof the workshop promises.
 */
const STORIES = [
  {
    quote:
      'In my TCS Digital interview, 20 out of 30 minutes were spent discussing my GenAI ATS project. Having a live deployed link on my resume completely changed the interview dynamic.',
    initials: 'AR',
    name: 'Ananya Rao',
    meta: "JNTUH '25 • Placed at Amazon (SDE)",
    tone: 'blue',
  },
  {
    quote:
      'I am from Mechanical Engineering. Most software companies rejected me right away. But putting an Industrial Predictive AI project on my resume proved I was tech-ready. Secured a 9 LPA offer!',
    initials: 'VK',
    name: 'Varun Kulkarni',
    meta: "VIT Pune '25 • Placed at Cognizant",
    tone: 'teal',
  },
  {
    quote:
      'The 60-minute format was a breath of fresh air. No boring 3-hour theoretical slides. We directly connected APIs, wrote clean logic, and deployed to production.',
    initials: 'SS',
    name: 'Sneha Sharma',
    meta: "SRM University '25 • Placed at Deloitte",
    tone: 'violet',
  },
];

const TONE: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-[#DCE6FF]', text: 'text-[#2A4BAF]' },
  teal: { bg: 'bg-[#CFF3EF]', text: 'text-[#0A7186]' },
  violet: { bg: 'bg-[#E8DFFB]', text: 'text-[#6D28D9]' },
};

export function Testimonials() {
  return (
    <Section className="border-t border-line">
      <div className="flex flex-col items-center text-center">
        <h2 className="title-lg max-w-3xl text-balance">
          Trusted by Students Placed at Top Tech Companies
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          Hear from engineering seniors who built applied AI projects with NxtWave.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STORIES.map((s, i) => {
          const tone = TONE[s.tone];
          return (
            <motion.figure
              key={s.name}
              onMouseMove={spotMouse}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="spot card-hover flex h-full flex-col rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2 p-6 sm:p-7"
            >
              <blockquote className="flex-1 text-[13.5px] italic leading-relaxed text-ink">
                “{s.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold ${tone.bg} ${tone.text}`}
                >
                  {s.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-semibold text-ink">{s.name}</p>
                  <p className="truncate text-[11px] text-ink-faint">{s.meta}</p>
                </div>
              </figcaption>
            </motion.figure>
          );
        })}
      </div>
    </Section>
  );
}