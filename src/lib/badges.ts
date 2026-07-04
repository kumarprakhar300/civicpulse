export type Badge = {
  key: string;
  label: string;
  emoji: string;
  description: string;
  earned: boolean;
};

export function computeBadges(stats: {
  reports_count: number;
  resolved_count: number;
  upvotes_received: number;
  comments_count: number;
}): Badge[] {
  return [
    {
      key: "newcomer",
      label: "Newcomer",
      emoji: "🌱",
      description: "Filed your first report.",
      earned: stats.reports_count >= 1,
    },
    {
      key: "reporter",
      label: "Reporter",
      emoji: "📝",
      description: "5 reports submitted.",
      earned: stats.reports_count >= 5,
    },
    {
      key: "advocate",
      label: "Advocate",
      emoji: "📣",
      description: "25 upvotes across your reports.",
      earned: stats.upvotes_received >= 25,
    },
    {
      key: "champion",
      label: "Champion",
      emoji: "🏆",
      description: "10 of your reports were resolved.",
      earned: stats.resolved_count >= 10,
    },
    {
      key: "commentator",
      label: "Commentator",
      emoji: "💬",
      description: "10 comments posted.",
      earned: stats.comments_count >= 10,
    },
  ];
}

export function reputationScore(stats: {
  reports_count: number;
  resolved_count: number;
  upvotes_received: number;
  comments_count: number;
}): number {
  return (
    stats.reports_count * 5 +
    stats.upvotes_received * 2 +
    stats.resolved_count * 10 +
    stats.comments_count * 1
  );
}
