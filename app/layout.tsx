import './globals.css';
import {Inter} from 'next/font/google';

const inter=Inter({subsets:['latin'],variable:'--font-inter'});
export const metadata={title:'LifeOS — Command your day',description:'Your personal productivity operating system'};

const themeScript=`
(function(){
  try{
    var theme=localStorage.getItem('lifeos_theme');
    if(theme!=='light'&&theme!=='dark') theme='dark';
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
  }catch(e){}
})();
`;

export default function Layout({children}:{children:React.ReactNode}){
  return <html lang="en" data-theme="dark" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head>
    <body className={inter.variable+' font-sans'}>{children}</body>
  </html>;
}
