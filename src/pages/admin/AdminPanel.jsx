import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, Edit3, Trash2, ShieldAlert, UserPlus, X, Crown, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [matchName, setMatchName] = useState('');
  const [totalOvers, setTotalOvers] = useState(20);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  
  // New player states
  const [playersA, setPlayersA] = useState([]);
  const [playersB, setPlayersB] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('Batsman');
  const [addingToTeam, setAddingToTeam] = useState('A');

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Analytics Data
  const analyticsData = useMemo(() => {
    if (matches.length === 0) return null;
    
    const completed = matches.filter(m => m.status === 'completed');
    const live = matches.filter(m => m.status === 'live');
    
    const teamWins = {};
    completed.forEach(m => {
      if (m.winner) teamWins[m.winner] = (teamWins[m.winner] || 0) + 1;
    });

    const winChartData = Object.entries(teamWins).map(([name, value]) => ({ name, value }));
    const matchStatusData = [
      { name: 'Completed', value: completed.length },
      { name: 'Live', value: live.length }
    ];

    return { completed, live, winChartData, matchStatusData };
  }, [matches]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const addPlayerToList = () => {
    if (!newPlayerName.trim()) return;
    const player = {
      name: newPlayerName.trim(),
      role: newPlayerRole,
      isCaptain: false
    };
    
    if (addingToTeam === 'A') {
      setPlayersA([...playersA, player]);
    } else {
      setPlayersB([...playersB, player]);
    }
    setNewPlayerName('');
  };

  const removePlayerFromList = (team, name) => {
    if (team === 'A') {
      setPlayersA(playersA.filter(p => p.name !== name));
    } else {
      setPlayersB(playersB.filter(p => p.name !== name));
    }
  };

  const toggleCaptainInList = (team, name) => {
    if (team === 'A') {
      setPlayersA(playersA.map(p => ({
        ...p,
        isCaptain: p.name === name ? !p.isCaptain : false
      })));
    } else {
      setPlayersB(playersB.map(p => ({
        ...p,
        isCaptain: p.name === name ? !p.isCaptain : false
      })));
    }
  };

  const createMatch = async (e) => {
    e.preventDefault();
    if (!teamA || !teamB) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'matches'), {
        matchName: matchName || `${teamA} vs ${teamB}`,
        totalOvers: Number(totalOvers),
        teamA,
        teamB,
        playersA,
        playersB,
        scoreA: { runs: 0, wickets: 0, overs: 0 },
        scoreB: { runs: 0, wickets: 0, overs: 0 },
        status: 'live',
        currentInnings: 1,
        createdAt: serverTimestamp()
      });
      setMatchName('');
      setTotalOvers(20);
      setTeamA('');
      setTeamB('');
      setPlayersA([]);
      setPlayersB([]);
    } catch (error) {
      console.error("Error creating match", error);
    }
    setLoading(false);
  };

  const deleteMatch = async (id) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      await deleteDoc(doc(db, 'matches', id));
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-center mb-8 border-b border-dark-border pb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="text-neon-pink w-8 h-8" />
            Admin Dashboard
          </h1>
          <p className="text-gray-400 mt-2">Manage live matches and update scores</p>
        </div>
      </header>

      {/* NexaAnalytics Dashboard */}
      {analyticsData && (
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="glass p-6 rounded-2xl border border-neon-blue/20">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-neon-blue" /> Match Overview
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analyticsData.matchStatusData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#00f3ff" />
                    <Cell fill="#ff00ea" />
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #1f1f23', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs mt-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-neon-blue rounded-full"></span> Live</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-neon-pink rounded-full"></span> Completed</span>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-neon-pink/20 md:col-span-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-neon-pink" /> Win Leaderboard
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.winChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0a0a0f', border: '1px solid #1f1f23', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" fill="#ff00ea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="glass p-8 rounded-2xl border border-dark-border shadow-[0_0_20px_rgba(255,0,234,0.1)]">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <PlusCircle className="text-neon-blue" /> Create New Match
        </h2>
        <form onSubmit={createMatch} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-400 mb-2">Match Name</label>
            <input
              type="text"
              className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-colors"
              value={matchName}
              onChange={(e) => setMatchName(e.target.value)}
              placeholder="e.g. T20 World Cup Final"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Total Overs</label>
            <input
              type="number"
              required
              min="1"
              max="100"
              className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-colors"
              value={totalOvers}
              onChange={(e) => setTotalOvers(e.target.value)}
            />
          </div>
          <div className="hidden md:block"></div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Team A</label>
            <input
              type="text"
              required
              className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-blue focus:ring-1 focus:ring-neon-blue transition-colors"
              value={teamA}
              onChange={(e) => setTeamA(e.target.value)}
              placeholder="e.g. India"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Team B</label>
            <input
              type="text"
              required
              className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-4 text-white focus:border-neon-pink focus:ring-1 focus:ring-neon-pink transition-colors"
              value={teamB}
              onChange={(e) => setTeamB(e.target.value)}
              placeholder="e.g. Australia"
            />
          </div>

          <div className="md:col-span-2 glass p-6 rounded-2xl border border-dark-border space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="text-neon-blue w-5 h-5" />
              Add Players to Squads
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <select 
                value={addingToTeam} 
                onChange={(e) => setAddingToTeam(e.target.value)}
                className="bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-white focus:border-neon-blue outline-none"
              >
                <option value="A">{teamA || 'Team A'}</option>
                <option value="B">{teamB || 'Team B'}</option>
              </select>
              <input 
                type="text" 
                placeholder="Player Name"
                className="flex-1 bg-dark-bg border border-dark-border rounded-xl px-4 py-2 text-white focus:border-neon-blue outline-none"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPlayerToList())}
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
                type="button"
                onClick={addPlayerToList}
                className="bg-neon-blue text-dark-bg font-bold px-8 py-2 rounded-xl hover:shadow-[0_0_15px_rgba(0,243,255,0.4)] transition-all"
              >
                Add
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Team A List */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-neon-blue uppercase tracking-wider">{teamA || 'Team A'} Squad ({playersA.length})</h4>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {playersA.map(p => (
                    <div key={p.name} className="flex items-center justify-between p-3 bg-dark-bg/50 border border-dark-border rounded-xl group hover:border-neon-blue/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => toggleCaptainInList('A', p.name)}
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
                      <button type="button" onClick={() => removePlayerFromList('A', p.name)} className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team B List */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-neon-pink uppercase tracking-wider">{teamB || 'Team B'} Squad ({playersB.length})</h4>
                <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {playersB.map(p => (
                    <div key={p.name} className="flex items-center justify-between p-3 bg-dark-bg/50 border border-dark-border rounded-xl group hover:border-neon-pink/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => toggleCaptainInList('B', p.name)}
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
                      <button type="button" onClick={() => removePlayerFromList('B', p.name)} className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || playersA.length === 0 || playersB.length === 0}
            className="md:col-span-2 bg-gradient-to-r from-neon-blue to-neon-pink text-white font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(255,0,234,0.4)] transition-all disabled:opacity-50"
          >
            {loading ? 'Creating...' : playersA.length === 0 || playersB.length === 0 ? 'Add Players to Start' : 'Start Match'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6">Manage Matches</h2>
        <div className="grid gap-6">
          {matches.map(match => (
            <div key={match.id} className="glass p-6 rounded-xl flex justify-between items-center border border-dark-border">
              <div>
                <h3 className="text-xl font-bold mb-2">{match.teamA} vs {match.teamB}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${match.status === 'live' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {match.status.toUpperCase()}
                </span>
              </div>
              <div className="flex gap-4">
                <Link to={`/admin/match/${match.id}`} className="p-3 bg-neon-blue/20 text-neon-blue rounded-lg hover:bg-neon-blue/30 transition-colors flex items-center gap-2">
                  <Edit3 className="w-5 h-5" /> Edit Score
                </Link>
                <button onClick={() => deleteMatch(match.id)} className="p-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {matches.length === 0 && (
            <p className="text-gray-500 text-center py-8 glass rounded-xl border border-dark-border">No matches created yet.</p>
          )}
        </div>
      </div>

      <footer className="mt-16 text-center text-gray-500 text-xs pb-8 opacity-60 hover:opacity-100 transition-opacity">
        <p>Developed by Janakeesh HD</p>
      </footer>
    </div>
  );
};
