import { createContext, useContext, useState, useCallback } from "react";

const ChangedContext = createContext();

export const ChangedProvider = ({ children }) => {
  // { tabKey: { changed: boolean, saveFunc: () => Promise } }
  const [tabMap, setTabMap] = useState({});

  const setChanged = useCallback((key, value) => {
    setTabMap((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), changed: value }
    }));
  }, []);

  const registerSaveFunc = useCallback((key, saveFunc) => {
    setTabMap((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), saveFunc }
    }));
  }, []);

  const clearTab = useCallback((key) => {
    setTabMap((prev) => {
      const newMap = { ...prev };
      delete newMap[key];
      return newMap;
    });
  }, []);

  const isChanged = useCallback((key) => !!tabMap[key]?.changed, [tabMap]);

  const callSaveFunc = useCallback(async (key) => {
    const fn = tabMap[key]?.saveFunc;
    if (fn) await fn();
  }, [tabMap]);

  return (
    <ChangedContext.Provider
      value={{ tabMap, setChanged, registerSaveFunc, clearTab, isChanged, callSaveFunc }}
    >
      {children}
    </ChangedContext.Provider>
  );
};

export const useChanged = () => useContext(ChangedContext);