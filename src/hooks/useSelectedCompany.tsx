import { useState, useEffect } from "react";

const STORAGE_KEY = "admin_selected_company";

export const useSelectedCompany = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || "all";
  });

  const setCompany = (id: string) => {
    if (id === "all") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, id);
    }
    setSelectedCompanyId(id);
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSelectedCompanyId(stored);
      } else {
        setSelectedCompanyId("all");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return { 
    selectedCompanyId, 
    setCompany,
    isAllCompanies: selectedCompanyId === "all"
  };
};
