import { useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from "framer-motion";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trophy, 
  Flame, 
  Target,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Award,
  BookOpen
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Scenario {
  id: number;
  title: string;
  description: string;
  isSafe: boolean;
  explanation: string;
}

const scenarios: Scenario[] = [
  {
    id: 1,
    title: "Ruptura no Vale",
    description: "Visualizado 1 arame rompido na região do vale (entre as pernas).",
    isSafe: false,
    explanation: "ISO 4309: Rupturas no vale indicam fadiga interna severa ou corrosão do núcleo. Critério de descarte imediato."
  },
  {
    id: 2,
    title: "Redução de Diâmetro (3%)",
    description: "Diâmetro nominal 20mm. Medido atual: 19.4mm (3% de redução).",
    isSafe: true,
    explanation: "ISO 4309: Redução de 3% é desgaste normal. O descarte geralmente ocorre acima de 7% (para cabos de fibra) ou 10%."
  },
  {
    id: 3,
    title: "Gaiola de Passarinho (Birdcage)",
    description: "Deformação severa tipo gaiola observada próxima ao soquete.",
    isSafe: false,
    explanation: "ISO 4309: Deformações do tipo Gaiola (Birdcage) tornam a estrutura instável. Descarte imediato."
  },
  {
    id: 4,
    title: "Corrosão Superficial",
    description: "Ferrugem visível, mas que sai ao passar um pano. Sem 'pittings' (cavidades).",
    isSafe: true,
    explanation: "ISO 4309: Corrosão oxidada superficial é aceitável se não houver perda de área metálica. Requer limpeza e lubrificação."
  },
  {
    id: 5,
    title: "Alma Saltada (Protrusão)",
    description: "A alma do cabo está saltando para fora entre as pernas.",
    isSafe: false,
    explanation: "ISO 4309: Protrusão de alma indica desequilíbrio torcional grave. Descarte imediato."
  },
  {
    id: 6,
    title: "Arames Rompidos (Dispersos)",
    description: "Cabo 6x36. Encontrados 2 arames rompidos em um comprimento de 6x diâmetros.",
    isSafe: true,
    explanation: "ISO 4309: Para classe 6x36, o limite costuma ser maior (ex: 9 ou 10 fios em 6d). 2 fios é apenas observação."
  },
  {
    id: 7,
    title: "Dano por Calor",
    description: "O cabo apresenta coloração azulada/têmpera visível em um trecho.",
    isSafe: false,
    explanation: "ISO 4309: Evidência de superaquecimento afeta a metalurgia do aço. Descarte imediato."
  },
  {
    id: 8,
    title: "Redução de Diâmetro (8%)",
    description: "Diâmetro nominal 50mm. Medido atual: 45.9mm (>8% de redução).",
    isSafe: false,
    explanation: "ISO 4309: Para cabos com alma de aço ou fibra, redução superior a 7% (ou 10% dependendo da norma específica) é descarte."
  },
  {
    id: 9,
    title: "Achatamento Localizado",
    description: "Pequeno achatamento, mas sem arames rompidos ou travamento de pernas.",
    isSafe: true,
    explanation: "ISO 4309: Achatamento leve sem outros defeitos associados requer monitoramento frequente, mas não descarte imediato."
  },
  {
    id: 10,
    title: "Dobra (Kink)",
    description: "O cabo sofreu um nó fechado que gerou uma dobra permanente.",
    isSafe: false,
    explanation: "ISO 4309: Dobras (Kinks) causam desequilíbrio estrutural irreversível. Descarte imediato."
  }
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getCertificationLevel(score: number, total: number): { title: string; color: string; icon: React.ReactNode } {
  const percentage = (score / total) * 100;
  if (percentage >= 90) {
    return { title: "Inspetor Sênior", color: "text-emerald-400", icon: <Trophy className="h-12 w-12 text-emerald-400" /> };
  } else if (percentage >= 70) {
    return { title: "Inspetor Pleno", color: "text-blue-400", icon: <Award className="h-12 w-12 text-blue-400" /> };
  } else if (percentage >= 50) {
    return { title: "Inspetor Júnior", color: "text-yellow-400", icon: <Target className="h-12 w-12 text-yellow-400" /> };
  } else {
    return { title: "Em Treinamento", color: "text-orange-400", icon: <BookOpen className="h-12 w-12 text-orange-400" /> };
  }
}

interface SwipeCardProps {
  scenario: Scenario;
  onSwipe: (direction: "left" | "right") => void;
  isTop: boolean;
}

function SwipeCard({ scenario, onSwipe, isTop }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  
  const leftIndicatorOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe("right");
    } else if (info.offset.x < -100) {
      onSwipe("left");
    }
  }, [onSwipe]);

  return (
    <motion.div
      className="absolute w-full cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 10 }}
      animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 10 }}
      exit={{ 
        x: x.get() > 0 ? 300 : -300,
        opacity: 0,
        transition: { duration: 0.3 }
      }}
    >
      {/* Swipe Indicators */}
      {isTop && (
        <>
          <motion.div 
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10"
            style={{ opacity: leftIndicatorOpacity }}
          >
            <div className="bg-rose-500/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
              <XCircle className="h-5 w-5" />
              DESCARTAR
            </div>
          </motion.div>
          <motion.div 
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10"
            style={{ opacity: rightIndicatorOpacity }}
          >
            <div className="bg-emerald-500/90 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">
              MANTER
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </motion.div>
        </>
      )}

      <Card className="bg-slate-900 border-slate-700 shadow-2xl overflow-hidden">
        {/* Header Strip */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-slate-600 to-rose-500" />
        
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600 font-mono text-xs">
              INCIDENTE #{scenario.id.toString().padStart(3, '0')}
            </Badge>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <CardTitle className="text-xl text-slate-100 font-bold mt-2">
            {scenario.title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <p className="text-slate-300 font-mono text-sm leading-relaxed">
              {scenario.description}
            </p>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
            <div className="flex items-center gap-2">
              <ChevronLeft className="h-4 w-4 text-rose-400" />
              <span>Deslize para descartar</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Deslize para manter</span>
              <ChevronRight className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function TreinamentoISO4309() {
  const [gameScenarios, setGameScenarios] = useState(() => shuffleArray(scenarios));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{ correct: boolean; scenario: Scenario } | null>(null);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const currentScenario = gameScenarios[currentIndex];
  const progress = ((currentIndex) / gameScenarios.length) * 100;

  const handleSwipe = useCallback((direction: "left" | "right") => {
    const userSaidSafe = direction === "right";
    const isCorrect = userSaidSafe === currentScenario.isSafe;

    setLastAnswer({ correct: isCorrect, scenario: currentScenario });

    if (isCorrect) {
      setScore(s => s + 1);
      setStreak(s => {
        const newStreak = s + 1;
        setMaxStreak(m => Math.max(m, newStreak));
        return newStreak;
      });
      setShowCorrectFeedback(true);
      setTimeout(() => {
        setShowCorrectFeedback(false);
        moveToNext();
      }, 800);
    } else {
      setStreak(0);
      setShowExplanation(true);
    }
  }, [currentScenario]);

  const moveToNext = useCallback(() => {
    if (currentIndex + 1 >= gameScenarios.length) {
      setGameComplete(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  }, [currentIndex, gameScenarios.length]);

  const handleCloseExplanation = () => {
    setShowExplanation(false);
    moveToNext();
  };

  const resetGame = () => {
    setGameScenarios(shuffleArray(scenarios));
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setGameComplete(false);
    setShowExplanation(false);
    setLastAnswer(null);
  };

  const certification = getCertificationLevel(score, gameScenarios.length);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-lg">
        {/* Game Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">
            Treinamento ISO 4309
          </h1>
          <p className="text-slate-400 text-sm">
            Deslize para avaliar cada cenário de inspeção de cabos
          </p>
        </div>

        {!gameComplete ? (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-medium">Pontos</span>
                </div>
                <span className="text-2xl font-bold text-slate-100">{score}</span>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                  <Flame className="h-4 w-4" />
                  <span className="text-xs font-medium">Sequência</span>
                </div>
                <span className="text-2xl font-bold text-slate-100">{streak}</span>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                  <Trophy className="h-4 w-4" />
                  <span className="text-xs font-medium">Melhor</span>
                </div>
                <span className="text-2xl font-bold text-slate-100">{maxStreak}</span>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>Progresso</span>
                <span>{currentIndex + 1} / {gameScenarios.length}</span>
              </div>
              <Progress value={progress} className="h-2 bg-slate-800" />
            </div>

            {/* Card Stack */}
            <div className="relative h-[320px] mb-6">
              <AnimatePresence>
                {gameScenarios.slice(currentIndex, currentIndex + 2).reverse().map((scenario, idx) => (
                  <SwipeCard
                    key={scenario.id}
                    scenario={scenario}
                    onSwipe={handleSwipe}
                    isTop={idx === (Math.min(1, gameScenarios.length - currentIndex - 1))}
                  />
                ))}
              </AnimatePresence>

              {/* Correct Feedback Overlay */}
              <AnimatePresence>
                {showCorrectFeedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none"
                  >
                    <div className="bg-emerald-500/20 backdrop-blur-sm rounded-full p-8">
                      <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Manual Buttons */}
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSwipe("left")}
                className="flex-1 bg-rose-500/10 border-rose-500/50 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
              >
                <XCircle className="h-5 w-5 mr-2" />
                Descartar
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleSwipe("right")}
                className="flex-1 bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
              >
                <CheckCircle2 className="h-5 w-5 mr-2" />
                Manter
              </Button>
            </div>
          </>
        ) : (
          /* End Screen */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <Card className="bg-slate-900 border-slate-700 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-rose-500" />
              
              <CardContent className="pt-8 pb-6">
                <div className="mb-6">
                  {certification.icon}
                </div>
                
                <h2 className={`text-2xl font-bold mb-2 ${certification.color}`}>
                  {certification.title}
                </h2>
                
                <p className="text-slate-400 mb-6">
                  Treinamento ISO 4309 concluído!
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Pontuação Final</p>
                    <p className="text-3xl font-bold text-emerald-400">
                      {score}/{gameScenarios.length}
                    </p>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-slate-400 text-sm mb-1">Maior Sequência</p>
                    <p className="text-3xl font-bold text-orange-400">
                      {maxStreak}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800/30 rounded-lg p-4 mb-6">
                  <p className="text-slate-300 text-sm">
                    {score >= 9 
                      ? "Excelente! Você demonstra domínio completo da ISO 4309."
                      : score >= 7
                      ? "Muito bom! Continue estudando os critérios de descarte."
                      : score >= 5
                      ? "Bom progresso. Revise os cenários que errou."
                      : "Continue praticando. Revise a norma ISO 4309."}
                  </p>
                </div>

                <Button 
                  onClick={resetGame}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="lg"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Jogar Novamente
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>

      {/* Explanation Modal */}
      <Dialog open={showExplanation} onOpenChange={handleCloseExplanation}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <XCircle className="h-6 w-6" />
              <DialogTitle className="text-rose-400">Resposta Incorreta</DialogTitle>
            </div>
            <DialogDescription asChild>
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-200 mb-2">
                    {lastAnswer?.scenario.title}
                  </h4>
                  <p className="text-slate-400 text-sm font-mono">
                    {lastAnswer?.scenario.description}
                  </p>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-200 font-medium mb-1">Nota do Engenheiro:</p>
                      <p className="text-amber-100/80 text-sm">
                        {lastAnswer?.scenario.explanation}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <span>Resposta correta:</span>
                  {lastAnswer?.scenario.isSafe ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      MANTER
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">
                      DESCARTAR
                    </Badge>
                  )}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <Button 
            onClick={handleCloseExplanation}
            className="w-full mt-4 bg-slate-700 hover:bg-slate-600"
          >
            Continuar
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

