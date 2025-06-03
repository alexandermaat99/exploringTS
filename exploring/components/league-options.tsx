"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LeagueOptionContext = createContext<{
  selectedOption: string;
  setSelectedOption: (value: string) => void;
}>({
  selectedOption: "join",
  setSelectedOption: () => {},
});

export function LeagueOptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedOption, setSelectedOption] = useState("join");

  return (
    <LeagueOptionContext.Provider value={{ selectedOption, setSelectedOption }}>
      {children}
    </LeagueOptionContext.Provider>
  );
}

export function useLeagueOption() {
  return useContext(LeagueOptionContext);
}

export default function LeagueOptionsHandler() {
  const { selectedOption } = useLeagueOption();

  useEffect(() => {
    // Update required fields when option changes
    const form = document.querySelector("form");
    if (form) {
      const leagueCodeInput = form.querySelector('input[name="league_code"]');
      const leagueNameInput = form.querySelector('input[name="league_name"]');

      if (leagueCodeInput && leagueNameInput) {
        if (selectedOption === "join") {
          leagueCodeInput.setAttribute("required", "");
          leagueNameInput.removeAttribute("required");
        } else {
          leagueCodeInput.removeAttribute("required");
          leagueNameInput.setAttribute("required", "");
        }
      }
    }
  }, [selectedOption]);

  return (
    <style jsx global>{`
      [data-league-option="join"] {
        display: ${selectedOption === "join" ? "block" : "none"};
      }
      [data-league-option="create"] {
        display: ${selectedOption === "create" ? "block" : "none"};
      }
    `}</style>
  );
}
