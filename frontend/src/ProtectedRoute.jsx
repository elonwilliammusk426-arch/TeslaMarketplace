import React from 'react';
import {useAuth} from './AuthContext';

export default function ProtectedRoute({roles=[],children,fallback=null}){
  const {isAuthenticated,role,loading}=useAuth();
  if(loading)return <section className="section"><div className="empty">Checking your session…</div></section>;
  if(!isAuthenticated)return fallback||<section className="section"><div className="empty">Please sign in to continue.</div></section>;
  if(roles.length&&!roles.includes(role))return <section className="section"><div className="empty">You do not have permission to view this area.</div></section>;
  return children;
}
