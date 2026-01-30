import React, { useState, useMemo } from 'react';
import { Users, Trophy, Shuffle, Plus, Edit2, Trash2, Check, X, BarChart3, Zap, Brain } from 'lucide-react';

// ============================================
// TIER SYSTEM CONFIGURATION
// ============================================
const TIER_CONFIG = {
  S: { value: 5, label: 'S - Pro', color: '#FFD700', bgColor: '#FFF9E6' },
  A: { value: 4, label: 'A - Advanced', color: '#C0C0C0', bgColor: '#F7FAFC' },
  B: { value: 3, label: 'B - Intermediate', color: '#CD7F32', bgColor: '#FFF5E6' },
  C: { value: 2, label: 'C - Beginner', color: '#4A5568', bgColor: '#EDF2F7' },
  D: { value: 1, label: 'D - Novice', color: '#2D3748', bgColor: '#E2E8F0' }
};

const TIER_OPTIONS = Object.keys(TIER_CONFIG);

// ============================================
// UTILITY FUNCTIONS
// ============================================
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// Calculate team tier sum
const calculateTeamTier = (members) => {
  // Đảm bảo members là mảng trước khi gọi reduce
  if (!Array.isArray(members)) {
    return 0;
  }
  return members.reduce((sum, member) => sum + TIER_CONFIG[member.tier].value, 0);
};

// Calculate tier variance for fairness measurement
const calculateTierVariance = (teams) => {
  // Truyền team.members vào calculateTeamTier thay vì toàn bộ team object
  const tierSums = teams.map(team => calculateTeamTier(team.members));
  const mean = tierSums.reduce((a, b) => a + b, 0) / tierSums.length;
  const variance = tierSums.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / tierSums.length;
  return Math.sqrt(variance); // Standard deviation
};

// ============================================
// PAIRING ALGORITHMS
// ============================================

// Algorithm 1: Greedy Pairing (High + Low)
const greedyPairing = (players) => {
  const sorted = [...players].sort((a, b) => 
    TIER_CONFIG[b.tier].value - TIER_CONFIG[a.tier].value
  );
  
  const teams = [];
  const used = new Set();
  
  for (let i = 0; i < sorted.length; i++) {
    if (used.has(sorted[i].id)) continue;
    
    // Find best complement (lowest tier not yet used)
    let bestMatch = null;
    for (let j = sorted.length - 1; j > i; j--) {
      if (!used.has(sorted[j].id)) {
        bestMatch = sorted[j];
        break;
      }
    }
    
    if (bestMatch) {
      teams.push({
        id: generateId(),
        members: [sorted[i], bestMatch]
      });
      used.add(sorted[i].id);
      used.add(bestMatch.id);
    } else {
      // Odd player out
      teams.push({
        id: generateId(),
        members: [sorted[i]]
      });
      used.add(sorted[i].id);
    }
  }
  
  return teams;
};

// Algorithm 2: Optimal Pairing (Minimize variance)
const optimalPairing = (players) => {
  if (players.length < 2) return [];
  
  // For small sets, try all combinations
  if (players.length <= 8) {
    return greedyPairing(players); // Fallback for now
  }
  
  // For larger sets, use greedy with optimization
  const sorted = [...players].sort((a, b) => 
    TIER_CONFIG[b.tier].value - TIER_CONFIG[a.tier].value
  );
  
  const teams = [];
  const remaining = [...sorted];
  const targetSum = Math.round(
    sorted.reduce((sum, p) => sum + TIER_CONFIG[p.tier].value, 0) / (sorted.length / 2)
  );
  
  while (remaining.length >= 2) {
    const first = remaining.shift();
    
    // Find player that brings us closest to target
    let bestIdx = 0;
    let bestDiff = Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const sum = TIER_CONFIG[first.tier].value + TIER_CONFIG[remaining[i].tier].value;
      const diff = Math.abs(sum - targetSum);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = i;
      }
    }
    
    const second = remaining.splice(bestIdx, 1)[0];
    teams.push({
      id: generateId(),
      members: [first, second]
    });
  }
  
  // Handle odd player
  if (remaining.length > 0) {
    teams.push({
      id: generateId(),
      members: [remaining[0]]
    });
  }
  
  return teams;
};

// Algorithm 3: Balanced Match Pairing
const balancedMatchPairing = (teams) => {
  const validTeams = teams.filter(t => t.members.length === 2);
  if (validTeams.length < 2) return [];
  
  // Sort by tier sum
  const sorted = [...validTeams].sort((a, b) => 
    calculateTeamTier(a.members) - calculateTeamTier(b.members)
  );
  
  const matches = [];
  
  // Strategy: Pair adjacent teams in sorted list for closest matches
  for (let i = 0; i < sorted.length - 1; i += 2) {
    if (i + 1 < sorted.length) {
      matches.push({
        id: generateId(),
        teamA: sorted[i],
        teamB: sorted[i + 1],
        tierDiff: Math.abs(
          calculateTeamTier(sorted[i].members) - 
          calculateTeamTier(sorted[i + 1].members)
        )
      });
    }
  }
  
  return matches;
};

// ============================================
// TIER BADGE COMPONENT
// ============================================
const TierBadge = ({ tier, showLabel = true, size = 'md' }) => {
  const config = TIER_CONFIG[tier];
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };
  
  return (
    <span 
      className={`tier-badge ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: config.bgColor,
        color: config.color,
        border: `2px solid ${config.color}`
      }}
    >
      <strong>{tier}</strong>
      {showLabel && size !== 'sm' && ` (${TIER_CONFIG[tier].value})`}
    </span>
  );
};

// ============================================
// PLAYER FORM COMPONENT
// ============================================
const PlayerForm = ({ onAddPlayer, editingPlayer, onUpdatePlayer, onCancelEdit }) => {
  const [name, setName] = useState(editingPlayer?.name || '');
  const [tier, setTier] = useState(editingPlayer?.tier || 'B');
  
  React.useEffect(() => {
    if (editingPlayer) {
      setName(editingPlayer.name);
      setTier(editingPlayer.tier);
    }
  }, [editingPlayer]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    if (editingPlayer) {
      onUpdatePlayer(editingPlayer.id, name.trim(), tier);
      onCancelEdit();
    } else {
      onAddPlayer(name.trim(), tier);
    }
    
    setName('');
    setTier('B');
  };
  
  return (
    <form onSubmit={handleSubmit} className="player-form">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tên người chơi..."
        className="input-field"
        autoFocus
      />
      
      <select 
        value={tier} 
        onChange={(e) => setTier(e.target.value)}
        className="tier-select"
      >
        {TIER_OPTIONS.map(t => (
          <option key={t} value={t}>
            {TIER_CONFIG[t].label}
          </option>
        ))}
      </select>
      
      <button type="submit" className="btn btn-primary">
        {editingPlayer ? <Check size={18} /> : <Plus size={18} />}
        {editingPlayer ? 'Cập nhật' : 'Thêm'}
      </button>
      
      {editingPlayer && (
        <button type="button" onClick={onCancelEdit} className="btn btn-outline">
          <X size={18} />
          Hủy
        </button>
      )}
    </form>
  );
};

// ============================================
// PLAYER LIST COMPONENT
// ============================================
const PlayerList = ({ players, onEdit, onDelete }) => {
  // Group by tier for better visualization
  const playersByTier = useMemo(() => {
    const grouped = {};
    TIER_OPTIONS.forEach(tier => {
      grouped[tier] = players.filter(p => p.tier === tier);
    });
    return grouped;
  }, [players]);
  
  const tierStats = useMemo(() => {
    return TIER_OPTIONS.map(tier => ({
      tier,
      count: playersByTier[tier].length,
      totalValue: playersByTier[tier].length * TIER_CONFIG[tier].value
    }));
  }, [playersByTier]);
  
  return (
    <div className="player-list-container">
      <div className="player-stats">
        <h3 className="section-title">
          <BarChart3 size={20} />
          Thống kê tier ({players.length} người)
        </h3>
        <div className="tier-stats-grid">
          {tierStats.map(({ tier, count, totalValue }) => (
            <div key={tier} className="tier-stat-card">
              <TierBadge tier={tier} showLabel={false} size="lg" />
              <div className="tier-stat-info">
                <div className="tier-stat-count">{count} người</div>
                <div className="tier-stat-value">Tổng: {totalValue}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <h3 className="section-title">
        <Users size={20} />
        Danh sách người chơi
      </h3>
      
      {players.length === 0 ? (
        <p className="empty-state">Chưa có người chơi. Hãy thêm người chơi với tier!</p>
      ) : (
        <div className="player-grid">
          {players.map(player => (
            <div key={player.id} className="player-card">
              <div className="player-info">
                <span className="player-name">{player.name}</span>
                <TierBadge tier={player.tier} size="sm" />
              </div>
              <div className="player-actions">
                <button onClick={() => onEdit(player)} className="btn-icon" title="Sửa">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => onDelete(player.id)} className="btn-icon btn-danger" title="Xóa">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// TEAM DISPLAY COMPONENT
// ============================================
const TeamDisplay = ({ teams, algorithm }) => {
  const variance = useMemo(() => calculateTierVariance(teams), [teams]);
  
  const fairnessScore = useMemo(() => {
    if (teams.length < 2) return 100;
    // Convert variance to 0-100 score (lower variance = higher score)
    const maxVariance = 3; // Reasonable max for tier variance
    const score = Math.max(0, 100 - (variance / maxVariance) * 100);
    return Math.round(score);
  }, [variance]);
  
  return (
    <div className="teams-display">
      <div className="teams-header">
        <h3 className="section-title">
          Các đội đã ghép ({teams.length} đội)
        </h3>
        {teams.length > 1 && (
          <div className="fairness-indicator">
            <div className="fairness-label">
              <Trophy size={16} />
              Độ cân bằng:
            </div>
            <div className="fairness-score" style={{
              color: fairnessScore >= 80 ? '#48bb78' : fairnessScore >= 60 ? '#ed8936' : '#e53e3e'
            }}>
              {fairnessScore}/100
            </div>
            <div className="fairness-detail">
              (Độ lệch: {variance.toFixed(2)})
            </div>
          </div>
        )}
      </div>
      
      {teams.length === 0 ? (
        <p className="empty-state">Chưa có đội nào.</p>
      ) : (
        <div className="teams-grid">
          {teams.map((team, idx) => {
            const tierSum = calculateTeamTier(team.members);
            return (
              <div key={team.id} className="team-card-advanced">
                <div className="team-header-advanced">
                  <span>Đội {idx + 1}</span>
                  <div className="team-tier-sum">
                    <Trophy size={14} />
                    {tierSum}
                  </div>
                </div>
                <div className="team-members-advanced">
                  {team.members.map(member => (
                    <div key={member.id} className="team-member-advanced">
                      <span className="member-name">{member.name}</span>
                      <TierBadge tier={member.tier} showLabel={false} size="sm" />
                    </div>
                  ))}
                  {team.members.length === 1 && (
                    <div className="team-member-placeholder">
                      <span style={{ color: '#999', fontSize: '0.9rem' }}>Chờ ghép đôi</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// MATCH LIST COMPONENT
// ============================================
const MatchList = ({ matches }) => {
  return (
    <div className="matches-display">
      <h3 className="section-title">
        Cặp đấu ({matches.length} trận)
      </h3>
      
      {matches.length === 0 ? (
        <p className="empty-state">Chưa có cặp đấu.</p>
      ) : (
        <div className="matches-list">
          {matches.map((match, idx) => {
            const teamATier = calculateTeamTier(match.teamA.members);
            const teamBTier = calculateTeamTier(match.teamB.members);
            const isFair = match.tierDiff <= 1;
            
            return (
              <div key={match.id} className="match-card-advanced">
                <div className="match-header-advanced">
                  <div className="match-number">Trận {idx + 1}</div>
                  <div className={`match-fairness ${isFair ? 'fair' : 'unfair'}`}>
                    {isFair ? '⚖️ Cân bằng' : `⚠️ Chênh lệch ${match.tierDiff}`}
                  </div>
                </div>
                
                <div className="match-content">
                  <div className="match-team-advanced">
                    <div className="team-label-advanced">Đội A</div>
                    <div className="team-tier-indicator" style={{ backgroundColor: '#667eea20', color: '#667eea' }}>
                      <Trophy size={14} />
                      {teamATier}
                    </div>
                    {match.teamA.members.map(m => (
                      <div key={m.id} className="match-player">
                        <span>{m.name}</span>
                        <TierBadge tier={m.tier} showLabel={false} size="sm" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="match-vs-advanced">
                    <div className="vs-text">VS</div>
                    <div className="tier-diff">Δ{match.tierDiff}</div>
                  </div>
                  
                  <div className="match-team-advanced">
                    <div className="team-label-advanced">Đội B</div>
                    <div className="team-tier-indicator" style={{ backgroundColor: '#ed64a620', color: '#ed64a6' }}>
                      <Trophy size={14} />
                      {teamBTier}
                    </div>
                    {match.teamB.members.map(m => (
                      <div key={m.id} className="match-player">
                        <span>{m.name}</span>
                        <TierBadge tier={m.tier} showLabel={false} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
const BilliardsAdvancedApp = () => {
  const [players, setPlayers] = useState([
    { id: generateId(), name: 'King', tier: 'S' },
    { id: generateId(), name: 'Thor', tier: 'B' },
    { id: generateId(), name: 'An thần', tier: 'C' },
    { id: generateId(), name: 'Quý phi', tier: 'C' },
    { id: generateId(), name: 'Đạt 09', tier: 'C' },
    { id: generateId(), name: 'Atus', tier: 'A' },
    { id: generateId(), name: 'Chương', tier: 'B' },
    { id: generateId(), name: 'Thanh', tier: 'A' },
    { id: generateId(), name: 'Lương', tier: 'A' },
    { id: generateId(), name: 'Khương', tier: 'B' },
  ]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [algorithm, setAlgorithm] = useState('greedy');
  const [editingPlayer, setEditingPlayer] = useState(null);
  
  // Add player
  const addPlayer = (name, tier) => {
    setPlayers([...players, { id: generateId(), name, tier }]);
  };
  
  // Update player
  const updatePlayer = (id, name, tier) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name, tier } : p));
    setTeams([]);
    setMatches([]);
  };
  
  // Delete player
  const deletePlayer = (id) => {
    setPlayers(players.filter(p => p.id !== id));
    setTeams([]);
    setMatches([]);
  };
  
  // Create teams with selected algorithm
  const createTeams = () => {
    if (players.length < 2) {
      alert('Cần ít nhất 2 người chơi!');
      return;
    }
    
    let newTeams;
    switch (algorithm) {
      case 'greedy':
        newTeams = greedyPairing(players);
        break;
      case 'optimal':
        newTeams = optimalPairing(players);
        break;
      default:
        newTeams = greedyPairing(players);
    }
    
    setTeams(newTeams);
    setMatches([]);
  };
  
  // Create matches
  const createMatches = () => {
    const validTeams = teams.filter(t => t.members.length === 2);
    if (validTeams.length < 2) {
      alert('Cần ít nhất 2 đội đủ 2 người!');
      return;
    }
    
    const newMatches = balancedMatchPairing(teams);
    setMatches(newMatches);
  };
  
  // Reset all
  const resetAll = () => {
    if (window.confirm('Reset tất cả đội và cặp đấu?')) {
      setTeams([]);
      setMatches([]);
    }
  };
  
  return (
    <div className="app-container">
      <header className="app-header-advanced">
        <div className="header-content">
          <h1 className="app-title">🎱 Advanced Billiards Pairing System</h1>
          <p className="app-subtitle">Hệ thống ghép cặp thông minh với cân bằng tier</p>
        </div>
        <div className="tier-legend">
          {TIER_OPTIONS.map(tier => (
            <TierBadge key={tier} tier={tier} size="sm" />
          ))}
        </div>
      </header>
      
      <div className="app-content">
        {/* PLAYER MANAGEMENT */}
        <section className="section">
          <h2 className="section-heading">
            <Users size={24} />
            Quản lý người chơi & Tier
          </h2>
          <PlayerForm 
            onAddPlayer={addPlayer}
            editingPlayer={editingPlayer}
            onUpdatePlayer={updatePlayer}
            onCancelEdit={() => setEditingPlayer(null)}
          />
          <PlayerList 
            players={players}
            onEdit={setEditingPlayer}
            onDelete={deletePlayer}
          />
        </section>
        
        {/* TEAM FORMATION */}
        <section className="section">
          <h2 className="section-heading">
            <Brain size={24} />
            Ghép đội thông minh
          </h2>
          
          <div className="algorithm-selector">
            <div className="algorithm-options">
              <label className="algorithm-option">
                <input
                  type="radio"
                  value="greedy"
                  checked={algorithm === 'greedy'}
                  onChange={(e) => setAlgorithm(e.target.value)}
                />
                <div className="algorithm-info">
                  <div className="algorithm-name">
                    <Zap size={16} />
                    Greedy Pairing
                  </div>
                  <div className="algorithm-desc">
                    Ghép người tier cao + tier thấp (Nhanh, hiệu quả)
                  </div>
                </div>
              </label>
              
              <label className="algorithm-option">
                <input
                  type="radio"
                  value="optimal"
                  checked={algorithm === 'optimal'}
                  onChange={(e) => setAlgorithm(e.target.value)}
                />
                <div className="algorithm-info">
                  <div className="algorithm-name">
                    <Brain size={16} />
                    Optimal Pairing
                  </div>
                  <div className="algorithm-desc">
                    Tối ưu hóa variance (Cân bằng nhất)
                  </div>
                </div>
              </label>
            </div>
            
            <div className="action-buttons">
              <button 
                onClick={createTeams} 
                className="btn btn-primary"
                disabled={players.length < 2}
              >
                <Shuffle size={18} />
                Tạo đội ({algorithm === 'greedy' ? 'Greedy' : 'Optimal'})
              </button>
              {teams.length > 0 && (
                <button onClick={resetAll} className="btn btn-outline">
                  Xóa tất cả
                </button>
              )}
            </div>
          </div>
          
          <TeamDisplay teams={teams} algorithm={algorithm} />
        </section>
        
        {/* MATCH MAKING */}
        <section className="section">
          <h2 className="section-heading">
            <Trophy size={24} />
            Ghép cặp thi đấu cân bằng
          </h2>
          
          <div className="match-controls">
            <button
              onClick={createMatches}
              className="btn btn-accent"
              disabled={teams.filter(t => t.members.length === 2).length < 2}
            >
              <Shuffle size={18} />
              Tạo cặp đấu cân bằng
            </button>
          </div>
          
          <MatchList matches={matches} />
        </section>
      </div>
      
      {/* STYLES */}
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          padding: 20px;
        }
        
        .app-container {
          max-width: 1400px;
          margin: 0 auto;
          background: white;
          border-radius: 20px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.3);
          overflow: hidden;
        }
        
        .app-header-advanced {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 30px;
        }
        
        .header-content {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .app-title {
          font-size: 2.5rem;
          font-weight: 800;
          margin-bottom: 10px;
        }
        
        .app-subtitle {
          font-size: 1.1rem;
          opacity: 0.95;
        }
        
        .tier-legend {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .app-content {
          padding: 30px;
        }
        
        .section {
          margin-bottom: 50px;
        }
        
        .section-heading {
          font-size: 1.6rem;
          color: #333;
          margin-bottom: 25px;
          padding-bottom: 12px;
          border-bottom: 3px solid #667eea;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .section-title {
          font-size: 1.2rem;
          color: #555;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        /* Tier Badge */
        .tier-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 6px;
          font-weight: 700;
          white-space: nowrap;
        }
        
        /* Player Form */
        .player-form {
          display: flex;
          gap: 12px;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }
        
        .input-field {
          flex: 1;
          min-width: 200px;
          padding: 12px 16px;
          font-size: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          transition: border-color 0.3s;
        }
        
        .input-field:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .tier-select {
          padding: 12px 16px;
          font-size: 1rem;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: border-color 0.3s;
        }
        
        .tier-select:focus {
          outline: none;
          border-color: #667eea;
        }
        
        /* Buttons */
        .btn {
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .btn-primary {
          background: #667eea;
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #5568d3;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        
        .btn-accent {
          background: #ed64a6;
          color: white;
        }
        
        .btn-accent:hover:not(:disabled) {
          background: #d53f8c;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(237, 100, 166, 0.4);
        }
        
        .btn-outline {
          background: white;
          color: #667eea;
          border: 2px solid #667eea;
        }
        
        .btn-outline:hover:not(:disabled) {
          background: #667eea;
          color: white;
        }
        
        .btn-icon {
          padding: 6px;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #666;
          border-radius: 4px;
          transition: all 0.2s;
        }
        
        .btn-icon:hover {
          background: #f0f0f0;
          color: #333;
        }
        
        .btn-icon.btn-danger:hover {
          background: #fee;
          color: #e53e3e;
        }
        
        /* Player Stats */
        .player-list-container {
          margin-top: 20px;
        }
        
        .player-stats {
          margin-bottom: 30px;
        }
        
        .tier-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 12px;
          margin-top: 15px;
        }
        
        .tier-stat-card {
          background: #f7fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
        }
        
        .tier-stat-card:hover {
          border-color: #cbd5e0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .tier-stat-info {
          flex: 1;
        }
        
        .tier-stat-count {
          font-weight: 600;
          color: #2d3748;
          font-size: 1rem;
        }
        
        .tier-stat-value {
          font-size: 0.85rem;
          color: #718096;
        }
        
        /* Player List */
        .player-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        
        .player-card {
          padding: 14px 18px;
          background: #f7fafc;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s;
        }
        
        .player-card:hover {
          border-color: #667eea;
          box-shadow: 0 2px 10px rgba(102, 126, 234, 0.2);
        }
        
        .player-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }
        
        .player-name {
          font-weight: 600;
          color: #2d3748;
        }
        
        .player-actions {
          display: flex;
          gap: 4px;
        }
        
        /* Algorithm Selector */
        .algorithm-selector {
          background: #f7fafc;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 25px;
        }
        
        .algorithm-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }
        
        .algorithm-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 15px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }
        
        .algorithm-option:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }
        
        .algorithm-option input[type="radio"] {
          margin-top: 4px;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        
        .algorithm-info {
          flex: 1;
        }
        
        .algorithm-name {
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .algorithm-desc {
          font-size: 0.9rem;
          color: #718096;
        }
        
        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        /* Teams Display */
        .teams-display {
          margin-top: 20px;
        }
        
        .teams-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 15px;
        }
        
        .fairness-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #f7fafc;
          padding: 10px 18px;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }
        
        .fairness-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          color: #4a5568;
        }
        
        .fairness-score {
          font-size: 1.3rem;
          font-weight: 800;
        }
        
        .fairness-detail {
          font-size: 0.85rem;
          color: #718096;
        }
        
        .teams-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 16px;
        }
        
        .team-card-advanced {
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          background: white;
          transition: all 0.3s;
        }
        
        .team-card-advanced:hover {
          border-color: #667eea;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
          transform: translateY(-2px);
        }
        
        .team-header-advanced {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 700;
        }
        
        .team-tier-sum {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.25);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 1.1rem;
        }
        
        .team-members-advanced {
          padding: 14px;
          background: #f7fafc;
        }
        
        .team-member-advanced {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }
        
        .team-member-advanced:last-child {
          margin-bottom: 0;
        }
        
        .team-member-advanced:hover {
          border-color: #cbd5e0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        
        .member-name {
          font-weight: 500;
          color: #2d3748;
        }
        
        .team-member-placeholder {
          padding: 10px 14px;
          background: white;
          border: 1px dashed #cbd5e0;
          border-radius: 6px;
          text-align: center;
        }
        
        /* Matches Display */
        .match-controls {
          margin-bottom: 20px;
        }
        
        .matches-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .match-card-advanced {
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          overflow: hidden;
          transition: all 0.3s;
        }
        
        .match-card-advanced:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }
        
        .match-header-advanced {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 20px;
          background: #f7fafc;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .match-number {
          font-weight: 700;
          color: #667eea;
          font-size: 1.1rem;
        }
        
        .match-fairness {
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .match-fairness.fair {
          background: #c6f6d5;
          color: #22543d;
        }
        
        .match-fairness.unfair {
          background: #fed7d7;
          color: #742a2a;
        }
        
        .match-content {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 20px;
          padding: 20px;
          align-items: center;
        }
        
        .match-team-advanced {
          background: #f7fafc;
          padding: 18px;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
        }
        
        .team-label-advanced {
          font-weight: 700;
          color: #667eea;
          margin-bottom: 10px;
          font-size: 0.95rem;
        }
        
        .team-tier-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 12px;
        }
        
        .match-player {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          margin-bottom: 6px;
          font-weight: 500;
          color: #2d3748;
        }
        
        .match-player:last-child {
          margin-bottom: 0;
        }
        
        .match-vs-advanced {
          text-align: center;
        }
        
        .vs-text {
          font-size: 1.5rem;
          font-weight: 900;
          color: #ed64a6;
          margin-bottom: 8px;
        }
        
        .tier-diff {
          font-size: 0.85rem;
          color: #718096;
          font-weight: 600;
        }
        
        .empty-state {
          text-align: center;
          color: #999;
          padding: 50px 20px;
          font-style: italic;
          font-size: 1rem;
        }
        
        /* Responsive */
        @media (max-width: 768px) {
          .app-title {
            font-size: 1.8rem;
          }
          
          .app-content {
            padding: 20px;
          }
          
          .match-content {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          
          .match-vs-advanced {
            order: 2;
          }
          
          .teams-grid {
            grid-template-columns: 1fr;
          }
          
          .player-grid {
            grid-template-columns: 1fr;
          }
          
          .algorithm-options {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default BilliardsAdvancedApp;