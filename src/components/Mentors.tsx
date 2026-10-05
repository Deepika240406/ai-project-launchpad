import { motion } from 'framer-motion';
import { GraduationCap, ShieldCheck, Sparkles } from 'lucide-react';
import { Section } from './ui';
import { spotMouse } from './ui';

/**
 * WORLD-CLASS MENTORSHIP
 * ------------------------------------------------------------------
 * The people who actually run NxtWave — real roles, real credentials. Trust
 * transfers: a student on the fence decides faster when they know who is
 * teaching and what those people have shipped.
 */
const MENTORS = [
  {
    tag: 'Lead Instructor',
    name: 'Rahul Attuluri',
    role: 'CEO & Co-Founder, NxtWave',
    creds: 'Alumnus of IIT Hyderabad • Ex-Amazon',
    bio: 'Trained and mentored 200,000+ college students across India in modern full-stack and Applied AI technologies.',
    initials: 'RA',
  },
  {
    tag: 'Curriculum Architect',
    name: 'Sashank Reddy Gujjula',
    role: 'Head of AI & Curriculum, NxtWave',
    creds: 'Alumnus of IIT Bombay • Ex-Software Architect',
    bio: 'Engineered scalable GenAI pipelines and production LLM integrations. Pioneer of the 4.0 hands-on learning methodology.',
    initials: 'SR',
  },
  {
    tag: 'Placement Advisor',
    name: 'Avinash Dara',
    role: 'Senior Director of Tech Placements',
    creds: 'Alumnus of IIT Madras • Ex-Industry Placement Lead',
    bio: 'Partnered with 1,500+ tech hiring companies to understand exactly what recruiters test in technical interviews.',
    initials: 'AD',
  },
];

export function Mentors() {
  return (
    <Section className="border-t border-line">
      <div className="flex flex-col items-center text-center">
        <span className="eyebrow">
          <GraduationCap className="h-3 w-3 text-brand-deep" />
          World-Class Mentorship
        </span>
        <h2 className="title-lg mt-4 max-w-3xl text-balance">
          Learn Directly From{' '}
          <span className="bg-gradient-to-r from-brand-deep to-violet bg-clip-text text-transparent">
            IIT Alumni &amp; Ex-Amazon Engineers
          </span>
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-muted">
          You are not learning from generic tutorial creators. You are learning from industry architects
          who know what hiring managers look for in final-year placement interviews.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MENTORS.map((m, i) => (
          <motion.div
            key={m.name}
            onMouseMove={spotMouse}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: i * 0.08 }}
            className="spot card-hover flex h-full flex-col rounded-2xl border border-line bg-card p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-deep">
                {m.tag}
              </span>
              <ShieldCheck className="h-4 w-4 text-chart-green" aria-hidden />
            </div>

            <div className="mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-deep to-violet text-lg font-bold text-white">
              {m.initials}
            </div>

            <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-ink">{m.name}</h3>
            <p className="mt-1 text-[12.5px] font-semibold text-brand-deep">{m.role}</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">{m.creds}</p>
            <p className="mt-3.5 text-[13px] leading-relaxed text-ink-muted">{m.bio}</p>

            <p className="mt-4 flex items-center gap-2 border-t border-line pt-3.5 text-[11.5px] font-medium text-ink-muted">
              <Sparkles className="h-3.5 w-3.5 text-brand-deep" aria-hidden />
              Live Interactive Q&amp;A in Session
            </p>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
