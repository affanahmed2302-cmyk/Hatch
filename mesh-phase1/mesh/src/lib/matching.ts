import { UserProfile, MatchResult, MatchReason } from "@/types";

export function calculateMatch(me: UserProfile, other: UserProfile): MatchResult {
  const reasons: MatchReason[] = [];
  let score = 0;
  let max = 0;

  // Shared skills
  const sharedSkills = me.skills.filter((s) =>
    other.skills.some((os) => os.toLowerCase() === s.toLowerCase())
  );
  if (sharedSkills.length > 0) {
    const skillScore = Math.min(sharedSkills.length * 0.12, 0.35);
    score += skillScore;
    reasons.push({
      type: "skills",
      text: `You both share skills: ${sharedSkills.slice(0, 3).join(", ")}`,
      score: skillScore,
    });
  }
  max += 0.35;

  // Shared interests
  const sharedInterests = me.interests.filter((i) =>
    other.interests.some((oi) => oi.toLowerCase() === i.toLowerCase())
  );
  if (sharedInterests.length > 0) {
    const interestScore = Math.min(sharedInterests.length * 0.1, 0.25);
    score += interestScore;
    reasons.push({
      type: "interests",
      text: `Common interests: ${sharedInterests.slice(0, 3).join(", ")}`,
      score: interestScore,
    });
  }
  max += 0.25;

  // Looking for complementarity
  const lookingOverlap = me.lookingFor.filter((l) => other.lookingFor.includes(l));
  if (lookingOverlap.length > 0) {
    score += 0.15;
    reasons.push({
      type: "looking",
      text: `Both looking for: ${lookingOverlap.slice(0, 2).join(", ")}`,
      score: 0.15,
    });
  }
  max += 0.15;

  // Same college boost
  if (me.college === other.college) {
    score += 0.1;
    reasons.push({
      type: "college",
      text: `Same campus: ${me.college}`,
      score: 0.1,
    });
  }
  max += 0.1;

  // Year proximity
  if (me.year && other.year && me.year === other.year) {
    score += 0.05;
    reasons.push({
      type: "year",
      text: `Same year: ${me.year}`,
      score: 0.05,
    });
  }
  max += 0.05;

  // Normalize
  const finalScore = max > 0 ? Math.min(score / max, 0.98) : 0.1;

  if (reasons.length === 0) {
    reasons.push({
      type: "general",
      text: "Potential collaborator on campus",
      score: 0.1,
    });
  }

  return {
    user: other,
    score: finalScore,
    reasons: reasons.sort((a, b) => b.score - a.score).slice(0, 4),
  };
}

export function rankMatches(me: UserProfile, others: UserProfile[]): MatchResult[] {
  return others
    .filter((u) => u.id !== me.id)
    .map((u) => calculateMatch(me, u))
    .sort((a, b) => b.score - a.score);
}
