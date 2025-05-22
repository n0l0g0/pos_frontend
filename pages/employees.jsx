import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function EmployeesPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [showModal, setShowModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem('email');
    if (storedEmail) {
      setEmail(storedEmail);
      fetchUserFullName(storedEmail);
    }
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Response text:', text);
        return;
      }

      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    }
  };

  const fetchUserFullName = async (email) => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/users?email=${encodeURIComponent(email)}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFullName(data.name || email);
      } else {
        setFullName(email);
      }
    } catch (err) {
      console.error('Failed to fetch user full name:', err);
      setFullName(email);
    }
  };

  const handleSave = async () => {
    const newErrors = {};
    if (!form.name) newErrors.name = true;
    if (!form.email) newErrors.email = true;
    if (!form.password && !isEdit) newErrors.password = true;
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const url = isEdit ? `${API}/users/${editId}` : `${API}/users`;
      const method = isEdit ? 'PUT' : 'POST';

      const payload = isEdit
        ? { name: form.name, email: form.email, role: form.role }
        : { name: form.name, email: form.email, password: form.password, role: form.role };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setForm({ name: '', email: '', password: '', role: 'staff' });
        setErrors({});
        setShowModal(false);
        setIsEdit(false);
        setEditId(null);
        fetchEmployees();
      } else {
        const data = await res.json();
        console.error('Failed to save employee:', data);
      }
    } catch (err) {
      console.error('Failed to save employee:', err);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = confirm('Are you sure you want to delete this employee?');
    if (!confirmed) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email })
      });
      if (res.ok) fetchEmployees();
    } catch (err) {
      console.error('Failed to delete employee:', err);
    }
  };

  const handleResetPassword = async (id) => {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/users/${id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      if (res.ok) alert('Password updated.');
    } catch (err) {
      console.error('Failed to update password:', err);
    }
  };

  const handleEdit = (emp) => {
    setIsEdit(true);
    setEditId(emp._id);
    setForm({
      name: emp.name || '',
      email: emp.email || '',
      password: '',
      role: emp.role || 'staff'
    });
    setShowModal(true);
  };

  return (
    <>
      <Head>
        <title>Employees</title>
      </Head>
      <div className="bg-violet-600 text-white flex justify-between items-center px-6 py-3">
        <h1 className="text-xl font-semibold">👥 Employees</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm">User: <strong>{fullName || 'Unknown'}</strong></span>
          <button onClick={() => router.push('/main')} className="bg-white text-violet-600 px-4 py-1 rounded">Back to Menu</button>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">Employee List</h2>
            <button onClick={() => { setIsEdit(false); setForm({ name: '', email: '', password: '', role: 'staff' }); setShowModal(true); }} className="bg-green-600 text-white px-4 py-1 rounded">+ Add Employee</button>
          </div>

          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp._id} className="border-b">
                  <td className="p-2">{emp.name}</td>
                  <td className="p-2">{emp.email}</td>
                  <td className="p-2 capitalize">{emp.role || 'staff'}</td>
                  <td className="p-2 space-x-2">
                    <button onClick={() => handleResetPassword(emp._id)} className="bg-yellow-500 text-white px-3 py-1 rounded text-xs">Reset Password</button>
                    <button onClick={() => handleEdit(emp)} className="bg-blue-500 text-white px-3 py-1 rounded text-xs">Edit</button>
                    <button onClick={() => handleDelete(emp._id)} className="bg-red-500 text-white px-3 py-1 rounded text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr><td colSpan="4" className="text-center p-4 text-gray-500">No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px] space-y-4 shadow">
            <h3 className="text-lg font-semibold">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h3>
            <div>
              <label className="block text-sm mb-1">Full Name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`w-full border px-3 py-2 rounded ${errors.name ? 'border-red-500' : ''}`} />
            </div>
            <div>
              <label className="block text-sm mb-1">Email <span className="text-red-500">*</span></label>
              <input type="text" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`w-full border px-3 py-2 rounded ${errors.email ? 'border-red-500' : ''}`} />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm mb-1">Password <span className="text-red-500">*</span></label>
                <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`w-full border px-3 py-2 rounded ${errors.password ? 'border-red-500' : ''}`} />
              </div>
            )}
            <div>
              <label className="block text-sm mb-1">Role <span className="text-red-500">*</span></label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border px-3 py-2 rounded">
                <option value="staff">Staff</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowModal(false); setErrors({}); setForm({ name: '', email: '', password: '', role: 'staff' }); setIsEdit(false); setEditId(null); }} className="text-sm text-gray-500">Cancel</button>
              <button onClick={handleSave} className="bg-violet-600 text-white px-4 py-2 rounded text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
