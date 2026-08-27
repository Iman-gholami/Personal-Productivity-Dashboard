'use client';

import {Moon,Sun} from 'lucide-react';
import {useEffect,useState} from 'react';

export type AppTheme='dark'|'light';
const THEME_KEY='lifeos_theme';

function applyTheme(theme:AppTheme){
  document.documentElement.dataset.theme=theme;
  document.documentElement.style.colorScheme=theme;
}

export function ThemeToggle({compact=false}:{compact?:boolean}){
  const [theme,setTheme]=useState<AppTheme>('dark');
  const [mounted,setMounted]=useState(false);

  useEffect(()=>{
    const stored=localStorage.getItem(THEME_KEY) as AppTheme|null;
    const next=stored==='light'||stored==='dark'?stored:'dark';
    setTheme(next);
    applyTheme(next);
    setMounted(true);
  },[]);

  function toggle(){
    const next:AppTheme=theme==='dark'?'light':'dark';
    setTheme(next);
    localStorage.setItem(THEME_KEY,next);
    applyTheme(next);
  }

  return <button
    type="button"
    onClick={toggle}
    className={compact?'theme-toggle theme-toggle-compact':'theme-toggle'}
    aria-label={theme==='dark'?'Switch to light theme':'Switch to dark theme'}
    title={theme==='dark'?'Light theme':'Dark theme'}
  >
    {mounted&&theme==='light'?<Moon size={15}/>:<Sun size={15}/>}
    {!compact&&<span>{mounted&&theme==='light'?'Dark':'Light'}</span>}
  </button>;
}
