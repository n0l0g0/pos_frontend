// 📁 frontend/pages/audit-log.jsx
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function AuditLogPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${API}/audit-log`);
        if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูล audit log ได้');
        const data = await res.json();
        setLogs(data);
      } catch (err) {
        console.error(err.message);
      }
    };

    const fetchUserInfo = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${API}/users/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        setFullName(data.name || data.email);
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }
    };

    fetchUserInfo();
    fetchLogs();
  }, []);

  const renderDetails = (log) => {
    if (log.action === 'create') {
      return (
        <pre className="text-xs bg-green-50 p-2 rounded overflow-auto">
          {JSON.stringify(log.dataAfter, null, 2)}
        </pre>
      );
    }
    if (log.action === 'update') {
      return (
        <div className="text-xs space-y-2">
          <pre className="bg-yellow-50 p-2 rounded overflow-auto">
            ก่อน:
            {JSON.stringify(log.dataBefore, null, 2)}
          </pre>
          <pre className="bg-blue-50 p-2 rounded overflow-auto">
            หลัง:
            {JSON.stringify(log.dataAfter, null, 2)}
          </pre>
        </div>
      );
    }
    if (log.action === 'delete') {
      return (
        <pre className="text-xs bg-red-50 p-2 rounded overflow-auto">
          {JSON.stringify(log.dataBefore, null, 2)}
        </pre>
      );
    }
    return <pre className="text-xs overflow-auto">{JSON.stringify(log, null, 2)}</pre>;
  };

  const filteredLogs = logs
    .filter(log => {
      if (!dateFilter) return true;
      const logDate = new Date(log.createdAt).toISOString().slice(0, 10);
      return logDate === dateFilter;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const displayedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <Head><title>ประวัติการแก้ไข</title></Head>
      <div className="bg-violet-600 text-white flex justify-between items-center px-6 py-3">
        <h1 className="text-xl font-semibold">🛆 ประวัติการแก้ไข</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm">พนักงาน: <strong>{fullName || 'ไม่ทราบชื่อ'}</strong></span>
          <button onClick={() => router.push('/main')} className="bg-white text-violet-600 px-4 py-1 rounded">กลับสู่เมนูหลัก</button>
        </div>
      </div>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">🔜️ ประวัติการแก้ไข</h1>
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between mb-4 items-center">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-2 py-1 rounded text-sm"
            />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">แสดง</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border px-2 py-1 rounded text-sm"
              >
                {[10, 20, 30, 40, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <span className="text-sm text-gray-500">รายการ/หน้า</span>
            </div>
          </div>
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">เวลา</th>
                <th className="p-2 text-left">ผู้ใช้งาน</th>
                <th className="p-2 text-left">กิจกรรม</th>
                <th className="p-2 text-left">เนื้อหา</th>
              </tr>
            </thead>
            <tbody>
              {displayedLogs.map((log, index) => (
                <tr key={index} className="border-b align-top">
                  <td className="p-2">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })
                      : 'ไม่พบเวลา'}
                  </td>
                  <td className="p-2">{log.email}</td>
                  <td className="p-2">{log.action}</td>
                  <td className="p-2">{renderDetails(log)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan="4" className="text-center p-4 text-gray-500">ไม่มีข้อมูล</td></tr>
              )}
            </tbody>
          </table>
          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
