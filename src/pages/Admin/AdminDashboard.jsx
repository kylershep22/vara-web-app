import React, { useState } from "react";
import SidebarLayout from "../../components/layout/SidebarLayout";
import OverviewTab from "./OverviewTab";
import AnalyticsTab from "./AnalyticsTab";
import ModerationTab from "./ModerationTab";
import UsersTab from "./UsersTab";
import ChallengesTab from "./ChallengesTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "moderation", label: "Moderation" },
  { id: "challenges", label: "Challenges" },
  { id: "users", label: "Users" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-vara-base py-vara-lg">
        <h1 className="text-vara-2xl font-bold text-soft-charcoal mb-vara-base">
          Admin Dashboard
        </h1>

        {/* Tab Navigation */}
        <div className="flex border-b border-divider mb-vara-lg overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-vara-base py-vara-sm text-vara-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-evergreen-teal border-b-2 border-evergreen-teal"
                  : "text-muted-sage-gray hover:text-soft-charcoal"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content — placeholders replaced in later tasks */}
        <div>
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "analytics" && <AnalyticsTab />}
          {activeTab === "moderation" && <ModerationTab />}
          {activeTab === "challenges" && <ChallengesTab />}
          {activeTab === "users" && <UsersTab />}
        </div>
      </div>
    </SidebarLayout>
  );
}
