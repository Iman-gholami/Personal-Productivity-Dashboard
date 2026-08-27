import './globals.css';
import {Inter,Vazirmatn} from 'next/font/google';

const inter=Inter({subsets:['latin'],variable:'--font-inter'});
const vazirmatn=Vazirmatn({subsets:['arabic'],variable:'--font-vazirmatn'});
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
  return <html lang="fa" data-theme="dark" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{__html:themeScript}}/></head>
    <body className={inter.variable+' '+vazirmatn.variable}>{children}</body>
  </html>;
}
