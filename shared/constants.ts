export const TICK_RATE=30, DT=1/TICK_RATE, SNAPSHOT_RATE=15;
export const WORLD_WIDTH=72, WORLD_HEIGHT=48;
export const BUTTON={USE:1,EAT:2,ATTACK:4,DODGE:8,ABILITY:16,TRAP:32,COLANDER:64,SPRINT:128,SNEAK:256,INSPECT:512,PING:1024,JUMP:2048,SENSE:4096,PEEK:8192,EAR:16384} as const;
export const DEFAULT_OPTIONS={duration:480,bots:true,difficulty:'normal' as const};
export const CLASSES={mouse:['scout','hauler','saboteur','rescuer'],chef:['head','sous','pastry']} as const;
export const TUNABLE={mouseSpeed:4.4,chefSpeed:3.6,mouseSprint:6.4,chefSprint:5,grabRange:1.1,cageSeconds:40,lockdownSeconds:3,initialRating:70,heistScale:1.75,pickupRespawn:12};
