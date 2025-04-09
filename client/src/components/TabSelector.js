import React from "react";
import "./TabSelector.css";

const TabSelector = ({ activeTab, setActiveTab, sharedFilesAvailable }) => {
  return (
    <div className="tab-selector">
      <button
        className={`tab-button ${activeTab === "myFiles" ? "active" : ""}`}
        onClick={() => setActiveTab("myFiles")}
      >
        My Files
      </button>
      <button
        className={`tab-button ${activeTab === "sharedFiles" ? "active" : ""}`}
        onClick={() => setActiveTab("sharedFiles")}
      >
        Shared With Me
        {sharedFilesAvailable && <span className="notification-dot"></span>}
      </button>
    </div>
  );
};

export default TabSelector;
