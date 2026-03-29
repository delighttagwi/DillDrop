import { useState, useEffect } from 'react';
import { Leaf } from 'lucide-react';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [stage, setStage] = useState<'logo' | 'text' | 'fade'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setStage('text'), 600);
    const t2 = setTimeout(() => setStage('fade'), 2000);
    const t3 = setTimeout(() => onComplete(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-primary transition-opacity duration-600 ${
        stage === 'fade' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className={`transition-all duration-700 ${stage === 'logo' ? 'scale-75 opacity-0' : 'scale-100 opacity-100'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
            <Leaf className="h-9 w-9 text-primary-foreground" />
          </div>
        </div>
      </div>
      <h1
        className={`text-4xl md:text-5xl font-display font-bold text-primary-foreground transition-all duration-700 delay-200 ${
          stage === 'logo' ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        FreshShare
      </h1>
      <p
        className={`text-primary-foreground/70 mt-2 text-lg transition-all duration-700 delay-300 ${
          stage === 'logo' ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        Reduce Waste, Share More
      </p>
    </div>
  );
};

export default SplashScreen;
