import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Home from "@/pages/Home";
import Profile from "@/pages/Profile";
import Upload from "@/pages/Upload";
import Callback from "./pages/Callback";

export default () => {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Header searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      <main>
        <Routes>
          <Route path="/" element={<Home searchQuery={searchQuery} />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/callback" element={<Callback />} />

          <Route
            path="*"
            element={
              <p className="p-4 text-muted-foreground">Route Not Found</p>
            }
          />
        </Routes>
      </main>
    </div>
  );
};
