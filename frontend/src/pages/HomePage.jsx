import { Link } from 'react-router-dom';
import { m as motion } from 'motion/react';
import Icon from '../components/Icon.jsx';
const steps = [
  [
    'profile',
    'Make it yours',
    'Build your student profile and keep your academic journey up to date.',
  ],
  [
    'drives',
    'Find your opportunity',
    'Explore companies, check eligibility, and discover your next placement drive.',
  ],
  [
    'applications',
    'Follow your progress',
    'Apply with confidence and track every update, from application to selection.',
  ],
];
export default function HomePage() {
  return (
    <>
      <section className="landing-hero">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="hero-kicker">
            <span className="status-dot" />
            VIT PUNE · TRAINING & PLACEMENT
          </p>
          <h1>
            A brighter future.
            <br />
            <span>Built from here.</span>
          </h1>
          <p className="hero-description">
            Your talent. The right opportunity. One connected campus.
            <br className="hidden sm:block" /> A simpler way to take your next
            big step.
          </p>
          <div className="hero-actions">
            <Link
              className="button button-primary button-large"
              to="/student/dashboard"
            >
              Student workspace <Icon name="arrow" size={18} />
            </Link>
            <Link className="hero-secondary" to="/admin/dashboard">
              Admin workspace <Icon name="arrow" size={17} />
            </Link>
          </div>
          <p className="hero-footnote">
            <Icon name="shield" size={16} />
            Your college. Your opportunities. Your journey.
          </p>
        </motion.div>
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5 }}
        >
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="preview-card">
            <div className="preview-top">
              <span className="icon-tile">
                <Icon name="graduation" size={22} />
              </span>
              <span>YOUR NEXT CHAPTER</span>
              <span className="preview-dots">•••</span>
            </div>
            <h2>Possibility looks good on you.</h2>
            <p>Every great career starts with a first step.</p>
            <div className="preview-journey">
              {[
                'Build your profile',
                'Discover opportunities',
                'Make your move',
              ].map((label, i) => (
                <div key={label}>
                  <span
                    className={
                      i === 0 ? 'journey-node complete' : 'journey-node'
                    }
                  >
                    {i === 0 ? <Icon name="check" size={15} /> : `0${i + 1}`}
                  </span>
                  <span>{label}</span>
                  <span className="journey-line" />
                </div>
              ))}
            </div>
            <Link className="preview-bottom" to="/register">
              Start your placement journey <Icon name="arrow" size={18} />
            </Link>
          </div>
          <div className="floating-label floating-label-top">
            <span className="mini-icon">
              <Icon name="spark" size={18} />
            </span>
            <div>
              <strong>Made for your potential</strong>
              <small>Opportunity, all in one place.</small>
            </div>
          </div>
          <div className="floating-label floating-label-bottom">
            <span className="mini-icon mint">
              <Icon name="check" size={18} />
            </span>
            <div>
              <strong>One step closer</strong>
              <small>From campus to career.</small>
            </div>
          </div>
        </motion.div>
      </section>
      <section className="landing-strip" aria-label="Portal capabilities">
        <span>ONE CAMPUS. EVERY OPPORTUNITY.</span>
        {[
          'Company discovery',
          'Placement drives',
          'Application tracking',
          'Official updates',
        ].map((label) => (
          <p key={label}>
            <Icon name="check" size={16} />
            {label}
          </p>
        ))}
      </section>
      <section className="landing-how">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A CLEARER WAY FORWARD</p>
            <h2>
              A big journey.
              <br />A few simple steps.
            </h2>
          </div>
          <p>
            Less searching. More clarity.
            <br />
            Everything you need, in your workspace.
          </p>
        </div>
        <div className="feature-grid">
          {steps.map(([icon, title, text], i) => (
            <motion.article
              key={title}
              className="feature-card"
              initial={{ opacity: 1, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="feature-top">
                <span className="icon-tile">
                  <Icon name={icon} size={23} />
                </span>
                <span>0{i + 1}</span>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </motion.article>
          ))}
        </div>
      </section>
      <section className="landing-cta">
        <div>
          <p className="eyebrow">YOUR FUTURE, IN FOCUS</p>
          <h2>Ready for what comes next?</h2>
          <p>Start with your profile. See where your potential takes you.</p>
        </div>
        <Link className="button button-primary button-large" to="/register">
          Create your account <Icon name="arrow" size={18} />
        </Link>
      </section>
    </>
  );
}
