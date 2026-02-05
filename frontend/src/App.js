import React, { useState } from 'react';
import axios from 'axios';
import { Activity, Upload, User, LayoutDashboard, Database, AlertCircle } from 'lucide-react';

export default function App() {
  const [tab, setTab] = useState('single'); // 'single' hoặc 'batch'
  const [result, setResult] = useState(null);
  const [batchResults, setBatchResults] = useState([]);
  const [form, setForm] = useState({ tenure: 1, MonthlyCharges: 70, TotalCharges: 70 });

  const handleSinglePredict = async () => {
    const res = await axios.post('http://127.0.0.1:5000/predict', form);
    setResult(res.data);
  };

  const handleFileUpload = async (e) => {
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    const res = await axios.post('http://127.0.0.1:5000/predict_batch', formData);
    setBatchResults(res.data.data);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar chuyên nghiệp */}
      <div className="w-64 bg-slate-900 text-white p-6 hidden md:block">
        <div className="flex items-center gap-3 mb-10 text-blue-400">
          <Activity size={28} /> <span className="font-black tracking-tighter text-xl">3G TELECOM AI</span>
        </div>
        <nav className="space-y-2">
          <button onClick={() => setTab('single')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${tab==='single' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            <User size={18}/> Phân tích đơn lẻ
          </button>
          <button onClick={() => setTab('batch')} className={`w-full flex items-center gap-3 p-3 rounded-lg ${tab==='batch' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}>
            <Database size={18}/> Dự báo hàng loạt
          </button>
        </nav>
      </div>

      {/* Nội dung chính */}
      <main className="flex-1 p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Hệ thống phát hiện bất thường cước phí</h1>
            <p className="text-slate-500 text-sm">Dự án thực tập tại 3G Vietnam Telecommunications</p>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-400">SERVER STATUS: ONLINE</div>
        </header>

        {tab === 'single' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form nhập liệu */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="font-bold mb-4 flex items-center gap-2"><LayoutDashboard size={16}/> Nhập thông số</h3>
               <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Tháng sử dụng (Tenure)</label>
                    <input type="number" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500" 
                           value={form.tenure} onChange={e => setForm({...form, tenure: e.target.value})}/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase">Cước hàng tháng ($)</label>
                    <input type="number" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500" 
                           value={form.MonthlyCharges} onChange={e => setForm({...form, MonthlyCharges: e.target.value})}/>
                  </div>
                  <button onClick={handleSinglePredict} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 hover:scale-[1.02] transition-transform">
                    PHÂN TÍCH NGAY
                  </button>
               </div>
            </div>

            {/* Kết quả trực quan */}
            <div className="lg:col-span-2 bg-slate-900 rounded-3xl p-8 text-white flex flex-col items-center justify-center relative overflow-hidden">
               {result ? (
                 <div className="text-center z-10">
                    <div className={`inline-block p-4 rounded-full mb-4 ${result.prediction === 'Anomaly' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                      <AlertCircle size={48}/>
                    </div>
                    <h2 className="text-4xl font-black mb-2">{result.prediction === 'Anomaly' ? 'BẤT THƯỜNG' : 'BÌNH THƯỜNG'}</h2>
                    <div className="text-6xl font-mono font-bold text-blue-400">{result.risk_score}%</div>
                    <p className="opacity-50 mt-2 italic text-sm">Xác suất rủi ro dựa trên mô hình Random Forest</p>
                 </div>
               ) : (
                 <p className="opacity-20 text-xl font-bold">CHƯA CÓ DỮ LIỆU PHÂN TÍCH</p>
               )}
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            </div>
          </div>
        ) : (
          /* Giao diện Upload File */
          <div className="bg-white p-10 rounded-3xl shadow-sm border-2 border-dashed border-slate-200 text-center">
            <Upload size={48} className="mx-auto text-slate-300 mb-4" />
            <h2 className="text-xl font-bold mb-2">Tải lên danh sách khách hàng (CSV)</h2>
            <p className="text-slate-400 mb-6 text-sm">Hệ thống sẽ tự động quét toàn bộ danh sách để tìm các điểm bất thường.</p>
            <input type="file" onChange={handleFileUpload} className="hidden" id="fileUpload" />
            <label htmlFor="fileUpload" className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold cursor-pointer hover:bg-slate-700">Chọn File CSV</label>

            {batchResults.length > 0 && (
              <div className="mt-10 overflow-x-auto text-left">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px]">
                      <th className="p-4">Khách hàng</th><th className="p-4">Mức rủi ro</th><th className="p-4">Trạng thái AI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((r, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="p-4 font-bold">{r.Customer}</td>
                        <td className="p-4 text-blue-600 font-mono">{r.Risk}</td>
                        <td className={`p-4 font-bold ${r.Status === 'Anomaly' ? 'text-red-500' : 'text-emerald-500'}`}>{r.Status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}