"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/Shell";
import { useParams } from "next/navigation";

export default function UsersPage(){
  const params=useParams<{companyId:string}>(); const companyId=params.companyId;
  const [users, setUsers]=useState<any[]>([]);
  const [show,setShow]=useState(false);
  const [form,setForm]=useState<any>({name:"",email:"",password:"",phone:"",role:"employee"});

  const load=()=>fetch(`/api/users?companyId=${companyId}`).then(r=>r.json()).then(d=>setUsers(d.users||[]));
  useEffect(()=>{load()},[companyId]);

  const create=async(e:React.FormEvent)=>{
    e.preventDefault();
    const r=await fetch("/api/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,companyId})});
    const j=await r.json();
    if(r.ok){ setShow(false); load(); } else alert(j.error);
  };

  return (
    <AppShell companyId={companyId}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold text-[#0f2a54]">المستخدمون والصلاحيات</h1>
          <p className="text-xs text-slate-500">RBAC مرن — أدوار مخصصة وصلاحيات قراءة/إضافة/تعديل/حذف/تصدير/اعتماد</p>
        </div>
        <button onClick={()=>setShow(true)} className="bg-[#0f2a54] text-white px-5 py-2.5 rounded-xl font-bold text-sm">+ مستخدم جديد</button>
      </div>

      <div className="mt-4 bg-white border rounded-2xl p-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map(u=>(
            <div key={u.id} className="border rounded-2xl p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0f2a54] to-blue-600 text-white flex items-center justify-center font-bold">{u.name?.[0]}</div>
                <div>
                  <div className="font-bold text-sm">{u.name}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                  <div className="text-xs"><span className="bg-slate-100 px-2 py-0.5 rounded-full">{u.memberRole}</span> {u.phone||""}</div>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-3">الصلاحيات حسب الدور — يمكن تخصيصها في إعدادات الأدوار</div>
            </div>
          ))}
        </div>
        {users.length===0 && <div className="text-center text-slate-400 py-8">لا يوجد مستخدمون — العزل يضمن عدم ظهور مستخدمي الشركات الأخرى</div>}
      </div>

      <div className="mt-6 bg-white border rounded-2xl p-5">
        <div className="font-bold text-[#0f2a54]">الأدوار المتاحة</div>
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          {[
            { name:"مدير الشركة", desc:"وصول كامل لكل الوحدات", perms:"كل الصلاحيات" },
            { name:"محاسب", desc:"المالية والتقارير", perms:"قراءة/إنشاء/تصدير" },
            { name:"مسؤول مخزون", desc:"المخزون والمشتريات", perms:"إدارة المستودعات" },
            { name:"مسؤول مبيعات", desc:"المبيعات والعملاء", perms:"فواتير وعروض" },
            { name:"مسؤول موارد بشرية", desc:"الموظفون والرواتب", perms:"ملفات ورواتب" },
            { name:"موظف", desc:"المهام فقط", perms:"قراءة/إنشاء مهام" },
          ].map(r=>(
            <div key={r.name} className="border rounded-xl p-3 bg-slate-50">
              <div className="font-bold text-sm">{r.name}</div>
              <div className="text-xs text-slate-500">{r.desc}</div>
              <div className="text-xs bg-white border inline-block px-2 py-1 rounded-full mt-2">{r.perms}</div>
            </div>
          ))}
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={create} className="bg-white rounded-2xl w-full max-w-[520px] p-6">
            <h2 className="font-bold text-[#0f2a54]">إضافة مستخدم للشركة</h2>
            <div className="grid gap-3 mt-4">
              <input required placeholder="الاسم الكامل *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input required placeholder="البريد الإلكتروني *" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input required placeholder="كلمة المرور *" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <input placeholder="الهاتف" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="border rounded-xl px-3 py-2.5 bg-slate-50" />
              <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="border rounded-xl px-3 py-2.5 bg-slate-50">
                <option value="employee">موظف</option><option value="company_admin">مدير الشركة</option><option value="accountant">محاسب</option><option value="sales_manager">مسؤول مبيعات</option><option value="inventory_manager">مسؤول مخزون</option><option value="hr_manager">مسؤول موارد بشرية</option>
              </select>
            </div>
            <div className="flex gap-2 mt-6"><button type="submit" className="flex-1 bg-[#0f2a54] text-white py-2.5 rounded-xl font-bold">حفظ</button><button type="button" onClick={()=>setShow(false)} className="flex-1 border py-2.5 rounded-xl">إلغاء</button></div>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">سيتم عزل بيانات هذا المستخدم — لن يرى إلا بيانات هذه الشركة فقط حتى عبر تعديل الرابط.</div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
