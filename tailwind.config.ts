import type { Config } from 'tailwindcss';
export default { content:['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}'], theme:{extend:{colors:{ink:'#07080c'},boxShadow:{glow:'0 0 50px rgba(117,92,255,.12)'},fontFamily:{sans:['var(--font-inter)']}}},plugins:[] } satisfies Config;
