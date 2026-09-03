import React,{createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';

const API=(import.meta.env.VITE_API_URL||'').replace(/\/$/,'');
const AuthContext=createContext(null);

function readUser(){
  try{return JSON.parse(localStorage.getItem('tm_user')||'null')}catch{return null}
}

function legacyAuth(){
  const token=localStorage.getItem('tm_token')||'';
  const user=readUser();
  const role=user?.role||localStorage.getItem('tm_role')||null;
  return {token,user,role,isAuthenticated:Boolean(token),loading:false,login:()=>{},logout:()=>{},refresh:async()=>user};
}

export function AuthProvider({children}){
  const [token,setToken]=useState(()=>localStorage.getItem('tm_token')||'');
  const [user,setUser]=useState(readUser);
  const [loading,setLoading]=useState(Boolean(token));

  const logout=useCallback(()=>{
    localStorage.removeItem('tm_token');localStorage.removeItem('tm_user');localStorage.removeItem('tm_role');
    setToken('');setUser(null);
  },[]);

  const refresh=useCallback(async()=>{
    const current=localStorage.getItem('tm_token')||'';
    if(!current){setLoading(false);return null}
    try{
      const response=await fetch(`${API}/api/me`,{headers:{Authorization:`Bearer ${current}`}});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'Session expired');
      const nextUser=payload.data;
      localStorage.setItem('tm_user',JSON.stringify(nextUser));localStorage.setItem('tm_role',nextUser.role||'customer');
      setToken(current);setUser(nextUser);return nextUser;
    }catch{logout();return null}finally{setLoading(false)}
  },[logout]);

  useEffect(()=>{refresh()},[refresh]);

  const login=useCallback((payload)=>{
    const nextToken=payload?.token||'';const nextUser=payload?.user||null;
    if(!nextToken||!nextUser)throw new Error('Invalid authentication response');
    localStorage.setItem('tm_token',nextToken);localStorage.setItem('tm_user',JSON.stringify(nextUser));localStorage.setItem('tm_role',nextUser.role||'customer');
    setToken(nextToken);setUser(nextUser);setLoading(false);
  },[]);

  const value=useMemo(()=>({token,user,role:user?.role||null,isAuthenticated:Boolean(token&&user),loading,login,logout,refresh}),[token,user,loading,login,logout,refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){return useContext(AuthContext)||legacyAuth()}
