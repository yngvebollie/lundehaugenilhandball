import {demo} from "../beta";
export const developmentVisible=demo||process.env.NEXT_PUBLIC_DEVELOPMENT_ENABLED==="true";
export const plannerBridge=developmentVisible&&(demo||process.env.NEXT_PUBLIC_DEVELOPMENT_PLANNER==="true");
