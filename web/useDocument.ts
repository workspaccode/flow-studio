import {useCallback,useEffect,useRef,useState} from 'react';
import type {Metadata,Project,ProjectStatus} from './model';
import {copyProject} from './model';
import {core} from './engine';
import {api} from './api';
interface Document {project:Project;status:ProjectStatus;revision:number;past:Project[];future:Project[]}
export function useDocument(metadata:Metadata,initial:Project){
 const [doc,setDoc]=useState<Document>(()=>({project:core.validate(initial),status:metadata.status,revision:0,past:[],future:[]}));
 const [saveState,setSaveState]=useState<'saved'|'dirty'|'saving'|'error'>('saved'),[saveError,setSaveError]=useState('');
 const current=useRef(doc),saved=useRef(0),queue=useRef<Promise<void>>(Promise.resolve()),mounted=useRef(true);current.current=doc;
 useEffect(()=>()=>{mounted.current=false;},[]);
 const commit=useCallback((change:(p:Project)=>void)=>{const old=current.current,next=copyProject(old.project);change(next);core.validate({...next,assets:{}});if(JSON.stringify({...next,assets:undefined})===JSON.stringify({...old.project,assets:undefined})&&Object.keys(next.assets).length===Object.keys(old.project.assets).length&&Object.entries(next.assets).every(([key,asset])=>asset===old.project.assets[key]))return;if(!next.title.trim()||next.title.length>100)throw new Error('اسم المشروع مطلوب وبحد أقصى 100 حرف');const updated={...old,project:next,revision:old.revision+1,past:[...old.past.slice(-49),old.project],future:[]};current.current=updated;setDoc(updated);setSaveState('dirty');},[]);
 const undo=useCallback(()=>{const old=current.current;if(!old.past.length)return;const next={...old,project:old.past.at(-1)!,past:old.past.slice(0,-1),future:[old.project,...old.future],revision:old.revision+1};current.current=next;setDoc(next);setSaveState('dirty');},[]);
 const redo=useCallback(()=>{const old=current.current;if(!old.future.length)return;const next={...old,project:old.future[0],past:[...old.past,old.project],future:old.future.slice(1),revision:old.revision+1};current.current=next;setDoc(next);setSaveState('dirty');},[]);
 const status=useCallback((status:ProjectStatus)=>{const next={...current.current,status,revision:current.current.revision+1};current.current=next;setDoc(next);setSaveState('dirty');},[]);
 const flush=useCallback(async()=>{const operation=queue.current.catch(()=>{}).then(async()=>{while(saved.current<current.current.revision){const snap=current.current;if(mounted.current)setSaveState('saving');try{await api.save(metadata.id,snap.project,snap.status);saved.current=snap.revision;if(mounted.current){setSaveError('');setSaveState(saved.current===current.current.revision?'saved':'dirty');}}catch(e){if(mounted.current){setSaveState('error');setSaveError(String(e instanceof Error?e.message:e));}throw e;}}});queue.current=operation;return operation;},[metadata.id]);
 useEffect(()=>{if(!doc.revision)return;const timer=setTimeout(()=>{void flush().catch(()=>{});},700);return()=>clearTimeout(timer);},[doc.revision,flush]);
 useEffect(()=>{const guard=(event:BeforeUnloadEvent)=>{if(saved.current<current.current.revision){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 return{...doc,commit,undo,redo,setStatus:status,flush,saveState,saveError};
}
export type DocumentController=ReturnType<typeof useDocument>;
