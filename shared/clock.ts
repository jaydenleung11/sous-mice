/** Wall-clock scheduler around a deterministic 30Hz sim. Timer jitter must not slow service. */
export class FixedClock{
 previous:number;accumulator=0;
 constructor(readonly step:()=>void,readonly now=()=>performance.now()){this.previous=now();}
 advance(){const current=this.now();this.accumulator+=Math.min(250,Math.max(0,current-this.previous));this.previous=current;while(this.accumulator+1e-7>=1000/30){this.step();this.accumulator-=1000/30;}}
}
