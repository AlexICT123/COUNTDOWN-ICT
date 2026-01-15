
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Utilities ---
const getTargetDate = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  let target = new Date(currentYear, 3, 24, 0, 0, 0); // April is 3
  if (now > target) {
    target = new Date(currentYear + 1, 3, 24, 0, 0, 0);
  }
  return target;
};

const calculateTimeLeft = (targetDate: Date) => {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }
  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isComplete: false,
  };
};

// --- Background Component ---
const Petals = () => {
  const [petals, setPetals] = useState<any[]>([]);
  useEffect(() => {
    const petalCount = 15;
    const newPetals = Array.from({ length: petalCount }).map((_, i) => ({
      id: i,
      left: Math.random() * 100 + '%',
      size: Math.random() * 10 + 10 + 'px',
      duration: Math.random() * 10 + 10 + 's',
      delay: Math.random() * 5 + 's',
      rotation: Math.random() * 360 + 'deg'
    }));
    setPetals(newPetals);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {petals.map(p => (
        <div 
          key={p.id}
          className="petal"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            transform: `rotate(${p.rotation})`
          } as any}
        />
      ))}
    </div>
  );
};

// --- UI Components ---
const CountdownCard = ({ value, label }: { value: number, label: string }) => (
  <div className="flex flex-col items-center group">
    <div className="glass-card glass w-24 h-28 md:w-36 md:h-44 rounded-3xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-105 group-hover:border-indigo-500/50 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.2)]">
      <span className="text-4xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
    <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-indigo-300 opacity-40 font-black group-hover:opacity-80 transition-opacity">
      {label}
    </span>
  </div>
);

const DailyInsight = ({ insight, loading, onRefresh }: { insight: any, loading: boolean, onRefresh: () => void }) => {
  if (loading) {
    return (
      <div className="mt-12 glass p-8 rounded-3xl max-w-2xl w-full animate-pulse flex flex-col gap-6">
        <div className="h-4 w-3/4 bg-white/10 rounded"></div>
        <div className="h-4 w-1/2 bg-white/10 rounded"></div>
      </div>
    );
  }
  if (!insight) return null;

  return (
    <div className="mt-12 glass glass-card p-10 rounded-[2.5rem] max-w-2xl w-full group relative overflow-hidden transition-all duration-500 hover:border-indigo-500/30">
      <button 
        onClick={onRefresh}
        className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 transition-colors text-indigo-400/50 hover:text-indigo-300 z-10"
        title="重新生成"
      >
        <i className="fas fa-sync-alt"></i>
      </button>

      <div className="flex items-start gap-6 mb-10">
        <div className="p-5 bg-indigo-500/10 rounded-2xl text-indigo-400">
          <i className="fas fa-feather-pointed text-2xl"></i>
        </div>
        <div>
          <p className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-4">
            "{insight.quote}"
          </p>
          <p className="text-sm text-indigo-400/80 font-bold uppercase tracking-widest">— {insight.author}</p>
        </div>
      </div>
      
      <div className="border-t border-white/5 pt-8 flex items-start gap-6">
        <div className="p-4 bg-pink-500/10 rounded-xl text-pink-400">
          <i className="fas fa-spa text-xl"></i>
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.3em] text-pink-400 font-black mb-2">春之絮語</h4>
          <p className="text-sm md:text-base text-indigo-100/60 leading-relaxed italic">{insight.fact}</p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const targetDate = useMemo(() => getTargetDate(), []);
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetDate));
  const [insight, setInsight] = useState<any>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const fetchInsight = async (force = false) => {
    const cacheKey = 'daily_insight_424';
    const cached = localStorage.getItem(cacheKey);
    
    if (!force && cached) {
      const { data, timestamp } = JSON.parse(cached);
      const isSameDay = new Date(timestamp).toDateString() === new Date().toDateString();
      if (isSameDay) {
        setInsight(data);
        return;
      }
    }

    setLoadingInsight(true);
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const prompt = `你是一位浪漫且富有詩意的文學家。請為正在倒數 4月24日（春天的一個重要日子）的人提供一段鼓勵。
    目前距離還有 ${timeLeft.days} 天。
    請提供：
    1. 一句關於春天、等待或希望的名言（可以是創作的）。
    2. 作者名。
    3. 一個關於 4月或春天的有趣冷知識或感性的觀察。
    請以繁體中文回答。`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quote: { type: Type.STRING },
              author: { type: Type.STRING },
              fact: { type: Type.STRING }
            },
            required: ["quote", "author", "fact"]
          }
        }
      });
      const result = JSON.parse(response.text.trim());
      setInsight(result);
      localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch (error) {
      console.error("AI Error:", error);
      setInsight({
        quote: "林花謝了春紅，太匆匆。但四月的約定，始終在枝頭等待綻放。",
        author: "春之詩人",
        fact: "在古羅馬曆法中，四月 (April) 的名字來自於拉丁語 'aperire'，意為『打開』，象徵著花蕾即將盛開。"
      });
    } finally {
      setLoadingInsight(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    fetchInsight();
    return () => clearInterval(timer);
  }, [targetDate]);

  const progress = Math.max(0, 100 - (timeLeft.days / 365) * 100);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative bg-[#020617] text-slate-200">
      <Petals />
      
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none opacity-60"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-pink-600/5 blur-[180px] rounded-full pointer-events-none opacity-40"></div>
      
      <main className="z-10 w-full max-w-6xl flex flex-col items-center">
        <header className="text-center mb-20 px-4 relative">
          <h1 className="text-6xl md:text-9xl font-black mb-8 tracking-tighter leading-none">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-500 text-glow">
              04.24
            </span>
          </h1>
          <p className="text-indigo-200/40 text-sm md:text-lg font-bold tracking-[0.2em] uppercase max-w-2xl mx-auto pulse-soft">
            {timeLeft.isComplete ? '': '距離 DSE ICT，還剩餘'}
          </p>
        </header>

        <div className="flex flex-wrap justify-center gap-6 md:gap-12 mb-20">
          <CountdownCard value={timeLeft.days} label="Days" />
          <CountdownCard value={timeLeft.hours} label="Hours" />
          <CountdownCard value={timeLeft.minutes} label="Mins" />
          <CountdownCard value={timeLeft.seconds} label="Secs" />
        </div>

        {!timeLeft.isComplete && (
          <div className="w-full max-w-3xl px-8 mb-16">
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out progress-bar-glow"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-4 text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400/50">
              <span>Origin</span>
              <span className="text-indigo-300">{progress.toFixed(1)}% Completed</span>
              <span>Arrival</span>
            </div>
          </div>
        )}

        <DailyInsight 
          insight={insight} 
          loading={loadingInsight} 
          onRefresh={() => fetchInsight(true)} 
        />

        <footer className="mt-32 pb-8 flex flex-col items-center gap-6 opacity-30 hover:opacity-100 transition-opacity duration-700">
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-indigo-400 transition-colors"><i className="fab fa-instagram text-xl"></i></a>
            <a href="#" className="hover:text-indigo-400 transition-colors"><i className="fab fa-twitter text-xl"></i></a>
            <a href="#" className="hover:text-indigo-400 transition-colors"><i className="fab fa-dribbble text-xl"></i></a>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.5em] text-center">
            Designed for the Moment &bull; Built with Gemini
          </div>
        </footer>
      </main>

      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
