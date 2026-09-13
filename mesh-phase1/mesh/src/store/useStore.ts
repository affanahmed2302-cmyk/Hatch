"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProfile, Connection, Conversation, Message, Team } from "@/types";

interface MeshState {
  currentUser: UserProfile | null;
  users: UserProfile[];
  connections: Connection[];
  conversations: Conversation[];
  messages: Message[];
  teams: Team[];
  isAuthenticated: boolean;
  setCurrentUser: (user: UserProfile | null) => void;
  setUsers: (users: UserProfile[]) => void;
  addUser: (user: UserProfile) => void;
  updateUser: (id: string, data: Partial<UserProfile>) => void;
  addConnection: (conn: Connection) => void;
  addMessage: (msg: Message) => void;
  addTeam: (team: Team) => void;
  logout: () => void;
}

export const useStore = create<MeshState>()(
  persist(
    (set) => ({
      currentUser: null,
      users: [],
      connections: [],
      conversations: [],
      messages: [],
      teams: [],
      isAuthenticated: false,
      setCurrentUser: (user) =>
        set({ currentUser: user, isAuthenticated: !!user }),
      setUsers: (users) => set({ users }),
      addUser: (user) =>
        set((state) => ({ users: [...state.users, user] })),
      updateUser: (id, data) =>
        set((state) => ({
          users: state.users.map((u) =>
            u.id === id ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
          ),
          currentUser:
            state.currentUser?.id === id
              ? { ...state.currentUser, ...data, updatedAt: new Date().toISOString() }
              : state.currentUser,
        })),
      addConnection: (conn) =>
        set((state) => ({ connections: [...state.connections, conn] })),
      addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),
      addTeam: (team) =>
        set((state) => ({ teams: [...state.teams, team] })),
      logout: () =>
        set({
          currentUser: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "mesh-storage",
      partialize: (state) => ({
        currentUser: state.currentUser,
        users: state.users,
        connections: state.connections,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
