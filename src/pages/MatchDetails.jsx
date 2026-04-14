import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Activity, CirclePlay, Target, Zap, Sparkles, Users, Crown, MessageSquare, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getMatchInsights } from '../utils/aiService';

export const MatchDetails = () => {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [balls, setBalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNexaBot, setShowNexaBot] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [botResponse, setBotResponse] = useState('');
  const [botLoading, setBotLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubMatch = onSnapshot(doc(db, 'matches', id), (doc) => {
      if (doc.exists()) setMatch({ id: doc.id, ...doc.data() });
      setLoading(false);
    });

    const q = query(collection(db, `matches/${id}/balls`), orderBy('timestamp', 'desc'));
    const unsubBalls = onSnapshot(q, (snapshot) => {
      setBalls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubMatch(); unsubBalls(); };
  }, [id]);

  const calculateWinProbability = () => {
    if (!match || !match.scoreA || !match.scoreB) return 50;
    const { scoreA, scoreB, currentInnings, totalOvers } = match;
    const maxOvers = totalOvers || 20;

    if (currentInnings === 1) {
      // 1st Innings: Based on Projected Score vs Par Score (assume 8.5 RPO is par)
      const oversDone = scoreA.overs || 0.1;
      const currentRR = scoreA.runs / oversDone;
      const projectedScore = currentRR * maxOvers;
      const wicketPenalty = (scoreA.wickets || 0) * 8; // Each wicket reduces probability
      
      const parScore = 8.5 * maxOvers;
      let prob = 50 + ((projectedScore - parScore) / 2) - wicketPenalty;
      return Math.min(Math.max(prob, 5), 95);
    } else {
      // 2nd Innings: Based on Required Rate vs Current Rate and Wickets
      const target = (scoreA.runs || 0) + 1;
      const runsNeeded = target - (scoreB.runs || 0);
      const oversDone = scoreB.overs || 0;
      const ballsRemaining = Math.max(0, (maxOvers - Math.floor(oversDone)) * 6 - (Math.round((oversDone % 1) * 10)));
      
      if (runsNeeded <= 0) return 0; // Team B wins
      if (ballsRemaining <= 0) return (scoreB.runs || 0) >= target ? 0 : 100;
      
      const reqRR = (runsNeeded / (ballsRemaining / 6));
      const currentRR = (scoreB.runs || 0) / (oversDone || 0.1);
      const wicketsLeft = 10 - (scoreB.wickets || 0);
      
      // Higher required rate and fewer wickets left = Higher prob for Team A
      let prob = 50 + (reqRR - currentRR) * 5 + (10 - wicketsLeft) * 5;
      return Math.min(Math.max(prob, 2), 98);
    }
  };

  const getScorePrediction = () => {
    if (!match || match.status === 'completed') return null;
    const currentScore = match.currentInnings === 1 ? match.scoreA : match.scoreB;
    if (!currentScore) return null;
    
    const overs = currentScore.overs || 0.1;
    const rr = (currentScore.runs || 0) / overs;
    const totalOvers = match.totalOvers || 20; 
    
    // NexaPredict Logic: Adjust projected score based on wickets left
    const wicketsLeft = 10 - (currentScore.wickets || 0);
    const momentumFactor = (wicketsLeft / 10) * 0.2; // Wickets preservation adds to score
    const predicted = Math.round((currentScore.runs || 0) + (rr * (1 + momentumFactor) * (totalOvers - (currentScore.overs || 0))));
    return predicted;
  };

  if (loading) return <div className="flex justify-center h-64 items-center"><Activity className="w-12 h-12 text-neon-blue animate-pulse" /></div>;
  if (!match) return <div className="text-center text-red-500 py-12">Match not found.</div>;

  const winProb = calculateWinProbability();
  const predictedScore = getScorePrediction();

  const handleNexaBotAsk = async () => {
    if (!chatMessage.trim()) return;
    setBotLoading(true);
    const context = `Match: ${match.teamA} vs ${match.teamB}. Score: ${match.scoreA.runs}/${match.scoreA.wickets} vs ${match.scoreB.runs}/${match.scoreB.wickets}. Current Innings: ${match.currentInnings}. Last 5 balls: ${balls.slice(0, 5).map(b => b.runs).join(', ')}. Win Probability: ${match.teamA} ${Math.round(winProb)}%.`;
    try {
      const response = await getMatchInsights(match, balls); // Reusing insights for now as a bot response
      setBotResponse(response);
    } catch (e) {
      setBotResponse("I'm having trouble analyzing the match right now. Try again!");
    }
    setBotLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Match Info Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
          <Sparkles className="text-neon-blue w-6 h-6 animate-pulse" />
          {match.matchName || `${match.teamA} vs ${match.teamB}`}
        </h1>
        <div className="text-sm text-neon-blue font-mono tracking-widest uppercase flex items-center justify-center gap-2">
          <Info className="w-4 h-4" />
          {match.totalOvers || 20}-Over Match • NexaPredict Active
        </div>
      </div>

      {/* Scoreboard Header */}
      <div className="glass p-8 rounded-3xl border border-neon-blue/30 shadow-[0_0_40px_rgba(0,243,255,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-pink"></div>
        <div className="flex justify-between items-center mb-8">
          <span className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2 ${
            match.status === 'live' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-green-500/20 text-green-400 border-green-500/50'
          }`}>
            {match.status === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            {match.status.toUpperCase()}
          </span>
          <span className="text-gray-400 text-sm font-medium tracking-widest uppercase">
            {match.status === 'completed' ? 'Match Ended' : `Innings ${match.currentInnings}`}
          </span>
        </div>

        <div className="grid grid-cols-3 items-center text-center gap-4">
          <div className={`space-y-2 transition-all duration-500 ${match.currentInnings === 2 && match.status === 'live' ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}`}>
            <h2 className="text-2xl md:text-4xl font-black text-white truncate">{match.teamA}</h2>
            <div className="font-mono text-3xl md:text-5xl font-bold text-neon-blue drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
              {match.scoreA?.runs}/{match.scoreA?.wickets}
            </div>
            <div className="text-gray-400 font-medium">Overs: {match.scoreA?.overs}</div>
          </div>

          <div className="text-gray-500 font-black italic text-2xl md:text-4xl animate-pulse">VS</div>

          <div className={`space-y-2 transition-all duration-500 ${match.currentInnings === 1 && match.status === 'live' ? 'opacity-40 scale-95' : 'opacity-100 scale-100'}`}>
            <h2 className="text-2xl md:text-4xl font-black text-white truncate">{match.teamB}</h2>
            <div className="font-mono text-3xl md:text-5xl font-bold text-neon-pink drop-shadow-[0_0_10px_rgba(255,0,234,0.5)]">
              {match.scoreB?.runs}/{match.scoreB?.wickets}
            </div>
            <div className="text-gray-400 font-medium">Overs: {match.scoreB?.overs}</div>
          </div>
        </div>
      </div>

      {/* AI Insights & Predictions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl border border-neon-blue/20 flex items-start gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Target className="w-16 h-16 text-neon-blue" />
          </div>
          <Target className="w-8 h-8 text-neon-blue flex-shrink-0 relative z-10" />
          <div className="w-full relative z-10">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              NexaPredict: Win Prob
              <Sparkles className="w-3 h-3 text-neon-blue" />
            </h3>
            <div className="w-full bg-dark-bg h-4 rounded-full mt-4 overflow-hidden border border-dark-border p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${winProb}%` }}
                className="bg-gradient-to-r from-neon-blue via-blue-500 to-blue-600 h-full rounded-full shadow-[0_0_10px_rgba(0,243,255,0.3)]"
              ></motion.div>
            </div>
            <div className="flex justify-between text-xs mt-3 text-gray-400 font-mono font-bold">
              <span className={winProb > 50 ? "text-neon-blue" : ""}>{match.teamA} {Math.round(winProb)}%</span>
              <span className={winProb <= 50 ? "text-neon-pink" : ""}>{match.teamB} {Math.round(100 - winProb)}%</span>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-2xl border border-neon-pink/20 flex items-start gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-16 h-16 text-neon-pink" />
          </div>
          <Zap className="w-8 h-8 text-neon-pink flex-shrink-0 relative z-10" />
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              NexaPredict: Score
              <Sparkles className="w-3 h-3 text-neon-pink" />
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed mt-2">
              {match.status === 'completed' ? (
                `Match finished. ${match.winner} won!`
              ) : (
                <>
                  Based on CRR and wickets, <strong className="text-white">{match.currentInnings === 1 ? match.teamA : match.teamB}</strong> is projected to reach <strong className="text-neon-pink font-mono text-lg">{predictedScore}</strong>.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* NexaBot Floating Trigger */}
      <button 
        onClick={() => setShowNexaBot(!showNexaBot)}
        className="fixed bottom-6 right-6 z-[60] bg-gradient-to-r from-neon-blue to-neon-pink p-4 rounded-full shadow-[0_0_20px_rgba(0,243,255,0.5)] hover:scale-110 transition-transform flex items-center gap-2 group"
      >
        <MessageSquare className="w-6 h-6 text-white" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-white font-bold whitespace-nowrap">Ask NexaBot</span>
      </button>

      {/* NexaBot Modal */}
      <AnimatePresence>
        {showNexaBot && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-[60] w-80 md:w-96 glass border border-neon-blue/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="bg-gradient-to-r from-neon-blue to-blue-600 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-white" />
                <span className="font-bold text-white">NexaBot AI</span>
              </div>
              <button onClick={() => setShowNexaBot(false)} className="text-white/80 hover:text-white">
                <Info className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-dark-bg/50 rounded-2xl p-4 border border-dark-border min-h-[100px] text-sm text-gray-300">
                {botLoading ? (
                  <div className="flex items-center gap-2 animate-pulse">
                    <div className="w-2 h-2 bg-neon-blue rounded-full"></div>
                    <div className="w-2 h-2 bg-neon-blue rounded-full"></div>
                    <div className="w-2 h-2 bg-neon-blue rounded-full"></div>
                    Analyzing match...
                  </div>
                ) : botResponse || "Hi! I'm NexaBot. Ask me about the match, who's winning, or for a quick analysis!"}
              </div>
              <div className="relative">
                <input 
                  type="text" 
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNexaBotAsk()}
                  placeholder="e.g. Who is winning?"
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-neon-blue transition-colors"
                />
                <button 
                  onClick={handleNexaBotAsk}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neon-blue hover:text-neon-pink transition-colors"
                >
                  <Zap className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Lists */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass p-6 rounded-2xl border border-dark-border">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="text-neon-blue w-5 h-5" />
            {match.teamA} XI
          </h3>
          <div className="grid gap-2">
            {match.playersA?.map(p => (
              <div key={p.name || p} className="flex items-center justify-between px-3 py-2 bg-dark-bg/50 border border-dark-border rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">
                    {p.name || p}
                    {p.isCaptain && <Crown className="w-3 h-3 inline ml-1 text-yellow-400" />}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">{p.role || 'Batsman'}</span>
              </div>
            ))}
            {(!match.playersA || match.playersA.length === 0) && <p className="text-gray-500 italic text-sm">No players listed.</p>}
          </div>
        </div>
        <div className="glass p-6 rounded-2xl border border-dark-border">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="text-neon-pink w-5 h-5" />
            {match.teamB} XI
          </h3>
          <div className="grid gap-2">
            {match.playersB?.map(p => (
              <div key={p.name || p} className="flex items-center justify-between px-3 py-2 bg-dark-bg/50 border border-dark-border rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-200">
                    {p.name || p}
                    {p.isCaptain && <Crown className="w-3 h-3 inline ml-1 text-yellow-400" />}
                  </span>
                </div>
                <span className="text-[10px] text-gray-500 uppercase font-bold">{p.role || 'Batsman'}</span>
              </div>
            ))}
            {(!match.playersB || match.playersB.length === 0) && <p className="text-gray-500 italic text-sm">No players listed.</p>}
          </div>
        </div>
      </div>

      {/* Ball by ball timeline */}
      <div className="glass rounded-3xl p-6 md:p-8 border border-dark-border">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <CirclePlay className="text-neon-blue w-6 h-6" />
          Ball-by-Ball Commentary
        </h3>
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-neon-blue before:to-transparent">
          {balls.map((ball, idx) => (
            <motion.div
              key={ball.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 border-dark-bg z-10 font-bold text-dark-bg shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${
                ball.isWicket ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                ball.runs >= 4 ? 'bg-neon-pink shadow-[0_0_15px_rgba(255,0,234,0.5)]' :
                'bg-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.5)]'
              }`}>
                {ball.isWicket ? 'W' : ball.runs}
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] glass p-4 rounded-xl border border-dark-border group-hover:border-neon-blue/50 transition-colors">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-mono text-neon-blue">Over {ball.over}.{ball.ballNumber}</span>
                  <div className="flex gap-2">
                    {ball.isWicket && <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Wicket</span>}
                    {ball.runs === 4 && <span className="bg-neon-pink/20 text-neon-pink text-[10px] px-2 py-0.5 rounded font-bold uppercase">Four</span>}
                    {ball.runs === 6 && <span className="bg-blue-500/20 text-blue-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Six</span>}
                    {(ball.isWide || ball.isNoBall) && <span className="bg-yellow-500/20 text-yellow-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Extra</span>}
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{ball.commentary}</p>
                {ball.batsman && (
                  <div className="mt-2 text-[10px] text-gray-500 font-medium">
                    {ball.batsman} {ball.nonStriker && `& ${ball.nonStriker}`} 🏏 {ball.bowler}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {balls.length === 0 && <p className="text-center text-gray-500 py-4 italic">No commentary available yet.</p>}
        </div>
      </div>
    </div>
  );
};
