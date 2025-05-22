import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function MainMenuPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      localStorage.clear();
      router.push('/login');
      return;
    }
  
    const fetchUserInfo = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${API}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Unauthorized');
        const data = await res.json();
        setUser(data);
        localStorage.setItem('email', data.email);
        localStorage.setItem('role', data.role);
      } catch (err) {
        console.error('Failed to fetch user info:', err);
        localStorage.clear(); // 👉 เคลียร์ token ที่เสีย
        router.push('/login');
      }
    };
  
    fetchUserInfo();
  }, []);
  
  return (
    <>
      <Head><title>Main Menu - POS</title></Head>
      <div className="bg-violet-600 text-white flex justify-between items-center px-6 py-3">
        <h1 className="text-xl font-semibold">📋 เมนูหลัก</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm">User: <strong>{user?.name || 'Unknown'}</strong></span>
          <button onClick={() => {
            localStorage.clear();
            router.push('/login');
          }} className="bg-white text-violet-600 px-4 py-1 rounded">ออกจากระบบ</button>
        </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <button onClick={() => router.push('/pos')} className="bg-white shadow rounded-xl flex flex-col items-center p-4 hover:shadow-md">
            <div className="text-4xl">🛒</div>
            <span className="mt-2 text-sm font-medium">Point of Sale</span>
          </button>

          <button onClick={() => router.push('/inventory')} className="bg-white shadow rounded-xl flex flex-col items-center p-4 hover:shadow-md">
            <div className="text-4xl">📦</div>
            <span className="mt-2 text-sm font-medium">Inventory</span>
          </button>

          {user?.role === 'owner' && (
            <>
              <button onClick={() => router.push('/sales')} className="bg-white shadow rounded-xl flex flex-col items-center p-4 hover:shadow-md">
                <div className="text-4xl">📈</div>
                <span className="mt-2 text-sm font-medium">Sales</span>
              </button>
              <button onClick={() => router.push('/audit-log')} className="bg-white shadow rounded-xl flex flex-col items-center p-4 hover:shadow-md">
                <div className="text-4xl">📜</div>
                <span className="mt-2 text-sm font-medium">Audit Log</span>
              </button>
              <button onClick={() => router.push('/employees')} className="bg-white shadow rounded-xl flex flex-col items-center p-4 hover:shadow-md">
                <div className="text-4xl">👥</div>
                <span className="mt-2 text-sm font-medium">Employees</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
