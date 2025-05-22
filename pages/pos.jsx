// 📁 frontend/pages/pos.jsx
import Head from 'next/head';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

export default function POSModernPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const cartRef = useRef(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('%');
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    fetchProducts();
    inputRef.current?.focus();
    setTimeout(() => cartRef.current?.scrollTo(0, cartRef.current.scrollHeight), 0);
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Unauthorized');
      const data = await res.json();
      setFullName(data.name || data.email);
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/products`);
      if (!res.ok) throw new Error('โหลดสินค้าล้มเหลว');
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      console.error('โหลดสินค้าไม่สำเร็จ:', err);
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        return [...prev, { ...product, qty: 1 }];
      }
    });
    setTimeout(() => cartRef.current?.scrollTo({ top: cartRef.current.scrollHeight, behavior: 'smooth' }), 0);
    inputRef.current?.focus();
  };

  const clearCart = () => {
    setCart([]);
    inputRef.current?.focus();
  };

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discountedPrice = discountType === '%' ? Math.max(totalPrice * (1 - discount / 100), 0) : Math.max(totalPrice - discount, 0);

  const filtered = products.filter(p => {
    const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search);
    return matchSearch;
  });

  const calculateDiscountedPrice = (total, value, type) => {
    return type === '%' ? Math.max(total * (1 - value / 100), 0) : Math.max(total - value, 0);
  };

  const generateReceiptId = () => {
    const now = new Date();
    const ymdhms = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `RCPT-${ymdhms}-${Math.floor(Math.random() * 1000)}`;
  };

  const handleCheckout = async (method) => {
    const receiptId = generateReceiptId();
    const discountedPrice = calculateDiscountedPrice(totalPrice, discount, discountType);
    const payload = {
      cart,
      discount,
      discountType,
      totalPrice,
      discountedPrice,
      paymentMethod: method,
      cashier: fullName,
      receiptId,
      createdAt: new Date().toISOString()
    };

    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${API}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('บันทึกการขายล้มเหลว');
      setLastSale(payload);
      setShowSummary(true);
    } catch (err) {
      console.error('บันทึกการขายล้มเหลว:', err);
    }
  };

  const handlePrint = () => {
    if (!lastSale) return;
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;
    const itemsHtml = lastSale.cart.map(item => (
      `<tr><td>${item.name}</td><td>x${item.qty}</td><td>฿${item.qty * item.price}</td></tr>`
    )).join('');
    printWindow.document.write(`
      <html><head><title>ใบเสร็จ</title></head><body>
        <h2>ใบเสร็จรับเงิน</h2>
        <p>เลขที่ใบเสร็จ: ${lastSale.receiptId}</p>
        <p>พนักงาน: ${lastSale.cashier}</p>
        <p>วันที่: ${new Date(lastSale.createdAt).toLocaleString()}</p>
        <table style="width: 100%;">
          <thead><tr><th>สินค้า</th><th>จำนวน</th><th>รวม</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p>รวม: ฿${lastSale.totalPrice}</p>
        <p>ส่วนลด: ${lastSale.discountType === '%' ? lastSale.discount + '%' : '฿' + lastSale.discount}</p>
        <p><strong>สุทธิ: ฿${lastSale.discountedPrice}</strong></p>
        <p>ช่องทาง: ${lastSale.paymentMethod}</p>
        <hr/><p>ขอบคุณที่ใช้บริการ</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    setShowSummary(false);
    clearCart();
  };

  return (
    <>
      <Head><title>POS By 13yteX</title></Head>
      <div className="h-screen overflow-hidden bg-gray-100 flex flex-col">
        <header className="bg-violet-600 text-white flex justify-between items-center px-6 py-3">
          <h1 className="text-xl font-semibold">🛍️ ร้านค้าของฉัน</h1>
          <div className="flex gap-4 items-center">
          
            <span className="text-sm">พนักงาน: <strong>{fullName || 'ไม่ทราบชื่อ'}</strong></span>
            <div className="bg-white px-4 py-2 border-b flex items-center justify-between">
        <button onClick={() => router.push('/main')} className="text-sm text-violet-600 font-medium">← กลับสู่เมนูหลัก</button>
      </div>
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <div className="w-2/3 flex flex-col p-4 overflow-hidden">
            <div className="relative flex items-center gap-3 mb-3">
              <input
                type="text"
                placeholder="ค้นหาสินค้า หรือ สแกนบาร์โค้ด..."
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border rounded px-4 py-2"
              />
              <button className="absolute right-5 text-gray-400">🔍</button>
            </div>

            <div className="grid grid-cols-4 gap-4 overflow-auto pt-4">
              {filtered.map((p) => (
                <div key={p._id} onClick={() => addToCart(p)} className="bg-white p-4 rounded-lg shadow cursor-pointer hover:shadow-md text-center">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-2xl text-white" style={{ backgroundColor: '#ddd' }}>🎁</div>
                  <div className="font-medium text-gray-800 truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 leading-tight">SKU: {p.sku}</div>
                  <div className="text-sm text-violet-600 font-semibold">฿{p.price}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-1/3 bg-white p-4 rounded-xl shadow overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">รายการสินค้า</h2>
              <button onClick={clearCart} className="text-red-500 text-sm">🗑️ ล้างรายการ</button>
            </div>
            <div className="flex-1 overflow-auto space-y-4" ref={cartRef}>
              {cart.map((item) => (
                <div key={item._id} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center space-x-2 min-h-[64px]">
                  <div>
                    <div className="font-medium text-gray-700 truncate max-w-[120px] text-base leading-tight">{item.name}</div>
                    <div className="text-xs text-gray-500">฿{item.price} / ชิ้น<br/>SKU: {item.sku}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => decrementQty(item._id)} className="bg-white border px-3 py-1 rounded">−</button>
                    <input
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateQty(item._id, e.target.value)}
                      className="w-14 text-center border rounded px-2 py-1 appearance-none text-base leading-tight"
                    />
                    <button onClick={() => addToCart(item)} className="bg-white border px-3 py-1 rounded">+</button>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-800 whitespace-nowrap">฿{item.qty * item.price}</div>
                    <button onClick={() => removeFromCart(item._id)} className="text-gray-400 text-xs">✕</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-sm space-y-1 pt-2">
              <div className="flex justify-between"><span>จำนวนสินค้า:</span><span>{totalQty} ชิ้น</span></div>
              <div className="flex justify-between items-center">
                <span>ส่วนลด:</span>
                <span>{discountType === '%' ? `${discount}%` : `฿${discount}`}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-violet-700 mt-2"><span>รวมทั้งสิ้น:</span><span>฿{discountedPrice}</span></div>
              <button onClick={() => setShowDiscountModal(true)} className="bg-yellow-400 text-black w-full py-2 rounded mt-2 font-semibold">🎯 ตั้งค่าส่วนลด</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={() => handleCheckout('เงินสด')} className="bg-blue-500 text-white py-4 text-lg font-semibold rounded flex items-center justify-center gap-2">💵 เงินสด</button>
              <button onClick={() => handleCheckout('บัตร/QR')} className="bg-green-500 text-white py-4 text-lg font-semibold rounded flex items-center justify-center gap-2">💳 บัตร/QR</button>
            </div>
          </div>
        </main>

        {/* Discount Modal */}
        {showDiscountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-80 space-y-4">
              <h3 className="text-lg font-semibold">ตั้งค่าส่วนลด</h3>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 text-right"
                  placeholder="จำนวน"
                  defaultValue={discount}
                  id="discountInput"
                />
                <select
                  defaultValue={discountType}
                  id="discountType"
                  className="border rounded px-2 py-2"
                >
                  <option value="%">%</option>
                  <option value="฿">฿</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDiscountModal(false)} className="text-sm text-gray-500">ยกเลิก</button>
                <button
                  className="bg-violet-600 text-white px-4 py-2 rounded text-sm"
                  onClick={() => {
                    const value = document.getElementById('discountInput').value;
                    const type = document.getElementById('discountType').value;
                    handleDiscountConfirm(value, type);
                  }}
                >
                  ตกลง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Modal */}
        {showSummary && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow w-96 space-y-4">
            <h2 className="text-xl font-semibold">สรุปการขาย</h2>
            <p>เลขที่ใบเสร็จ: {lastSale.receiptId}</p>
            <p>พนักงาน: {lastSale.cashier}</p>
            <p>ช่องทาง: {lastSale.paymentMethod}</p>
            <div className="divide-y text-sm border rounded">
              {lastSale.cart.map(item => (
                <div key={item._id} className="flex justify-between px-2 py-1">
                  <span className="truncate max-w-[140px]">{item.name} x{item.qty}</span>
                  <span>฿{item.qty * item.price}</span>
                </div>
              ))}
            </div>
            <p>รวมเงิน: ฿{lastSale.totalPrice}</p>
            <p>ส่วนลด: {lastSale.discountType === '%' ? lastSale.discount + '%' : '฿' + lastSale.discount}</p>
            <p className="text-lg font-bold">สุทธิ: ฿{lastSale.discountedPrice}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSummary(false)} className="text-gray-500">แก้ไข</button>
              <button onClick={handlePrint} className="bg-violet-600 text-white px-4 py-2 rounded">ปริ้นใบเสร็จ</button>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
}
