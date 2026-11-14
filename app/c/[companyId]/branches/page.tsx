"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";

export default function BranchesPage(){
  const params=useParams<{companyId:string}>(); const companyId=params.companyId;
  const [branches,setBranches]=useState<any[]>([]);
  const [show,setShow]=useState(false);
  const [form,setForm]=useState<any>({name:"",address:"",phone:""});
  const load=()=>fetch(`/api/branches?companyId=${companyId}`).then(r=>r.json()).then(d=>setBranches(d.branches||[]));
  useEffect(()=>{load()},[companyId]);
  const create=async(e:React.FormEvent)=>{
    e.preventDefault();
    await fetch("/api/branches",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companyId,...form})});
    setShow(false); load();
  };
  return (
    <AppShell companyId={companyId}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">الفروع والمستودعات</h1>
          <p className="text-xs text-slate-500">إدارة الفروع ومراكز التكلفة والمستودعات</p>
        </div>
        <button onClick={()=>setShow(true)} className="bg-[#0f2a54] text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ فرع جديد</button>
      </div>
      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {branches.map(b=>(
          <div key={b.id} className="bg-white border rounded-2xl p-5">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">🏢</div>
            <div className="font-bold mt-3">{b.name} {b.isMain && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">رئيسي</span>}</div>
            <div className="text-xs text-slate-500 mt-1">{b.address||"بدون عنوان"}</div>
            <div className="text-xs text-slate-500">{b.phone||""}</div>
          </div>
        ))}
      </div>
      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-[480px] p-6">
            <h2 className="font-bold text-[#0f2a54]">إضافة فرع</h2>
            <input required placeholder="اسم الفرع *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full mt-3 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <input placeholder="العنوان" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} className="w-full mt-3 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <input placeholder="الهاتف" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full mt-3 border rounded-xl px-3 py-2.5 bg-slate-50" />
            <div className="flex gap-2 mt-6"><button type="submit" className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ</button><button type="button" onClick={()=>setShow(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button></div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
