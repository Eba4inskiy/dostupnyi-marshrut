"use client";
import {Moon,Sun} from "lucide-react";
import {useTheme} from "next-themes";
import {useEffect,useState} from "react";
import {Button} from "@/components/ui/button";

export default function ThemeToggle() {
  const {resolvedTheme,setTheme}=useTheme();
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  const dark=mounted&&resolvedTheme==="dark";
  const label=dark?"Увімкнути світлу тему":"Увімкнути темну тему";
  return <Button variant="outline" size="icon" className="theme-toggle" disabled={!mounted} title={label} aria-label={label} aria-pressed={dark} onClick={()=>setTheme(dark?"light":"dark")}>{dark?<Sun size={19}/>:<Moon size={19}/>}</Button>;
}
