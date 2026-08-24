import type {NextFunction,Request,Response} from 'express'; import jwt from 'jsonwebtoken';
export interface AuthRequest extends Request{userId?:string}
export function auth(req:AuthRequest,res:Response,next:NextFunction){const token=req.headers.authorization?.replace('Bearer ','');if(!token)return res.status(401).json({error:'Authentication required'});try{const data=jwt.verify(token,process.env.JWT_SECRET!) as {sub:string};req.userId=data.sub;next()}catch{return res.status(401).json({error:'Invalid or expired token'})}}
