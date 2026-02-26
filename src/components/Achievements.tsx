import { Trophy, Star, Zap, Target, CheckCircle2, Lock, ExternalLink, ChevronRight } from 'lucide-react';
import type { Achievement, Quest } from '../types';

interface AchievementsProps {
  achievements: Achievement[];
  quests: Quest[];
  totalXP: number;
  level: number;
  xpToNext: number;
  onFaucetVisited: () => void;
}

function XPBadge({ xp }: { xp: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-btc bg-btc/10 px-1.5 py-0.5 rounded-full border border-btc/20">
      <Zap size={8} />+{xp} XP
    </span>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const unlocked = achievement.unlocked;
  const progress = achievement.progress || 0;
  const max = achievement.maxProgress || 1;
  const pct = Math.min((progress / max) * 100, 100);

  return (
    <div className={`relative p-4 rounded-xl border transition-all ${
      unlocked
        ? 'bg-gradient-to-br from-btc/10 to-purple-500/5 border-btc/20'
        : 'bg-surface-2/50 border-white/5 opacity-70'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>
          {achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-xs font-bold ${unlocked ? 'text-white' : 'text-gray-500'}`}>
              {achievement.title}
            </h4>
            {unlocked ? (
              <CheckCircle2 size={12} className="text-green-400 shrink-0" />
            ) : (
              <Lock size={10} className="text-gray-600 shrink-0" />
            )}
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{achievement.description}</p>

          {!unlocked && max > 1 && (
            <div className="mt-2">
              <div className="flex justify-between mb-0.5">
                <span className="text-[9px] text-gray-600">{progress}/{max}</span>
                <span className="text-[9px] text-gray-600">{Math.round(pct)}%</span>
              </div>
              <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-btc-dark to-btc transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <XPBadge xp={achievement.xpReward} />
      </div>
      {unlocked && achievement.unlockedAt && (
        <div className="text-[9px] text-gray-600 mt-2 text-right">
          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest, onAction }: { quest: Quest; onAction: (quest: Quest) => void }) {
  const pct = Math.min((quest.progress / quest.maxProgress) * 100, 100);
  const typeColor = quest.type === 'daily' ? 'text-green-400 bg-green-500/10 border-green-500/20'
    : quest.type === 'weekly' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    : 'text-purple-400 bg-purple-500/10 border-purple-500/20';

  return (
    <div className={`p-4 rounded-xl border transition-all ${
      quest.completed
        ? 'bg-green-500/5 border-green-500/20'
        : 'bg-surface-2/50 border-white/5 hover:border-white/10'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`text-xl ${quest.completed ? '' : ''}`}>
          {quest.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-xs font-bold ${quest.completed ? 'text-green-400' : 'text-white'}`}>
              {quest.title}
            </h4>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border ${typeColor}`}>
              {quest.type}
            </span>
          </div>
          <p className="text-[10px] text-gray-500 leading-relaxed">{quest.description}</p>

          {!quest.completed && (
            <div className="mt-2">
              <div className="flex justify-between mb-0.5">
                <span className="text-[9px] text-gray-600">
                  {quest.maxProgress > 1 ? `${quest.progress}/${quest.maxProgress}` : 'Not started'}
                </span>
              </div>
              <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <XPBadge xp={quest.xpReward} />
          {!quest.completed && quest.action && (
            <button
              onClick={() => onAction(quest)}
              className="text-[9px] text-btc hover:text-btc-light flex items-center gap-0.5 transition-colors"
            >
              Go <ChevronRight size={10} />
            </button>
          )}
          {quest.completed && (
            <CheckCircle2 size={14} className="text-green-400" />
          )}
        </div>
      </div>
    </div>
  );
}

export function Achievements({
  achievements,
  quests,
  totalXP,
  level,
  xpToNext,
  onFaucetVisited,
}: AchievementsProps) {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const completedQuests = quests.filter((q) => q.completed).length;
  const xpPct = ((500 - xpToNext) / 500) * 100;

  const handleQuestAction = (quest: Quest) => {
    if (quest.id === 'visit_faucet') {
      window.open('https://faucet.opnet.org', '_blank');
      onFaucetVisited();
    }
  };

  // Separate by category
  const tradingAch = achievements.filter((a) => a.category === 'trading');
  const milestoneAch = achievements.filter((a) => a.category === 'milestone');
  const explorerAch = achievements.filter((a) => a.category === 'explorer');
  const socialAch = achievements.filter((a) => a.category === 'social');

  const activeQuests = quests.filter((q) => !q.completed);
  const doneQuests = quests.filter((q) => q.completed);

  return (
    <div className="space-y-6 pb-20 animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-btc/20 to-yellow-500/20 flex items-center justify-center mx-auto mb-3 border border-btc/20">
          <Trophy size={32} className="text-btc" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Achievements & Quests</h2>
        <p className="text-xs text-gray-500 mt-1">
          Complete challenges, earn XP, level up on OP_NET
        </p>
      </div>

      {/* Level & XP Bar */}
      <div className="bg-gradient-to-br from-btc/10 to-purple-500/5 rounded-2xl p-5 border border-btc/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-btc/20 flex items-center justify-center border border-btc/30">
              <span className="text-lg font-black text-btc">{level}</span>
            </div>
            <div>
              <div className="text-xs font-bold text-white">Level {level}</div>
              <div className="text-[10px] text-gray-500">{totalXP} total XP</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500">{xpToNext} XP to next level</div>
            <div className="flex items-center gap-2 mt-1">
              <Star size={12} className="text-btc" />
              <span className="text-xs font-bold text-btc">{unlockedCount}/{achievements.length} achievements</span>
            </div>
          </div>
        </div>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-btc-dark to-btc transition-all duration-700"
            style={{ width: `${xpPct}%` }}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="text-center">
            <div className="text-lg font-black text-white">{unlockedCount}</div>
            <div className="text-[9px] text-gray-500 font-bold">Achievements</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-white">{completedQuests}</div>
            <div className="text-[9px] text-gray-500 font-bold">Quests Done</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-black text-btc">{totalXP}</div>
            <div className="text-[9px] text-gray-500 font-bold">Total XP</div>
          </div>
        </div>
      </div>

      {/* Active Quests */}
      {activeQuests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-green-400" />
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Quests</h3>
            <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full font-bold border border-green-500/20">
              {activeQuests.length}
            </span>
          </div>
          <div className="space-y-2">
            {activeQuests.map((q) => (
              <QuestCard key={q.id} quest={q} onAction={handleQuestAction} />
            ))}
          </div>
        </div>
      )}

      {/* Completed Quests */}
      {doneQuests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} className="text-gray-500" />
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Completed Quests</h3>
          </div>
          <div className="space-y-2">
            {doneQuests.map((q) => (
              <QuestCard key={q.id} quest={q} onAction={handleQuestAction} />
            ))}
          </div>
        </div>
      )}

      {/* Trading Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-btc" />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trading</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tradingAch.map((a) => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      </div>

      {/* Milestone Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Trophy size={14} className="text-yellow-400" />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Milestones</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {milestoneAch.map((a) => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      </div>

      {/* Explorer Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ExternalLink size={14} className="text-purple-400" />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Explorer</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {explorerAch.map((a) => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      </div>

      {/* Social Achievements */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Star size={14} className="text-green-400" />
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Social</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {socialAch.map((a) => <AchievementCard key={a.id} achievement={a} />)}
        </div>
      </div>

      <p className="text-[10px] text-gray-600 text-center pt-2 border-t border-white/5">
        Achievements & quests powered by <span className="text-btc">BitPredict</span> on OP_NET · Bitcoin L1
      </p>
    </div>
  );
}
