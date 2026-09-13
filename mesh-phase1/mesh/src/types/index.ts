export type College = "BMS" | "PES" | "Jain" | "RV" | "Other";

export type LookingFor =
  | "Collaboration"
  | "Hackathon teammate"
  | "Project partner"
  | "Learning partner"
  | "Study partner"
  | "Mentor"
  | "Startup teammate"
  | "Designer"
  | "Developer"
  | "Event partner"
  | "Club/community"
  | "Friends"
  | "Networking"
  | "Research"
  | "Other";

export type VerificationStatus = "unverified" | "pending" | "verified" | "restricted";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  photoUrl?: string;
  college: College;
  branch: string;
  year: string;
  bio: string;
  skills: string[];
  interests: string[];
  careerInterests: string[];
  goals: string[];
  lookingFor: LookingFor[];
  availability: string[];
  github?: string;
  linkedin?: string;
  portfolio?: string;
  verificationStatus: VerificationStatus;
  xp: number;
  badges: string[];
  createdAt: string;
  updatedAt: string;
  isAdmin?: boolean;
}

export interface MatchReason {
  type: string;
  text: string;
  score: number;
}

export interface MatchResult {
  user: UserProfile;
  score: number;
  reasons: MatchReason[];
}

export interface Connection {
  id: string;
  userId: string;
  targetId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  requiredSkills: string[];
  size: number;
  currentMembers: string[];
  creatorId: string;
  deadline?: string;
  status: "recruiting" | "active" | "completed" | "archived";
  createdAt: string;
}
