import { useState, useCallback, useEffect } from 'react';
import type { Achievement, Quest, Bet } from '../types';

const STORAGE_KEY = 'bitpredict_achievements';
const QUEST_STORAGE_KEY = 'bitpredict_quests';

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_prediction',
    title: 'First Prediction',
    description: 'Place your very first prediction on BitPredict',
    icon: '🎯',
    category: 'trading',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 100,
  },
  {
    id: 'whale_trader',
    title: 'Whale Trader',
    description: 'Place a single prediction of 50,000+ sats',
    icon: '🐋',
    category: 'trading',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 250,
  },
  {
    id: 'diversified',
    title: 'Diversified Portfolio',
    description: 'Bet on markets in 3 different categories',
    icon: '🌈',
    category: 'trading',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
    xpReward: 200,
  },
  {
    id: 'ai_strategist',
    title: 'AI Strategist',
    description: 'Use Bob AI analysis before placing a prediction',
    icon: '🤖',
    category: 'explorer',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 150,
  },
  {
    id: 'fortune_builder',
    title: 'Fortune Builder',
    description: 'Place 10 total predictions',
    icon: '💰',
    category: 'milestone',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
    xpReward: 500,
  },
  {
    id: 'volume_king',
    title: 'Volume King',
    description: 'Trade a total of 100,000 sats across all markets',
    icon: '👑',
    category: 'milestone',
    unlocked: false,
    progress: 0,
    maxProgress: 100000,
    xpReward: 750,
  },
  {
    id: 'explorer',
    title: 'OP_NET Explorer',
    description: 'Visit the OP_NET block explorer from BitPredict',
    icon: '🔍',
    category: 'explorer',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 50,
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Connect your wallet within the first session',
    icon: '🐦',
    category: 'social',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 75,
  },
  {
    id: 'bull_bear',
    title: 'Bull & Bear',
    description: 'Place both a YES and a NO prediction',
    icon: '📊',
    category: 'trading',
    unlocked: false,
    progress: 0,
    maxProgress: 2,
    xpReward: 150,
  },
  {
    id: 'hot_streak',
    title: 'Hot Streak',
    description: 'Place 5 predictions in a single session',
    icon: '🔥',
    category: 'trading',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
    xpReward: 300,
  },
  {
    id: 'community_member',
    title: 'Community Member',
    description: 'Visit the Telegram community link',
    icon: '💬',
    category: 'social',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 50,
  },
  {
    id: 'bitcoin_maxi',
    title: 'Bitcoin Maximalist',
    description: 'Place 5 predictions in Crypto category',
    icon: '₿',
    category: 'milestone',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
    xpReward: 300,
  },
];

const DEFAULT_QUESTS: Quest[] = [
  {
    id: 'connect_wallet',
    title: 'Connect OP_WALLET',
    description: 'Connect your OP_WALLET browser extension to BitPredict',
    icon: '🔗',
    type: 'onetime',
    completed: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 100,
    action: 'connect',
  },
  {
    id: 'first_bet',
    title: 'Place First Prediction',
    description: 'Place your first YES or NO prediction on any market',
    icon: '🎯',
    type: 'onetime',
    completed: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 150,
    action: 'bet',
  },
  {
    id: 'analyze_market',
    title: 'Ask Bob AI',
    description: 'Analyze any market using the Bob AI agent',
    icon: '🧠',
    type: 'onetime',
    completed: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 100,
    action: 'ai',
  },
  {
    id: 'trade_3_categories',
    title: 'Category Explorer',
    description: 'Place predictions in 3 different market categories',
    icon: '🌍',
    type: 'onetime',
    completed: false,
    progress: 0,
    maxProgress: 3,
    xpReward: 200,
    action: 'bet',
  },
  {
    id: 'daily_prediction',
    title: 'Daily Prediction',
    description: 'Place at least 1 prediction today',
    icon: '📅',
    type: 'daily',
    completed: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 50,
    action: 'bet',
  },
  {
    id: 'weekly_volume',
    title: 'Weekly Volume',
    description: 'Trade 50,000 sats this week',
    icon: '📈',
    type: 'weekly',
    completed: false,
    progress: 0,
    maxProgress: 50000,
    xpReward: 300,
    action: 'bet',
  },
  {
    id: 'visit_faucet',
    title: 'Get Regtest BTC',
    description: 'Visit the OP_NET faucet to get regtest BTC',
    icon: '🚰',
    type: 'onetime',
    completed: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 75,
    action: 'link',
  },
  {
    id: 'check_leaderboard',
    title: 'Competitive Spirit',
    description: 'Visit the leaderboard to see rankings',
    icon: '🏆',
    type: 'onetime',
    completed: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 50,
    action: 'navigate',
  },
];

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_ACHIEVEMENTS;
    } catch {
      return DEFAULT_ACHIEVEMENTS;
    }
  });

  const [quests, setQuests] = useState<Quest[]>(() => {
    try {
      const stored = localStorage.getItem(QUEST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_QUESTS;
    } catch {
      return DEFAULT_QUESTS;
    }
  });

  const [newUnlock, setNewUnlock] = useState<Achievement | null>(null);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(quests));
  }, [quests]);

  const totalXP = achievements
    .filter((a) => a.unlocked)
    .reduce((sum, a) => sum + a.xpReward, 0) +
    quests.filter((q) => q.completed).reduce((sum, q) => sum + q.xpReward, 0);

  const level = Math.floor(totalXP / 500) + 1;
  const xpToNext = 500 - (totalXP % 500);

  const unlockAchievement = useCallback((id: string) => {
    setAchievements((prev) => {
      const updated = prev.map((a) => {
        if (a.id === id && !a.unlocked) {
          const unlocked = { ...a, unlocked: true, unlockedAt: Date.now(), progress: a.maxProgress };
          setNewUnlock(unlocked);
          setTimeout(() => setNewUnlock(null), 4000);
          return unlocked;
        }
        return a;
      });
      return updated;
    });
  }, []);

  const updateProgress = useCallback((id: string, increment = 1) => {
    setAchievements((prev) =>
      prev.map((a) => {
        if (a.id === id && !a.unlocked && a.maxProgress) {
          const newProgress = Math.min((a.progress || 0) + increment, a.maxProgress);
          if (newProgress >= a.maxProgress) {
            const unlocked = { ...a, unlocked: true, unlockedAt: Date.now(), progress: newProgress };
            setNewUnlock(unlocked);
            setTimeout(() => setNewUnlock(null), 4000);
            return unlocked;
          }
          return { ...a, progress: newProgress };
        }
        return a;
      }),
    );
  }, []);

  const completeQuest = useCallback((id: string) => {
    setQuests((prev) =>
      prev.map((q) =>
        q.id === id && !q.completed
          ? { ...q, completed: true, completedAt: Date.now(), progress: q.maxProgress }
          : q,
      ),
    );
  }, []);

  const updateQuestProgress = useCallback((id: string, increment = 1) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id === id && !q.completed) {
          const newProgress = Math.min(q.progress + increment, q.maxProgress);
          if (newProgress >= q.maxProgress) {
            return { ...q, completed: true, completedAt: Date.now(), progress: newProgress };
          }
          return { ...q, progress: newProgress };
        }
        return q;
      }),
    );
  }, []);

  const onBetPlaced = useCallback((bet: Bet, allBets: Bet[], marketCategory: string) => {
    // Achievement: first prediction
    updateProgress('first_prediction');

    // Achievement: fortune builder (10 total)
    updateProgress('fortune_builder');

    // Achievement: hot streak (5 in session)
    updateProgress('hot_streak');

    // Achievement: whale trader
    if (bet.amount >= 50000) {
      unlockAchievement('whale_trader');
    }

    // Achievement: volume king
    updateProgress('volume_king', bet.amount);

    // Achievement: bull & bear
    const sides = new Set(allBets.map((b) => b.side));
    sides.add(bet.side);
    if (sides.size >= 2) {
      unlockAchievement('bull_bear');
    }

    // Achievement: diversified (3 categories)
    const categories = new Set<string>();
    // We'd need market data here, so we track by category param
    categories.add(marketCategory);
    updateProgress('diversified');

    // Achievement: bitcoin maxi (5 crypto bets)
    if (marketCategory === 'Crypto') {
      updateProgress('bitcoin_maxi');
    }

    // Quests
    updateQuestProgress('first_bet');
    updateQuestProgress('daily_prediction');
    updateQuestProgress('weekly_volume', bet.amount);
    updateQuestProgress('trade_3_categories');
  }, [updateProgress, unlockAchievement, updateQuestProgress]);

  const onWalletConnected = useCallback(() => {
    unlockAchievement('early_bird');
    completeQuest('connect_wallet');
  }, [unlockAchievement, completeQuest]);

  const onAIUsed = useCallback(() => {
    unlockAchievement('ai_strategist');
    completeQuest('analyze_market');
  }, [unlockAchievement, completeQuest]);

  const onExplorerVisited = useCallback(() => {
    unlockAchievement('explorer');
  }, [unlockAchievement]);

  const onCommunityVisited = useCallback(() => {
    unlockAchievement('community_member');
  }, [unlockAchievement]);

  const onLeaderboardVisited = useCallback(() => {
    completeQuest('check_leaderboard');
  }, [completeQuest]);

  const onFaucetVisited = useCallback(() => {
    completeQuest('visit_faucet');
  }, [completeQuest]);

  return {
    achievements,
    quests,
    totalXP,
    level,
    xpToNext,
    newUnlock,
    onBetPlaced,
    onWalletConnected,
    onAIUsed,
    onExplorerVisited,
    onCommunityVisited,
    onLeaderboardVisited,
    onFaucetVisited,
  };
}
