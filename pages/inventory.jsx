// 📁 pages/inventory.jsx
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Select from 'react-select';
import { generateSKU } from '../utils/sku';

export default function InventoryPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', category: '', unit: null, price: '', stock: '' });
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const searchRef = useRef(null);
  const initialized = useRef(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAddProduct = () => {
    setEditProduct(null);
    setForm({ name: '', sku: '', category: '', unit: null, price: '', stock: '' });
    setShowModal(true);
  };

  const handleSaveProduct = async (updatedForm = form) => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const skuToUse = updatedForm.sku.trim() || generateSKU();
      const payload = {
        name: updatedForm.name,
        sku: skuToUse,
        category: updatedForm.category,
        unit: updatedForm.unit ? updatedForm.unit.value : '',
        price: parseFloat(updatedForm.price),
        stock: parseInt(updatedForm.stock),
        breakdown: updatedForm.breakdown
      };

      const url = updatedForm._id ? `${API}/products/${updatedForm._id}` : `${API}/products`;
      const method = updatedForm._id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('บันทึกสินค้าล้มเหลว');

      setAlertMessage(updatedForm._id ? 'แก้ไขสินค้าเรียบร้อยแล้ว' : 'เพิ่มสินค้าสำเร็จแล้ว');
      setTimeout(() => setAlertMessage(''), 3000);
      setShowModal(false);
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      console.error('ไม่สามารถบันทึกสินค้าได้:', err);
    }
  };

  const fetchUnits = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/units`);
      const data = await res.json();
      const formatted = data.map(u => ({ value: u.name, label: u.name }));
      setUnits(formatted);
    } catch (err) {
      console.error('ไม่สามารถโหลดหน่วยนับได้:', err);
    }
  };

  const fetchUserFullName = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/users/me`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      setFullName(data.name || data.email);
    } catch (err) {
      console.error('ไม่สามารถโหลดชื่อผู้ใช้:', err);
    }
  };

  useEffect(() => {
    fetchUserFullName();
    fetchProducts();
    fetchUnits();
    if (!initialized.current) {
      searchRef.current?.focus();
      initialized.current = true;
    }
  }, []);

  useEffect(() => {
    if (editProduct && units.length > 0) {
      const matchedUnit = units.find(u => u.value === editProduct.unit || u.label === editProduct.unit);
      setForm({
        name: editProduct.name,
        sku: editProduct.sku,
        category: editProduct.category,
        unit: matchedUnit || null,
        price: editProduct.price,
        stock: editProduct.stock,
        _id: editProduct._id
      });
    }
  }, [editProduct, units]);

  useEffect(() => {
    const lowStock = products.filter(p => p.stock <= 10);
    setLowStockProducts(lowStock);
  }, [products]);

  const fetchProducts = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/products`);
      const data = await res.json();
      setProducts(data);
      const lowStock = data.filter(p => p.stock <= 10);
      setLowStockProducts(lowStock);
    } catch (err) {
      console.error('ไม่สามารถโหลดสินค้าได้:', err);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = confirm('คุณต้องการลบสินค้านี้หรือไม่?');
    if (!confirmed) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/products/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('ลบสินค้าไม่สำเร็จ');
      setAlertMessage('ลบสินค้าสำเร็จแล้ว');
      setTimeout(() => setAlertMessage(''), 3000);
      fetchProducts();
    } catch (err) {
      console.error('เกิดข้อผิดพลาดในการลบสินค้า:', err);
    }
  };

  const handleEdit = (product) => {
    setEditProduct(product);
    setShowModal(true);
  };

  const filteredProducts = products
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'asc') return a.stock - b.stock;
      if (sortOrder === 'desc') return b.stock - a.stock;
      return 0;
    });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <Head>
        <title>Inventory</title>
      </Head>
      
      <div className="bg-violet-600 text-white flex justify-between items-center px-6 py-3">
        <h1 className="text-xl font-semibold">📦 คลังสินค้า</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm">พนักงาน: <strong>{fullName || 'ไม่ทราบชื่อ'}</strong></span>
          <button onClick={() => router.push('/main')} className="bg-white text-violet-600 px-4 py-1 rounded">กลับสู่เมนูหลัก</button>
        </div>
      </div>
      {lowStockProducts.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded mb-4">
          <strong>สินค้าใกล้หมด:</strong>
          <ul className="list-disc list-inside text-sm mt-2">
            {lowStockProducts.map((p) => (
              <li key={p._id}>{p.name} (เหลือ {p.stock})</li>
            ))}
          </ul>
        </div>
      )}
      {alertMessage && <div className="bg-green-100 text-green-700 p-2 text-center">{alertMessage}</div>}

      <div className="p-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">รายการสินค้า</h2>
            <button onClick={handleAddProduct} className="bg-violet-600 text-white px-4 py-2 rounded">➕ เพิ่มสินค้า</button>
          </div>

          <div className="flex justify-between items-center mb-4">
            <input
              ref={searchRef}
              type="text"
              placeholder="🔍 ค้นหาสินค้า ชื่อ, SKU, หรือหมวดหมู่"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border px-4 py-2 rounded"
            />
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-4 border px-2 py-1 rounded"
            >
              {[10, 20, 30, 40, 50].map(n => <option key={n} value={n}>{n} รายการ/หน้า</option>)}
            </select>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left text-sm">
                  <th className="border px-4 py-2">ชื่อสินค้า</th>
                  <th className="border px-4 py-2">SKU</th>
                  <th className="border px-4 py-2">หมวดหมู่</th>
                  <th className="border px-4 py-2">หน่วย</th>
                  <th className="border px-4 py-2">หน่วยย่อย</th>
                  <th className="border px-4 py-2">ราคา</th>
                  <th className="border px-4 py-2 cursor-pointer" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                    จำนวนคงเหลือ {sortOrder === 'asc' ? '⬆️' : sortOrder === 'desc' ? '⬇️' : '⬍'}
                  </th>
                  <th className="border px-4 py-2">การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {displayedProducts.map(p => (
                  <tr key={p._id} className="text-sm hover:bg-gray-50">
                    <td className="border px-4 py-2">{p.name}</td>
                    <td className="border px-4 py-2">{p.sku}</td>
                    <td className="border px-4 py-2">{p.category}</td>
                    <td className="border px-4 py-2">{p.unit}</td>
                    <td className="border px-4 py-2">
                   {Array.isArray(p.breakdown) && p.breakdown.length > 0 ? (
                        <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                          {p.breakdown.map((b, i) => (
                            <li key={i}>1 {p.unit} = {b.qty} {b.unit}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-gray-400 text-xs">ไม่มี</span>
                      )}
                    </td>
                    <td className="border px-4 py-2">฿{p.price}</td>
                    <td className="border px-4 py-2">{p.stock}</td>
                    <td className="border px-4 py-2 space-x-2">
                      <button onClick={() => handleEdit(p)} className="bg-blue-500 text-white px-3 py-1 rounded text-sm">แก้ไข</button>
                      <button onClick={() => handleDelete(p._id)} className="bg-red-500 text-white px-3 py-1 rounded text-sm">ลบ</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && <div className="text-center text-gray-500 py-4">ไม่พบข้อมูลสินค้า</div>}
          </div>

          <div className="flex justify-center mt-4 gap-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-3 py-1 rounded ${currentPage === i + 1 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{i + 1}</button>
            ))}
          </div>
        </div>
      </div>
            
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[400px] space-y-4 shadow">
            <h3 className="text-lg font-semibold">{editProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h3>
            <input type="text" placeholder="ชื่อสินค้า" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <input type="text" placeholder="SKU (เว้นว่างให้รันอัตโนมัติ)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <input type="text" placeholder="หมวดหมู่" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <Select options={units} onChange={(selected) => setForm({ ...form, unit: selected })} value={form.unit} placeholder="เลือกหน่วยหลัก" className="text-sm" />
            <input type="number" placeholder="ราคา" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <input type="number" placeholder="จำนวนคงเหลือ" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full border px-3 py-2 rounded" />
            <div className="border-t pt-2">
              <h4 className="text-sm font-semibold">แยกหน่วยย่อย</h4>
              {(form.breakdown || []).map((b, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Select
                    options={units}
                    value={units.find(u => u.value === b.unit)}
                    onChange={(selected) => {
                      const updated = [...form.breakdown];
                      updated[i].unit = selected.value;
                      setForm({ ...form, breakdown: updated });
                    }}
                    className="w-1/2 text-sm"
                    placeholder="หน่วย"
                  />
                  <input
                    type="number"
                    placeholder="จำนวน"
                    value={b.qty}
                    onChange={(e) => {
                      const updated = [...form.breakdown];
                      updated[i].qty = parseInt(e.target.value);
                      setForm({ ...form, breakdown: updated });
                    }}
                    className="w-1/2 border px-2 py-1 rounded"
                  />
                </div>
              ))}
              <button onClick={() => setForm({ ...form, breakdown: [...(form.breakdown || []), { unit: '', qty: 1 }] })} className="text-sm text-blue-600">+ เพิ่มหน่วยย่อย</button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => { setShowModal(false); setEditProduct(null); }} className="text-sm text-gray-500">ยกเลิก</button>
              <button
  onClick={() => {
    const cleanedBreakdown = (form.breakdown || []).filter(b => b.unit && b.qty);
    setForm(prev => {
      const updatedForm = { ...prev, breakdown: cleanedBreakdown };
      handleSaveProduct(updatedForm);
      return updatedForm;
    });
  }}
  className="bg-violet-600 text-white px-4 py-2 rounded text-sm"
>
  บันทึก
</button>

            </div>
          </div>
        </div>
      )}
    </>
  );
}
