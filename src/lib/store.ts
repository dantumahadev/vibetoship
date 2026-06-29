/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Issue, UserProfile, Vote } from "../types";

const ISSUES_KEY = "ch_issues";
const USER_KEY = "ch_user";
const VOTES_KEY = "ch_votes";

// Initial mock data
const MOCK_ISSUES: Issue[] = [
  {
    id: "1",
    title: "Large Pothole on Main St",
    description: "A very deep pothole that is damaging cars.",
    category: "Infrastructure",
    status: "reported",
    location: {
      lat: 40.7128,
      lng: -74.006,
      address: "Main St & 5th Ave",
    },
    reportedBy: "user1",
    reporterName: "John Doe",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    votesCount: 5,
    impactScore: 8,
  },
  {
    id: "2",
    title: "Broken Streetlight",
    description: "The streetlight has been flickering for weeks and now it's completely out.",
    category: "Safety",
    status: "verified",
    location: {
      lat: 40.7138,
      lng: -74.007,
      address: "Oak St",
    },
    reportedBy: "user2",
    reporterName: "Jane Smith",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 150000000).toISOString(),
    votesCount: 12,
    impactScore: 6,
  }
];

const MOCK_USER: UserProfile = {
  uid: "local-user-123",
  displayName: "Community Hero",
  email: "hero@example.com",
  role: "citizen",
  points: 150,
  rank: "Bronze Solver",
  createdAt: new Date().toISOString(),
};

export const store = {
  getIssues: (): Issue[] => {
    const data = localStorage.getItem(ISSUES_KEY);
    if (!data) {
      localStorage.setItem(ISSUES_KEY, JSON.stringify(MOCK_ISSUES));
      return MOCK_ISSUES;
    }
    return JSON.parse(data);
  },

  addIssue: (issue: Omit<Issue, "id" | "createdAt" | "updatedAt" | "votesCount">): Issue => {
    const issues = store.getIssues();
    const newIssue: Issue = {
      ...issue,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      votesCount: 0,
    };
    const updatedIssues = [newIssue, ...issues];
    localStorage.setItem(ISSUES_KEY, JSON.stringify(updatedIssues));
    
    // Update user points
    const user = store.getUser();
    store.updateUser({ points: user.points + 20 });
    
    return newIssue;
  },

  updateIssue: (id: string, updates: Partial<Issue>) => {
    const issues = store.getIssues();
    const updatedIssues = issues.map((i) => 
      i.id === id ? { ...i, ...updates, updatedAt: new Date().toISOString() } : i
    );
    localStorage.setItem(ISSUES_KEY, JSON.stringify(updatedIssues));
  },

  getUser: (): UserProfile => {
    const data = localStorage.getItem(USER_KEY);
    if (!data) {
      localStorage.setItem(USER_KEY, JSON.stringify(MOCK_USER));
      return MOCK_USER;
    }
    return JSON.parse(data);
  },

  updateUser: (updates: Partial<UserProfile>) => {
    const user = store.getUser();
    const updatedUser = { ...user, ...updates };
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    return updatedUser;
  },

  voteIssue: (issueId: string, userId: string) => {
    const votes: Vote[] = JSON.parse(localStorage.getItem(VOTES_KEY) || "[]");
    const existingVote = votes.find(v => v.issueId === issueId && v.userId === userId);
    
    if (existingVote) return false;

    const newVote: Vote = { issueId, userId, createdAt: new Date().toISOString() };
    localStorage.setItem(VOTES_KEY, JSON.stringify([...votes, newVote]));

    const issues = store.getIssues();
    const issue = issues.find(i => i.id === issueId);
    if (issue) {
      store.updateIssue(issueId, { votesCount: issue.votesCount + 1 });
      // Points for voting
      const user = store.getUser();
      store.updateUser({ points: user.points + 5 });
    }
    return true;
  }
};
