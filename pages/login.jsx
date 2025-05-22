
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const handleLogin = async () => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      router.push('/main');
    } else {
      alert(data.message || 'Login failed');
    }
  };

  return (
    <>
      <Head>
        <title>POS Login</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300">
        <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-800">เข้าสู่ระบบ POS</h1>

          <label className="block mb-2 text-sm font-medium text-gray-700">อีเมล</label>
          <input
            type="email"
            placeholder="email@example.com"
            className="w-full px-4 py-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label className="block mb-2 text-sm font-medium text-gray-700">รหัสผ่าน</label>
          <input
            type="password"
            placeholder="••••••••"
            className="w-full px-4 py-2 mb-6 border rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      </div>
    </>
  );
}
