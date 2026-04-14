import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Link } from 'react-router-dom';
import { Activity, Users, Trophy, Search, CircleDot } from 'lucide-react';
import { motion } from 'framer-motion';

export const Dashboard = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchData = [];
      snapshot.forEach((doc) => {
        matchData.push({ id: doc.id, ...doc.data() });
      });
      setMatches(matchData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching matches:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMatches = matches.filter((match) => {
    const searchMatch = 
      match.teamA?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      match.teamB?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.matchName?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = filterStatus === 'all' ? true : match.status === filterStatus;
    return searchMatch && statusMatch;
  });

  const MatchSkeleton = () => (
    <div className="glass p-6 rounded-2xl border-neon-blue/20 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="w-20 h-6 bg-dark-border rounded-full"></div>
        <div className="w-4 h-4 bg-dark-border rounded-full"></div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="w-24 h-6 bg-dark-border rounded"></div>
          <div className="w-16 h-6 bg-dark-border rounded"></div>
        </div>
        <div className="flex justify-between items-center">
          <div className="w-24 h-6 bg-dark-border rounded"></div>
          <div className="w-16 h-6 bg-dark-border rounded"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          Live <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink">Cricket Scores</span>
        </h1>
        <p className="text-gray-400 text-lg">Real-time updates, AI commentary, and match predictions on CricNexa.</p>
      </header>

      {/* Advanced Features: Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center glass p-4 rounded-2xl border border-dark-border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Search teams or match..." 
            className="w-full bg-dark-bg/50 border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-neon-blue transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          <button 
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === 'all' ? 'bg-neon-blue text-black' : 'bg-dark-bg/50 text-gray-400 border border-dark-border hover:text-white'}`}
          >
            All Matches ({matches.length})
          </button>
          <button 
            onClick={() => setFilterStatus('live')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${filterStatus === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-dark-bg/50 text-gray-400 border border-dark-border hover:text-white'}`}
          >
            <CircleDot className={`w-4 h-4 ${filterStatus === 'live' ? 'animate-pulse' : ''}`} /> Live ({matches.filter(m => m.status === 'live').length})
          </button>
          <button 
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${filterStatus === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-dark-bg/50 text-gray-400 border border-dark-border hover:text-white'}`}
          >
            Completed ({matches.filter(m => m.status === 'completed').length})
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          [...Array(6)].map((_, i) => <MatchSkeleton key={i} />)
        ) : (
          filteredMatches.map((match) => (
          <motion.div
            key={match.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link to={`/match/${match.id}`} className="block">
              <div className="glass p-6 rounded-2xl hover:bg-dark-border transition-colors border-neon-blue/20 shadow-[0_0_15px_rgba(0,243,255,0.1)]">
                <div className="flex justify-between items-center mb-4">
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    match.status === 'live' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                    match.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                    'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                  }`}>
                    {match.status.toUpperCase()}
                  </span>
                  <Activity className="w-4 h-4 text-neon-blue" />
                </div>
                
                <div className="space-y-4">
                  <div className={`flex justify-between items-center ${match.currentInnings === 1 && match.status === 'live' ? 'text-neon-blue' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className="font-bold text-lg">{match.teamA}</span>
                    </div>
                    <span className="font-mono text-xl">{match.scoreA?.runs}/{match.scoreA?.wickets} <span className="text-sm opacity-60">({match.scoreA?.overs})</span></span>
                  </div>
                  <div className={`flex justify-between items-center ${match.currentInnings === 2 && match.status === 'live' ? 'text-neon-pink' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      <span className="font-bold text-lg">{match.teamB}</span>
                    </div>
                    <span className="font-mono text-xl">{match.scoreB?.runs}/{match.scoreB?.wickets} <span className="text-sm opacity-60">({match.scoreB?.overs})</span></span>
                  </div>
                </div>

                {match.status === 'completed' && match.winner && (
                  <div className="mt-4 pt-4 border-t border-dark-border flex items-center gap-2 text-neon-pink">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-medium">{match.winner} won the match</span>
                  </div>
                )}
              </div>
            </Link>
          </motion.div>
        )))}

        {filteredMatches.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 glass rounded-2xl">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No matches found matching your criteria.</p>
          </div>
        )}
      </div>

      <footer className="mt-16 text-center text-gray-500 text-xs pb-8 opacity-60 hover:opacity-100 transition-opacity">
        <p>Developed by Janakeesh HD</p>
      </footer>
    </div>
  );
};
