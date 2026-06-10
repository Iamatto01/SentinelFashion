import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Camera, Check } from 'lucide-react';
import ThreeCanvas from '../components/ThreeCanvas';
import './OnboardingPage.css';

const STEPS = [
  {
    id: 'welcome',
    title: 'Your AI Stylist',
    desc: 'Organize your wardrobe, discover new combinations, and always know what to wear.',
    emoji: '✨'
  },
  {
    id: 'quiz-1',
    title: 'What\'s your vibe?',
    desc: 'Help us understand your preferred style.',
    options: ['Casual & Relaxed', 'Smart & Polished', 'Trendy & Bold', 'Minimalist & Clean'],
    field: 'vibe'
  },
  {
    id: 'quiz-2',
    title: 'Color Preferences',
    desc: 'What colors dominate your wardrobe?',
    options: ['Neutral Tones', 'Bright & Colorful', 'Dark & Moody', 'Earth Tones'],
    field: 'colors'
  }
];

export default function OnboardingPage({ store }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState({ vibe: '', colors: '' });

  const currentStep = STEPS[step];

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSelect = (option) => {
    setSelections(prev => ({ ...prev, [currentStep.field]: option }));
  };

  const completeOnboarding = () => {
    // Generate a persona based on selection
    let persona = 'Minimalist Chic';
    if (selections.vibe === 'Casual & Relaxed') persona = 'Effortless Casual';
    if (selections.vibe === 'Trendy & Bold') persona = 'Bold Trendsetter';
    if (selections.vibe === 'Smart & Polished') persona = 'Polished Professional';
    
    store.setProfile(prev => ({
      ...prev,
      stylePersona: persona,
      onboarded: true
    }));
    navigate('/');
  };

  return (
    <div className="onboarding-page page-enter">
      <div className="branding-header">
        <Sparkles className="brand-icon" size={24} />
        <h1>People & Co.</h1>
      </div>

      <div className="onboarding-content">
        {step === 0 ? (
          <div className="step-welcome animate-scale-in">
            <div className="hero-illustration" style={{ position: 'relative', overflow: 'hidden', borderRadius: '50%' }}>
              <div style={{ position: 'absolute', inset: 0, scale: '1.2' }}>
                <ThreeCanvas />
              </div>
              <span className="hero-emoji" style={{ position: 'relative', zIndex: 10 }}>{currentStep.emoji}</span>
            </div>
            <h2>{currentStep.title}</h2>
            <p>{currentStep.desc}</p>
          </div>
        ) : (
          <div className="step-quiz animate-slide-up" key={step}>
            <h2>{currentStep.title}</h2>
            <p className="quiz-desc">{currentStep.desc}</p>
            
            <div className="quiz-options">
              {currentStep.options.map((opt) => (
                <button
                  key={opt}
                  className={`quiz-option ${selections[currentStep.field] === opt ? 'quiz-option--selected' : ''}`}
                  onClick={() => handleSelect(opt)}
                >
                  {opt}
                  {selections[currentStep.field] === opt && <Check size={18} className="check-icon" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="onboarding-footer">
        <div className="step-indicators">
          {STEPS.map((_, i) => (
            <span key={i} className={`step-dot ${i === step ? 'step-dot--active' : ''}`} />
          ))}
        </div>
        <button
          className="btn btn--primary next-btn"
          onClick={handleNext}
          disabled={step > 0 && !selections[currentStep.field]}
        >
          {step === 0 ? 'Get Started' : step === STEPS.length - 1 ? 'Finish' : 'Next'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

