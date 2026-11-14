"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";

export default function TasksPage(){
  const params=useParams<{companyId:string}>(); const companyId=params.companyId;
  const [tasks,setTasks]=useState<any[]>([]);
  const [show,setShow]=useState(false);
  const [form,setForm]=useState<any>({title:"",description:"",priority:"medium",dueDate:""});
  const load=()=>fetch(`/api/tasks?companyId=${companyId}`).then(r=>r.json()).then(d=>setTasks(d.tasks||[]));
  useEffect(()=>{load()},[companyId]);
  const create=async(e:React.FormEvent)=>{
    e.preventDefault();
    await fetch("/api/tasks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId,...form})});
    setShow(false); load();
  };
  return (
    <AppShell companyId={companyId}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">المهام والموافقات</h1>
          <p className="text-xs text-slate-500">مسارات موافقة قابلة للتخصيص وإشعارات داخل النظام</p>
        </div>
        <button onClick={()=>setShow(true)} className="bg-[#0f2a54] text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ مهمة جديدة</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {["pending","in_progress","completed"].map(status=>(
          <div key={status} className="bg-white border rounded-2xl p-4">
            <div className="font-bold text-sm mb-3">{status==="pending"?"معلقة":status==="in_progress"?"قيد التنفيذ":"مكتملة"} ({tasks.filter(t=>t.status===status).length})</div>
            <div className="space-y-2">
              {tasks.filter(t=>t.status===status).map(t=>(
                <div key={t.id} className="border rounded-xl p-3 bg-slate-50">
                  <div className="font-bold text-sm">{t.title}</div>
                  <div className="text-xs text-slate-500">{t.description||"—"}</div>
                  <div className="text-xs mt-2"><span className={`px-2 py-1 rounded-full ${t.priority==="high"?"bg-red-100 text-red-700":t.priority==="urgent"?"bg-red-600 text-white":"bg-slate-100"}`}>{t.priority}</span> {t.dueDate?new Date(t.dueDate).toLocaleDateString("ar-SA"):""}</div>
                </div>
              ))}
              {tasks.filter(t=>t.status===status).length===0 && <div className="text-xs text-slate-400 text-center py-6">لا مهام</div>}
            </div>
          </div>
        ))}
      </div>
      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-[520px] p-6">
            <h2 className="font-bold text-[#0f2a54]">مهمة جديدة</h2>
            <input required placeholder="عنوان المهمة *" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full mt-3 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <textarea placeholder="الوصف" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full mt-3 border rounded-xl p-3 bg-slate-50" />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="border rounded-xl px-3 py-2.5 bg-slate-50"><option value="low">منخفضة</option><option value="medium">متوسطة</option><option value="high">عالية</option><option value="urgent">عاجلة</option></select>
              <input type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
            </div>
            <div className="flex gap-2 mt-6"><button type="submit" className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ</button><button type="button" onClick={()=>setShow(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button></div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
