"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { createDemoState, transition, type CommunityAction, type CommunityState } from "@/lib/community";
const Context = createContext<{state:CommunityState;setState:React.Dispatch<React.SetStateAction<CommunityState>>;run:(actor:string,action:CommunityAction)=>string|null}|null>(null);
export function CommunityProvider({children}:{children:ReactNode}) {
  const [state,setState]=useState(createDemoState);
  function run(actor:string,action:CommunityAction) { try { const next=transition(state,actor,action);setState(next);return null; } catch(error) { return error instanceof Error?error.message:"처리하지 못했어요."; } }
  return <Context.Provider value={{state,setState,run}}>{children}</Context.Provider>;
}
export function useCommunity(){const context=useContext(Context);if(!context)throw new Error("CommunityProvider required");return context;}
