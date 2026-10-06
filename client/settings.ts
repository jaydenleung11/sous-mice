export type Settings={muted:boolean;music:number;sfx:number;reduced:boolean;shake:boolean;subtitles:boolean;haptics:boolean;left:boolean;large:boolean;color:string;keys:Record<string,string>};
export const defaults:Settings={muted:true,music:.22,sfx:.6,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,shake:true,subtitles:true,haptics:false,left:false,large:false,color:'normal',keys:{use:'KeyE',eat:'KeyF',attack:'KeyQ',dodge:'Space',ability:'KeyR',trap:'KeyT',colander:'KeyC',inspect:'KeyI'}};
export function readSettings():Settings{try{return {...defaults,...JSON.parse(localStorage.getItem('sous-settings')||'{}')};}catch{return {...defaults};}}
export const settings=readSettings();
export function saveSettings(){localStorage.setItem('sous-settings',JSON.stringify(settings));applySettings();}
export function applySettings(){document.documentElement.dataset.motion=settings.reduced?'reduced':'full';document.documentElement.dataset.color=settings.color;document.documentElement.classList.toggle('left-handed',settings.left);document.documentElement.classList.toggle('large-controls',settings.large);}
