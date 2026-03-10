import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SidebarLayout from '../../components/layout/SidebarLayout';
import {
  Trophy, ArrowLeft, Users, Target, Calendar, Clock,
  CheckCircle, LogIn, LogOut, Loader, Flame, MessageSquare,
} from 'lucide-react';
import {
  fetchChallengeById,
  joinChallenge,
  leaveChallenge,
  checkIn,
  hasCheckedInToday,
  fetchChallengeLeaderboard,
  fetchMyCheckIns,
  getDaysRemaining,
  getChallengeProgress,
  formatChallengePosition,
  formatChallengeDuration,
} from '../../services/db/challenges.service';

export default function ChallengeDetailPage() {
  const { challengeId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myCheckIns, setMyCheckIns] = useState([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [checkInNote, setCheckInNote] = useState('');
  const [tab, setTab] = useState('overview');

  const isMember = challenge?.members?.includes(user?.uid);
  const isOwner = challenge?.ownerId === user?.uid;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, lb, ci, checked] = await Promise.all([
        fetchChallengeById(challengeId),
        fetchChallengeLeaderboard(challengeId),
        fetchMyCheckIns(challengeId),
        hasCheckedInToday(challengeId),
      ]);
      setChallenge(c);
      setLeaderboard(lb);
      setMyCheckIns(ci);
      setCheckedInToday(checked);
    } catch (err) {
      console.error('Error loading challenge:', err);
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async () => {
    setActionLoading(true);
    try { await joinChallenge(challengeId); await load(); } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleLeave = async () => {
    setActionLoading(true);
    try { await leaveChallenge(challengeId); await load(); } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  const handleCheckIn = async () => {
    setActionLoading(true);
    try {
      await checkIn(challengeId, checkInNote || undefined);
      setCheckInNote('');
      await load();
    } catch (err) { console.error(err); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader className="animate-spin text-evergreen-teal" size={28} />
        </div>
      </SidebarLayout>
    );
  }

  if (!challenge) {
    return (
      <SidebarLayout>
        <div className="max-w-5xl mx-auto px-vara-base py-vara-lg text-center">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-2">Challenge not found</h2>
          <button onClick={() => navigate('/community/challenges')} className="text-evergreen-teal hover:underline text-vara-sm">
            Back to Challenges
          </button>
        </div>
      </SidebarLayout>
    );
  }

  const daysLeft = getDaysRemaining(challenge.endDate);
  const myParticipant = leaderboard.find((p) => p.userId === user?.uid);
  const myProgress = myParticipant ? getChallengeProgress(myParticipant.checkInCount, challenge.targetCount) : 0;
  const position = formatChallengePosition(challenge.startDate, challenge.endDate);
  const duration = formatChallengeDuration(challenge.startDate, challenge.endDate);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'participants', label: `Participants (${leaderboard.length})` },
    { key: 'activity', label: 'My Activity' },
  ];

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto px-vara-base py-vara-lg">
        {/* Back + Header */}
        <button onClick={() => navigate('/community/challenges')} className="flex items-center gap-2 text-muted-sage-gray hover:text-soft-charcoal mb-vara-base text-vara-sm">
          <ArrowLeft size={16} /> Challenges
        </button>

        <div className="bg-white rounded-vara-lg border border-divider shadow-vara-sm p-vara-lg mb-vara-lg">
          <div className="flex items-start gap-vara-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-medium to-evergreen-teal rounded-vara-lg flex items-center justify-center shadow-vara-sm shrink-0">
              <Trophy className="text-white" size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-vara-sm mb-1">
                <h1 className="text-vara-xl font-semibold text-soft-charcoal">{challenge.name}</h1>
                <span className={`px-2 py-0.5 rounded-vara-pill text-vara-xs font-medium ${
                  challenge.status === 'active' ? 'bg-teal-light text-evergreen-teal' :
                  challenge.status === 'upcoming' ? 'bg-golden-apricot/15 text-golden-apricot' :
                  'bg-dew-sage-light text-muted-sage-gray'
                }`}>
                  {challenge.status}
                </span>
              </div>
              {challenge.description && <p className="text-vara-sm text-muted-sage-gray mb-3">{challenge.description}</p>}

              <div className="flex flex-wrap items-center gap-vara-lg text-vara-xs text-muted-sage-gray">
                <span className="flex items-center gap-1"><Target size={14} /> {challenge.challengeGoal}</span>
                <span className="flex items-center gap-1"><Users size={14} /> {challenge.memberCount} members</span>
                <span className="flex items-center gap-1"><Calendar size={14} /> {duration}</span>
                <span className="flex items-center gap-1"><Clock size={14} /> {position}</span>
                {challenge.status === 'active' && <span className="flex items-center gap-1"><Flame size={14} /> {daysLeft} days left</span>}
              </div>
            </div>

            {/* Join/Leave */}
            <div className="shrink-0">
              {!isMember ? (
                <button onClick={handleJoin} disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-vara-base py-2.5 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90 disabled:opacity-50">
                  <LogIn size={16} /> Join
                </button>
              ) : !isOwner ? (
                <button onClick={handleLeave} disabled={actionLoading}
                  className="inline-flex items-center gap-2 px-vara-base py-2.5 border border-divider text-muted-sage-gray rounded-vara-md text-vara-sm hover:bg-dew-sage-light disabled:opacity-50">
                  <LogOut size={16} /> Leave
                </button>
              ) : null}
            </div>
          </div>

          {/* Progress bar for members */}
          {isMember && myParticipant && (
            <div className="mt-vara-base pt-vara-base border-t border-divider">
              <div className="flex items-center justify-between mb-2">
                <span className="text-vara-sm font-medium text-soft-charcoal">Your Progress</span>
                <span className="text-vara-sm font-semibold text-evergreen-teal">{myProgress}%</span>
              </div>
              <div className="h-2.5 bg-dew-sage-light rounded-vara-pill overflow-hidden">
                <div className="h-full bg-evergreen-teal rounded-vara-pill transition-all duration-500" style={{ width: `${myProgress}%` }} />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-vara-xs text-muted-sage-gray">
                <span>{myParticipant.checkInCount} / {challenge.targetCount} {challenge.unit || 'check-ins'}</span>
                <span className="flex items-center gap-1"><Flame size={12} /> {myParticipant.currentStreak} day streak</span>
              </div>
            </div>
          )}
        </div>

        {/* Check-in card (members only, active challenges) */}
        {isMember && challenge.status === 'active' && (
          <div className="bg-white rounded-vara-lg border border-divider shadow-vara-sm p-vara-lg mb-vara-lg">
            {checkedInToday ? (
              <div className="flex items-center gap-vara-md text-evergreen-teal">
                <CheckCircle size={24} />
                <div>
                  <p className="font-medium text-vara-base">Checked in today</p>
                  <p className="text-vara-xs text-muted-sage-gray">Great work! Come back tomorrow.</p>
                </div>
              </div>
            ) : (
              <div>
                <h3 className="text-vara-base font-semibold text-soft-charcoal mb-3">Daily Check-In</h3>
                <div className="flex gap-vara-sm">
                  <input
                    value={checkInNote}
                    onChange={(e) => setCheckInNote(e.target.value)}
                    placeholder="Add a note (optional)..."
                    className="flex-1 border border-silver-sage rounded-vara-md px-vara-sm py-2 text-vara-sm text-soft-charcoal focus:border-evergreen-teal focus:outline-none"
                  />
                  <button onClick={handleCheckIn} disabled={actionLoading}
                    className="inline-flex items-center gap-2 px-vara-base py-2 bg-evergreen-teal text-white rounded-vara-md text-vara-sm font-medium hover:opacity-90 disabled:opacity-50">
                    <CheckCircle size={16} /> Check In
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-dew-sage-light rounded-vara-lg mb-vara-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-vara-base py-2 rounded-vara-md text-vara-sm font-medium transition-all ${
                tab === t.key ? 'bg-white text-evergreen-teal shadow-vara-sm' : 'text-muted-sage-gray hover:text-soft-charcoal'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'overview' && (
          <div className="bg-white rounded-vara-lg border border-divider shadow-vara-sm p-vara-lg">
            <h3 className="text-vara-base font-semibold text-soft-charcoal mb-vara-base">Challenge Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-vara-base">
              <StatBox label="Goal" value={challenge.challengeGoal} />
              <StatBox label="Frequency" value={challenge.frequency} />
              <StatBox label="Target" value={`${challenge.targetCount} ${challenge.unit || 'times'}`} />
              <StatBox label="Total Check-Ins" value={challenge.totalCheckIns || 0} />
            </div>
          </div>
        )}

        {tab === 'participants' && (
          <div className="bg-white rounded-vara-lg border border-divider shadow-vara-sm p-vara-lg">
            <h3 className="text-vara-base font-semibold text-soft-charcoal mb-vara-base">Participants</h3>
            {leaderboard.length === 0 ? (
              <p className="text-vara-sm text-muted-sage-gray">No participants yet.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-vara-sm bg-mist-white rounded-vara-md">
                    <div className="flex items-center gap-vara-md">
                      <div className="w-9 h-9 rounded-full bg-dew-sage-light flex items-center justify-center">
                        <Users size={16} className="text-evergreen-teal" />
                      </div>
                      <div>
                        <p className="text-vara-sm font-medium text-soft-charcoal">{p.displayName}</p>
                        <p className="text-vara-xs text-muted-sage-gray">{p.checkInCount} check-ins</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-vara-sm font-semibold text-evergreen-teal">
                        {getChallengeProgress(p.checkInCount, challenge.targetCount)}%
                      </p>
                      <p className="text-vara-xs text-muted-sage-gray flex items-center gap-1">
                        <Flame size={10} /> {p.currentStreak}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="bg-white rounded-vara-lg border border-divider shadow-vara-sm p-vara-lg">
            <h3 className="text-vara-base font-semibold text-soft-charcoal mb-vara-base">Your Check-Ins</h3>
            {!isMember ? (
              <p className="text-vara-sm text-muted-sage-gray">Join this challenge to start tracking.</p>
            ) : myCheckIns.length === 0 ? (
              <p className="text-vara-sm text-muted-sage-gray">No check-ins yet. Start today!</p>
            ) : (
              <div className="space-y-2">
                {myCheckIns.map((ci) => (
                  <div key={ci.id} className="flex items-center gap-vara-md p-vara-sm bg-mist-white rounded-vara-md">
                    <CheckCircle size={16} className="text-evergreen-teal shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-vara-sm text-soft-charcoal">{ci.date}</p>
                      {ci.note && <p className="text-vara-xs text-muted-sage-gray truncate">{ci.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

function StatBox({ label, value }) {
  return (
    <div className="bg-mist-white rounded-vara-md p-vara-sm">
      <p className="text-vara-xs text-muted-sage-gray mb-1">{label}</p>
      <p className="text-vara-sm font-semibold text-soft-charcoal capitalize">{value}</p>
    </div>
  );
}
