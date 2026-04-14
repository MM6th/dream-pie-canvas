import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import sixthCoinLogo from "@/assets/sixth-coin-logo.jpg";

/** Inject keyframes once */
const bubbleStyleId = 'contest-bubble-styles';
if (typeof document !== 'undefined' && !document.getElementById(bubbleStyleId)) {
  const style = document.createElement('style');
  style.id = bubbleStyleId;
  style.textContent = `
    @keyframes bubble-rise {
      0% { transform: translateX(0) scale(1); opacity: 0.7; bottom: 0%; }
      25% { transform: translateX(1px) scale(1.1); opacity: 0.8; }
      50% { transform: translateX(-1px) scale(0.9); opacity: 0.6; }
      75% { transform: translateX(1px) scale(1.05); opacity: 0.4; }
      100% { transform: translateX(0) scale(0.8); opacity: 0; bottom: 100%; }
    }
    @keyframes badge-fly-right {
      0% { transform: translateX(0) scale(1); opacity: 1; }
      30% { transform: translateX(20%) scale(1.3); opacity: 1; }
      70% { transform: translateX(50vw) scale(1.4); opacity: 1; }
      100% { transform: translateX(50vw) scale(1); opacity: 1; }
    }
    @keyframes badge-fly-left {
      0% { transform: translateX(0) scale(1); opacity: 1; }
      30% { transform: translateX(-20%) scale(1.3); opacity: 1; }
      70% { transform: translateX(-50vw) scale(1.4); opacity: 1; }
      100% { transform: translateX(-50vw) scale(1); opacity: 1; }
    }
    @keyframes title-text-appear {
      0% { opacity: 0; transform: translateY(30px) scale(0.8); letter-spacing: 0.5em; }
      50% { opacity: 1; transform: translateY(0) scale(1.1); letter-spacing: 0.2em; }
      100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: 0.15em; }
    }
  `;
  document.head.appendChild(style);
}

/** Fizzy bubbles inside a tank */
export const TankBubbles = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const bubbles = [
    { size: 2, left: '20%', delay: '0s', duration: '1.2s' },
    { size: 3, left: '50%', delay: '0.3s', duration: '1s' },
    { size: 2, left: '70%', delay: '0.6s', duration: '1.4s' },
    { size: 1.5, left: '35%', delay: '0.15s', duration: '0.9s' },
    { size: 2.5, left: '60%', delay: '0.8s', duration: '1.1s' },
    { size: 1.5, left: '15%', delay: '0.45s', duration: '1.3s' },
  ];
  return (
    <>
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white/40"
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            bottom: '0%',
            animation: `bubble-rise ${b.duration} ease-in-out ${b.delay} infinite`,
          }}
        />
      ))}
    </>
  );
};

/** Vertical tank gauge used for Tip / Skill / Sample meters */
export const VerticalTank = ({
  label,
  value,
  color,
  bgColor,
  bubbles = false,
  fusion = false,
  glow = false,
  overflowing = false,
}: {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  bubbles?: boolean;
  fusion?: boolean;
  glow?: boolean;
  overflowing?: boolean;
}) => {
  const displayValue = Math.min(value, 100);
  const fusionStyle: React.CSSProperties = fusion
    ? {
        height: `${displayValue}%`,
        background: displayValue > 0
          ? `linear-gradient(0deg, #7c3aed ${0}%, #a855f7 ${Math.min(displayValue, 40)}%, #f472b6 ${Math.min(displayValue, 70)}%, #fbbf24 ${Math.min(displayValue, 100)}%)`
          : undefined,
        boxShadow: displayValue > 30
          ? `0 0 ${4 + displayValue / 10}px rgba(168,85,247,0.6), inset 0 0 ${displayValue / 8}px rgba(251,191,36,0.4)`
          : undefined,
        transition: 'all 0.7s ease',
      }
    : { height: `${displayValue}%` };

  return (
    <div className="flex flex-col items-center gap-1 relative">
      {overflowing && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <span className="text-lg drop-shadow-[0_0_6px_rgba(236,72,153,0.8)]">❤️</span>
        </div>
      )}
      <div
        className={`w-5 h-20 rounded-sm ${bgColor} relative overflow-hidden border border-white/10 transition-shadow duration-500 ${
          glow ? 'shadow-[0_0_10px_rgba(34,197,94,0.5),0_0_20px_rgba(34,197,94,0.2)]' : ''
        } ${overflowing ? 'shadow-[0_0_12px_rgba(236,72,153,0.6),0_0_24px_rgba(236,72,153,0.3)]' : ''}`}
      >
        <div
          className={`absolute bottom-0 left-0 right-0 ${fusion ? '' : color} transition-all duration-700`}
          style={fusionStyle}
        >
          <TankBubbles active={bubbles && displayValue > 0} />
          {fusion && displayValue > 20 && (
            <div
              className="absolute inset-0 animate-pulse opacity-40"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              }}
            />
          )}
        </div>
      </div>
      <span className="text-[9px] text-white/70 font-medium leading-tight text-center whitespace-nowrap">
        {label}
      </span>
    </div>
  );
};

/** Get slider track gradient based on value relative to 50 */
export const getSliderStyle = (value: number) => {
  const pct = value;
  if (value < 50) {
    return {
      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
    };
  } else if (value > 50) {
    return {
      background: `linear-gradient(to right, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 50%, #ef4444 50%, #ef4444 ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
    };
  }
  return { background: 'rgba(255,255,255,0.1)' };
};

/** Polling widget with 4 category sliders */
export const PollWidget = ({
  side,
  disabled,
  onVotePowerChange,
  onSubmittedChange,
}: {
  side: 'champion' | 'challenger';
  disabled?: boolean;
  onVotePowerChange?: (power: number) => void;
  onSubmittedChange?: (submitted: boolean) => void;
}) => {
  const [values, setValues] = React.useState({ Outfit: 50, Makeup: 50, Personality: 50, Interaction: 50 });
  const [submitted, setSubmitted] = React.useState(false);

  const handleChange = (label: string, newVal: number) => {
    if (submitted) return;
    const next = { ...values, [label]: newVal };
    setValues(next);
    const totalDeviation = Object.values(next).reduce((sum, v) => sum + Math.abs(v - 50), 0);
    const maxDeviation = 4 * 50;
    const votePower = Math.round((totalDeviation / maxDeviation) * 100);
    onVotePowerChange?.(votePower);
  };

  const handleSubmit = () => {
    if (submitted || disabled) return;
    setSubmitted(true);
    onSubmittedChange?.(true);
  };

  const getValueColor = (val: number) => {
    if (val < 50) return 'text-blue-400';
    if (val > 50) return 'text-red-400';
    return 'text-white/60';
  };

  return (
    <div className={`bg-black/40 rounded-md p-2 w-[130px] space-y-1.5 ${submitted ? 'ring-1 ring-green-500/50' : ''}`}>
      {Object.entries(values).map(([label, val]) => (
        <div key={label} className="space-y-0.5">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/60 font-semibold uppercase tracking-wider">{label}</span>
            <span className={`text-[9px] font-mono font-bold ${getValueColor(val)}`}>{val}</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={val}
            disabled={disabled || submitted}
            onChange={(e) => handleChange(label, Number(e.target.value))}
            style={getSliderStyle(val)}
            className="w-full h-1.5 appearance-none rounded-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/80"
          />
        </div>
      ))}
      {submitted ? (
        <div className="w-full h-5 flex items-center justify-center text-[9px] font-semibold uppercase tracking-wider text-green-400 mt-1">
          ✓ Submitted
        </div>
      ) : (
        <Button size="sm" disabled={disabled} onClick={handleSubmit} className="w-full h-5 text-[9px] font-semibold uppercase tracking-wider mt-1">
          Submit
        </Button>
      )}
    </div>
  );
};

/** Power flow horizontal bar */
export const PowerFlowBar = ({ value }: { value: number }) => (
  <div className="space-y-1">
    <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider">Power Flow</span>
    <div className="w-full h-3 rounded-sm bg-white/10 overflow-hidden">
      <div
        className="h-full bg-red-500 transition-all duration-700 rounded-sm"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

/** Total points bar — hidden until contest ends */
export const TotalPointsBar = ({ points, revealed, penalized }: { points: number; revealed: boolean; penalized?: boolean }) => (
  <div className="space-y-1">
    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Total Points</span>
    <div className="w-full h-4 rounded-sm bg-white/10 overflow-hidden relative">
      {revealed ? (
        <>
          <div
            className="h-full bg-amber-500 rounded-sm animate-[grow_1.5s_ease-out_forwards]"
            style={{ width: `${Math.min(points, 100)}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white drop-shadow animate-[fadeIn_0.8s_ease-in_0.5s_both]">
            {points.toFixed(1)}
          </span>
        </>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white/30">
          ???
        </span>
      )}
    </div>
    {revealed && penalized && (
      <span className="text-[8px] text-red-400 font-semibold animate-[fadeIn_0.8s_ease-in_1s_both]">
        ⚠ -15 pts (poll not submitted)
      </span>
    )}
  </div>
);

/** Coin meter display */
export const CoinMeter = ({ value }: { value: number }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 min-w-[120px]">
    <img src={sixthCoinLogo} className="w-4 h-4 rounded-full flex-shrink-0" alt="SIXTH" />
    <Progress value={Math.min(value, 100)} className="h-2 flex-1 bg-white/10 [&>div]:bg-amber-500" />
    <span className="text-amber-400 text-xs font-mono font-medium whitespace-nowrap">{value}</span>
  </div>
);
