import React, { useState, useEffect } from "react";
import { X, ArrowRight, Check, Play, Settings, RefreshCw, Copy, Tv } from "lucide-react";

interface TutorialOverlayProps {
  onComplete: () => void;
  setActiveTab: (tab: any) => void;
}

export default function TutorialOverlay({ onComplete, setActiveTab }: TutorialOverlayProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to StreamAlerts!",
      description: "Let's get your Discord media alerts set up for your stream. It's quick and easy!",
      icon: <Check className="w-10 h-10 text-emerald-400" />,
      action: () => setStep(1),
      buttonText: "Start Tutorial",
      tab: 'credentials'
    },
    {
      title: "1. Link Discord",
      description: "First, you need to connect the bot to your Discord server.\nGo to 'Discord Bot Settings' and enter your Channel ID and Bot Token.",
      icon: <Settings className="w-10 h-10 text-indigo-400" />,
      action: () => {
        setActiveTab("credentials");
        setStep(2);
      },
      buttonText: "Next",
      tab: 'credentials'
    },
    {
      title: "2. Add to OBS",
      description: "Copy the link from the 'OBS Browser Source Link' section and add it as a new 'Browser Source' in OBS. We recommend checking 'Shutdown source when not visible'.",
      icon: <Tv className="w-10 h-10 text-rose-400" />,
      action: () => setStep(3),
      buttonText: "Next",
      tab: 'credentials'
    },
    {
      title: "3. Test It Out",
      description: "To test your setup, head to the 'OBS Overlay Preview' and trigger a simulation. You'll see the alert pop up in the preview and in OBS!",
      icon: <Play className="w-10 h-10 text-fuchsia-400" />,
      action: () => {
        setStep(4);
      },
      buttonText: "Next",
      tab: 'credentials'
    },
    {
      title: "All Set!",
      description: "Your settings are saved automatically when you click 'Save Settings'. Have a great stream!",
      icon: <Check className="w-10 h-10 text-emerald-400" />,
      action: onComplete,
      buttonText: "Finish",
      tab: 'credentials'
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#0a0a0f] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative flex flex-col items-center text-center">
        <button 
          onClick={onComplete}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition cursor-pointer bg-white/5 rounded-full hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-6">
          {currentStep.icon}
        </div>

        <h2 className="text-2xl font-black text-white font-display uppercase tracking-tight mb-3">
          {currentStep.title}
        </h2>
        
        <p className="text-sm text-slate-300 mb-8 whitespace-pre-line leading-relaxed">
          {currentStep.description}
        </p>

        <div className="flex items-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-8 bg-indigo-500" : "w-1.5 bg-white/20"}`}
            />
          ))}
        </div>

        <button
          onClick={currentStep.action}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30"
        >
          {currentStep.buttonText}
          {step < steps.length - 1 && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
