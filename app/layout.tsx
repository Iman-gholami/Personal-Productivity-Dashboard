import './globals.css'; import { Inter } from 'next/font/google';
const inter=Inter({subsets:['latin'],variable:'--font-inter'});
export const metadata={title:'LifeOS — Command your day',description:'Your personal productivity operating system'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body className={inter.variable+' font-sans'}>{children}</body></html>}
