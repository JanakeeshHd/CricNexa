import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Save, Activity, Sparkles, Mic, MicOff, UserPlus, X, Crown, ArrowLeftRight, Settings, RotateCcw } from 'lucide-react';
import { generateBallCommentary } from '../../utils/aiService';

export const AdminEditMatch = () => {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Ball states
  const [runs, setRuns] = useState(0);
  const [isWicket, setIsWicket] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [isNoBall, setIsNoBall] = useState(false);
  const [batsman, setBatsman] = useState('');
  const [nonStriker, setNonStriker] = useState('');
  const [bowler, setBowler] = useState('');
  
  // Players edit state
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('Batsman');
  const [addingToTeam, setAddingToTeam] = useState('A');

  // Match metadata edit state
  const [editMatchName, setEditMatchName] = useState('');
  const [editTotalOvers, setEditTotalOvers] = useState(20);

  useEffect(() => {
    if (!isAdmin) navigate('/admin/login');
  }, [isAdmin, navigate]);

  useEffect(() => {
    const fetchMatch = async () => {
      if (!id) return;
      const docRef = doc(db, 'matches', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.id ? { id: docSnap.id, ...docSnap.data() } : docSnap.data();
        // Convert old string arrays to objects if necessary
        if (data.playersA?.length > 0 && typeof data.playersA[0] === 'string') {
          data.playersA = data.playersA.map(name => ({ name, role: 'Batsman', isCaptain: false }));
        }
        if (data.playersB?.length > 0 && typeof data.playersB[0] === 'string') {
          data.playersB = data.playersB.map(name => ({ name, role: 'Batsman', isCaptain: false }));
        }
        setMatch(data);
        setEditMatchName(data.matchName || `${data.teamA} vs ${data.teamB}`);
        setEditTotalOvers(data.totalOvers || 20);
      }
      setLoading(false);
    };
    fetchMatch();
  }, [id]);

  const updateMatchDetails = async () => {
    try {
      await updateDoc(doc(db, 'matches', id), {
        matchName: editMatchName,
        totalOvers: Number(editTotalOvers)
      });
      setMatch({ ...match, matchName: editMatchName, totalOvers: Number(editTotalOvers) });
      alert('Match details updated!');
    } catch (e) {
      console.error(e);
      alert('Failed to update match details');
    }
  };

  const addPlayer = async () => {
    if (!newPlayerName.trim()) return;
    const teamKey = addingToTeam === 'A' ? 'playersA' : 'playersB';
    const newPlayer = {
      name: newPlayerName.trim(),
      role: newPlayerRole,
      isCaptain: false
    };
    const updatedPlayers = [...(match[teamKey] || []), newPlayer];
    
    try {
      await updateDoc(doc(db, 'matches', id), { [teamKey]: updatedPlayers });
      setMatch({ ...match, [teamKey]: updatedPlayers });
      setNewPlayerName('');
    } catch (e) {
      console.error(e);
    }
  };

  const removePlayer = async (team, name) => {
    const teamKey = team === 'A' ? 'playersA' : 'playersB';
    const updatedPlayers = match[teamKey].filter(p => p.name !== name);
    
    try {
      await updateDoc(doc(db, 'matches', id), { [teamKey]: updatedPlayers });
      setMatch({ ...match, [teamKey]: updatedPlayers });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCaptain = async (team, name) => {
    const teamKey = team === 'A' ? 'playersA' : 'playersB';
    const updatedPlayers = match[teamKey].map(p => ({
      ...p,
      isCaptain: p.name === name ? !p.isCaptain : false // Only one captain per team
    }));
    
    try {
      await updateDoc(doc(db, 'matches', id), { [teamKey]: updatedPlayers });
      setMatch({ ...match, [teamKey]: updatedPlayers });
    } catch (e) {
      console.error(e);
    }
  };

  const swapBatsmen = () => {
    const temp = batsman;
    setBatsman(nonStriker);
    setNonStriker(temp);
  };

  const undoLastBall = async () => {
    if (!window.confirm('Are you sure you want to undo the last ball?')) return;
    
    try {
      const ballsRef = collection(db, `matches/${id}/balls`);
      const q = query(ballsRef, orderBy('timestamp', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        alert('No balls to undo!');
        return;
      }

      const lastBallDoc = snapshot.docs[0];
      const lastBallData = lastBallDoc.data();
      
      const currentTeamScoreKey = match.currentInnings === 1 ? 'scoreA' : 'scoreB';
      const currentScore = match[currentTeamScoreKey];
      
      let runsToSubtract = lastBallData.runs;
      if (lastBallData.isWide || lastBallData.isNoBall) runsToSubtract += 1;
      
      const newRuns = Math.max(0, currentScore.runs - runsToSubtract);
      const newWickets = Math.max(0, currentScore.wickets - (lastBallData.isWicket ? 1 : 0));
      
      // Overs reverse logic
      let newOvers = currentScore.overs;
      if (!lastBallData.isWide && !lastBallData.isNoBall) {
        let ballsInOver = Math.round((newOvers % 1) * 10);
        let completedOvers = Math.floor(newOvers);
        
        ballsInOver -= 1;
        if (ballsInOver < 0) {
          completedOvers = Math.max(0, completedOvers - 1);
          ballsInOver = 5;
        }
        newOvers = completedOvers + (ballsInOver / 10);
      }

      const matchRef = doc(db, 'matches', id);
      await updateDoc(matchRef, {
        [currentTeamScoreKey]: {
          runs: newRuns,
          wickets: newWickets,
          overs: newOvers
        }
      });

      await deleteDoc(lastBallDoc.ref);
      
      setMatch(prev => ({
        ...prev,
        [currentTeamScoreKey]: { runs: newRuns, wickets: newWickets, overs: newOvers }
      }));

      alert('Last ball undone successfully!');
    } catch (error) {
      console.error('Error undoing ball:', error);
      alert('Failed to undo ball.');
    }
  };

  const handleUpdateBall = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!match) return;

    setAiGenerating(true);
    const ballDetails = { runs: Number(runs), isWicket, isWide, isNoBall, batsman, nonStriker, bowler };
    const commentary = await generateBallCommentary(match, ballDetails);
    setAiGenerating(false);
    
    const currentTeamScoreKey = match.currentInnings === 1 ? 'scoreA' : 'scoreB';
    const currentScore = match[currentTeamScoreKey];
    
    let addedRuns = Number(runs);
    if (isWide || isNoBall) addedRuns += 1;
    
    const newRuns = currentScore.runs + addedRuns;
    const newWickets = currentScore.wickets + (isWicket ? 1 : 0);
    
    let newOvers = currentScore.overs;
    let ballsInOver = Math.round((newOvers % 1) * 10);
    let completedOvers = Math.floor(newOvers);

    if (!isWide && !isNoBall) {
      ballsInOver += 1;
      if (ballsInOver === 6) {
        completedOvers += 1;
        ballsInOver = 0;
      }
    }
    newOvers = completedOvers + (ballsInOver / 10);

    const matchRef = doc(db, 'matches', id);
    
    try {
      await updateDoc(matchRef, {
        [currentTeamScoreKey]: {
          runs: newRuns,
          wickets: newWickets,
          overs: newOvers
        }
      });

      // Notification Logic (Spark Plan Friendly)
      let notification = null;
      const matchName = match.matchName || `${match.teamA} vs ${match.teamB}`;
      
      if (isWicket) {
        notification = {
          title: "⚡ WICKET!",
          body: `A wicket has fallen in ${matchName}! Score: ${newRuns}/${newWickets} (${newOvers})`,
          timestamp: serverTimestamp()
        };
      } else if (newRuns >= 100 && currentScore.runs < 100) {
        notification = {
          title: "🔥 100 RUNS!",
          body: `${match.currentInnings === 1 ? match.teamA : match.teamB} reached 100 runs in ${matchName}!`,
          timestamp: serverTimestamp()
        };
      } else if (newRuns >= 50 && currentScore.runs < 50) {
        notification = {
          title: "🚀 50 RUNS!",
          body: `${match.currentInnings === 1 ? match.teamA : match.teamB} crossed 50 runs!`,
          timestamp: serverTimestamp()
        };
      }

      if (notification) {
        await addDoc(collection(db, 'notifications'), notification);
      }

      await addDoc(collection(db, `matches/${id}/balls`), {
        runs: Number(runs),
        isWicket,
        isWide,
        isNoBall,
        batsman,
        nonStriker,
        bowler,
        commentary,
        over: completedOvers,
        ballNumber: ballsInOver || 6,
        timestamp: serverTimestamp()
      });

      setRuns(0);
      setIsWicket(false);
      setIsWide(false);
      setIsNoBall(false);
      // We do not clear batsman, nonStriker, and bowler here because they stay on the pitch for the next ball
      
      setMatch(prev => ({
        ...prev,
        [currentTeamScoreKey]: { runs: newRuns, wickets: newWickets, overs: newOvers }
      }));

    } catch (error) {
      console.error('Error updating match:', error);
      alert('Failed to update score.');
    }
  }, [match, runs, isWicket, isWide, isNoBall, batsman, bowler, id]);

  // Voice Input Logic
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return;

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log('Voice Command:', transcript);

      if (transcript.includes('one') || transcript.includes('1')) setRuns(1);
      else if (transcript.includes('two') || transcript.includes('2')) setRuns(2);
      else if (transcript.includes('three') || transcript.includes('3')) setRuns(3);
      else if (transcript.includes('four') || transcript.includes('4')) setRuns(4);
      else if (transcript.includes('six') || transcript.includes('6')) setRuns(6);
      else if (transcript.includes('zero') || transcript.includes('dot')) setRuns(0);
      
      if (transcript.includes('wicket')) setIsWicket(true);
      if (transcript.includes('wide')) setIsWide(true);
      if (transcript.includes('no ball')) setIsNoBall(true);
      
      if (transcript.includes('save') || transcript.includes('update')) {
        handleUpdateBall();
      }
    };

    if (isListening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => recognition.stop();
  }, [isListening, handleUpdateBall]);

  const endInnings = async () => {
    const matchName = match.matchName || `${match.teamA} vs ${match.teamB}`;
    
    if (match.currentInnings === 1) {
      await updateDoc(doc(db, 'matches', id), { currentInnings: 2 });
      await addDoc(collection(db, 'notifications'), {
        title: "🏏 INNINGS ENDED",
        body: `1st Innings ended in ${matchName}. Score: ${match.scoreA.runs}/${match.scoreA.wickets}`,
        timestamp: serverTimestamp()
      });
      setMatch({ ...match, currentInnings: 2 });
      alert('Innings 1 ended. Starting Innings 2.');
    } else {
      const winner = match.scoreA.runs > match.scoreB.runs ? match.teamA : match.teamB;
      await updateDoc(doc(db, 'matches', id), { status: 'completed', winner });
      await addDoc(collection(db, 'notifications'), {
        title: "🏆 MATCH COMPLETED",
        body: `${matchName} ended. ${winner} won the match!`,
        timestamp: serverTimestamp()
      });
      setMatch({ ...match, status: 'completed', winner });
      alert('Match completed!');
      navigate('/admin');
    }
  };

  if (loading) return <div className="flex justify-center mt-20"><Activity className="w-12 h-12 text-neon-blue animate-pulse" /></div>;
  if (!match) return <div>Match not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-center mb-8 border-b border-dark-border pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="text-neon-pink w-8 h-8" />
            Edit Match
          </h1>
          <p className="text-gray-400 mt-2">{match.teamA} vs {match.teamB}</p>
        </div>
        <button 
          onClick={() => setIsListening(!isListening)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
            isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-dark-border text-gray-400 hover:text-white'
          }`}
        >
          {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          {isListening ? 'Listening...' : 'Voice Input'}
        </button>
      </header>


      <div className="grid grid-cols-2 gap-6 text-center">
        <div className={`glass p-6 rounded-2xl border ${match.currentInnings === 1 ? 'border-neon-blue' : 'border-dark-border'}`}>
          <h2 className="text-2xl font-bold">{match.teamA}</h2>
          <div className="text-4xl font-mono text-neon-blue mt-2">
            {match.scoreA.runs}/{match.scoreA.wickets} <span className="text-xl text-gray-400">({match.scoreA.overs})</span>
          </div>
          {match.currentInnings === 1 && <span className="text-xs text-neon-blue font-bold uppercase mt-2 block">Batting</span>}
        </div>
        <div className={`glass p-6 rounded-2xl border ${match.currentInnings === 2 ? 'border-neon-pink' : 'border-dark-border'}`}>
          <h2 className="text-2xl font-bold">{match.teamB}</h2>
          <div className="text-4xl font-mono text-neon-pink mt-2">
            {match.scoreB.runs}/{match.scoreB.wickets} <span className="text-xl text-gray-400">({match.scoreB.overs})</span>
          </div>
          {match.currentInnings === 2 && <span className="text-xs text-neon-pink font-bold uppercase mt-2 block">Batting</span>}
        </div>
      </div>

      {/* Match Details Settings */}
      <div className="glass p-6 rounded-3xl border border-dark-border">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Settings className="text-neon-blue w-5 h-5" />
          Edit Match Details
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Match Name</label>
            <input 
              type="text" 
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-white focus:border-neon-blue outline-none"
              value={editMatchName}
              onChange={(e) => setEditMatchName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Overs</label>
            <input 
              type="number" 
              className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-white focus:border-neon-blue outline-none"
              value={editTotalOvers}
              onChange={(e) => setEditTotalOvers(e.target.value)}
            />
          </div>
          <button 
            onClick={updateMatchDetails}
            className="md:col-span-3 bg-dark-border hover:bg-neon-blue hover:text-dark-bg text-white font-bold py-2 rounded-xl transition-all"
          >
            Update Match Info
          </button>
        </div>
      </div>

      {/* Player Management */}
      <div className="glass p-6 rounded-3xl border border-dark-border">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <UserPlus className="text-neon-blue w-5 h-5" />
          Manage Team Players
        </h3>
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <select 
            value={addingToTeam} 
            onChange={(e) => setAddingToTeam(e.target.value)}
            className="bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-white focus:border-neon-blue outline-none"
          >
            <option value="A">{match.teamA}</option>
            <option value="B">{match.teamB}</option>
          </select>
          <input 
            type="text" 
            placeholder="Player Name"
            className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-white focus:border-neon-blue outline-none"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          />
          <select 
            value={newPlayerRole} 
            onChange={(e) => setNewPlayerRole(e.target.value)}
            className="bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-white focus:border-neon-blue outline-none"
          >
            <option value="Batsman">Batsman</option>
            <option value="Bowler">Bowler</option>
            <option value="All-rounder">All-rounder</option>
            <option value="Wicketkeeper">Wicketkeeper</option>
          </select>
          <button 
            onClick={addPlayer}
            className="bg-neon-blue text-dark-bg font-bold px-8 py-2 rounded-xl hover:shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all"
          >
            Add Player
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="grid gap-2">
              {match.playersA?.map(p => (
                <div key={p.name} className="flex items-center justify-between p-3 bg-dark-bg/50 border border-dark-border rounded-xl group hover:border-neon-blue/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleCaptain('A', p.name)}
                      className={`p-1.5 rounded-lg transition-colors ${p.isCaptain ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-600 hover:text-yellow-400'}`}
                    >
                      <Crown className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {p.name}
                        {p.isCaptain && <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold uppercase">Capt</span>}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold">{p.role}</div>
                    </div>
                  </div>
                  <button onClick={() => removePlayer('A', p.name)} className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid gap-2">
              {match.playersB?.map(p => (
                <div key={p.name} className="flex items-center justify-between p-3 bg-dark-bg/50 border border-dark-border rounded-xl group hover:border-neon-pink/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => toggleCaptain('B', p.name)}
                      className={`p-1.5 rounded-lg transition-colors ${p.isCaptain ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-600 hover:text-yellow-400'}`}
                    >
                      <Crown className="w-4 h-4" />
                    </button>
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {p.name}
                        {p.isCaptain && <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded font-bold uppercase">Capt</span>}
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold">{p.role}</div>
                    </div>
                  </div>
                  <button onClick={() => removePlayer('B', p.name)} className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-8 rounded-3xl border border-neon-blue/30 relative">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          Update Ball Details
          {aiGenerating && <Sparkles className="w-5 h-5 text-neon-blue animate-pulse" />}
        </h3>
        <form onSubmit={handleUpdateBall} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Runs</label>
              <input
                type="number"
                min="0" max="6"
                required
                className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue"
                value={runs}
                onChange={(e) => setRuns(e.target.value)}
              />
            </div>
            <div className="flex gap-4 items-end">
              <label className="flex items-center gap-2 cursor-pointer bg-dark-bg p-3 rounded-xl border border-dark-border flex-1">
                <input type="checkbox" className="accent-red-500 w-5 h-5" checked={isWicket} onChange={(e) => setIsWicket(e.target.checked)} />
                <span className="font-bold text-red-400">Wicket</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-dark-bg p-3 rounded-xl border border-dark-border flex-1">
                <input type="checkbox" className="accent-yellow-500 w-5 h-5" checked={isWide} onChange={(e) => setIsWide(e.target.checked)} />
                <span className="font-bold text-yellow-400">Wide</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer bg-dark-bg p-3 rounded-xl border border-dark-border flex-1">
                <input type="checkbox" className="accent-orange-500 w-5 h-5" checked={isNoBall} onChange={(e) => setIsNoBall(e.target.checked)} />
                <span className="font-bold text-orange-400">No Ball</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr,1fr] gap-4 items-start">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Striker</label>
              <div className="relative">
                <select
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue appearance-none outline-none"
                  value={batsman}
                  onChange={(e) => setBatsman(e.target.value)}
                >
                  <option value="">Select Batsman</option>
                  {(match.currentInnings === 1 ? match.playersA : match.playersB)?.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.role})</option>
                  ))}
                  <option value="custom">Other (Type below)</option>
                </select>
                {batsman === 'custom' && (
                  <input
                    type="text"
                    className="mt-2 w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none"
                    onChange={(e) => setBatsman(e.target.value)}
                    placeholder="Enter Batsman Name"
                  />
                )}
              </div>
            </div>

            <div className="flex items-center justify-center pt-8">
              <button
                type="button"
                onClick={swapBatsmen}
                className="p-2 bg-dark-bg border border-dark-border rounded-full hover:border-neon-blue hover:text-neon-blue transition-all"
                title="Swap Striker & Non-Striker"
              >
                <ArrowLeftRight className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Non-Striker</label>
              <div className="relative">
                <select
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue appearance-none outline-none"
                  value={nonStriker}
                  onChange={(e) => setNonStriker(e.target.value)}
                >
                  <option value="">Select Non-Striker</option>
                  {(match.currentInnings === 1 ? match.playersA : match.playersB)?.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.role})</option>
                  ))}
                  <option value="custom">Other (Type below)</option>
                </select>
                {nonStriker === 'custom' && (
                  <input
                    type="text"
                    className="mt-2 w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue outline-none"
                    onChange={(e) => setNonStriker(e.target.value)}
                    placeholder="Enter Non-Striker Name"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Bowler</label>
              <div className="relative">
                <select
                  className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-pink focus:ring-1 focus:ring-neon-pink appearance-none outline-none"
                  value={bowler}
                  onChange={(e) => setBowler(e.target.value)}
                >
                  <option value="">Select Bowler</option>
                  {(match.currentInnings === 1 ? match.playersB : match.playersA)?.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.role})</option>
                  ))}
                  <option value="custom">Other (Type below)</option>
                </select>
                {bowler === 'custom' && (
                  <input
                    type="text"
                    className="mt-2 w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-pink focus:ring-1 focus:ring-neon-pink outline-none"
                    onChange={(e) => setBowler(e.target.value)}
                    placeholder="Enter Bowler Name"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              type="submit"
              disabled={aiGenerating}
              className="flex-1 bg-gradient-to-r from-neon-blue to-blue-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:shadow-[0_0_20px_rgba(0,243,255,0.4)] transition-all disabled:opacity-50"
            >
              {aiGenerating ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" /> Generating AI Commentary...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Save Ball Update
                </>
              )}
            </button>

            <button
              type="button"
              onClick={undoLastBall}
              className="px-6 bg-red-500/10 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl flex justify-center items-center gap-2 hover:bg-red-500/20 transition-all"
            >
              <RotateCcw className="w-5 h-5" /> Undo Last
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-dark-border text-center">
          <button
            onClick={endInnings}
            className="bg-red-500/20 text-red-500 border border-red-500/50 font-bold py-3 px-8 rounded-xl hover:bg-red-500/30 transition-all"
          >
            {match.currentInnings === 1 ? 'End 1st Innings' : 'End Match'}
          </button>
        </div>
      </div>
    </div>
  );
};
