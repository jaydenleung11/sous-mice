import {settings} from './settings';
class AudioEngine{
 ctx?:AudioContext;timer?:number;note=0;
 unlock(){if(!this.ctx)this.ctx=new AudioContext();if(this.ctx.state==='suspended')void this.ctx.resume();}
 tone(freq:number,duration=.1,volume=.12,type:OscillatorType='sine',pan=0){if(settings.muted||!this.ctx)return;const t=this.ctx.currentTime;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),p=this.ctx.createStereoPanner();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(freq*.6,t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume*settings.sfx,t+.008);g.gain.exponentialRampToValueAtTime(.001,t+duration);p.pan.value=pan;o.connect(g).connect(p).connect(this.ctx.destination);o.start(t);o.stop(t+duration+.02);}
 ui(){this.tone(640,.07,.12);}
 event(kind:string,pan=0){const win=/deliver|send|rescue|pickup|eat|win/.test(kind);this.tone(win?720:kind==='capture'?160:340,win?.22:.14,.22,win?'triangle':'sine',pan);if(win)setTimeout(()=>this.tone(920,.15,.12,'triangle',pan),90);}
 music(on:boolean){clearInterval(this.timer);if(!on)return;this.timer=window.setInterval(()=>{if(settings.muted||!this.ctx||document.hidden)return;const notes=[220,0,330,392,0,330,293,0,196,0,293,349,0,293,261,0];const n=notes[this.note++%notes.length];if(n)this.tone(n,.23,settings.music*.16,'triangle');},260);}
}
export const audio=new AudioEngine();
