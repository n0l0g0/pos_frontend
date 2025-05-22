// 📁 frontend/pages/sales.jsx
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState([]);
  const [fullName, setFullName] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [receiptFilter, setReceiptFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${API}/sales`);
        if (!res.ok) throw new Error('Failed to load sales data');
        const data = await res.json();
        setSales(data);
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

    fetchSales();
    fetchUserInfo();
  }, []);

  const filteredSales = sales
    .filter(sale => {
      const saleDate = new Date(sale.createdAt);
      const matchesDate = dateFilter
        ? saleDate.toISOString().slice(0, 10) === dateFilter
        : true;
      const matchesReceipt = receiptFilter
        ? sale.receiptId?.toLowerCase().includes(receiptFilter.toLowerCase())
        : true;
      const matchesMonth = monthFilter
        ? `${saleDate.getFullYear()}-${(saleDate.getMonth() + 1).toString().padStart(2, '0')}` === monthFilter
        : true;
      return matchesDate && matchesReceipt && matchesMonth;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const displayedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalDisplayedAmount = displayedSales.reduce((sum, sale) => sum + sale.discountedPrice, 0);
  const paymentTotals = displayedSales.reduce((acc, sale) => {
    acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.discountedPrice;
    return acc;
  }, {});

  const paymentTotalSum = Object.values(paymentTotals).reduce((a, b) => a + b, 0);

  const chartData = filteredSales.reduce((acc, sale) => {
    const date = new Date(sale.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok' });
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.total += sale.discountedPrice;
    } else {
      acc.push({ date, total: sale.discountedPrice });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date) - new Date(b.date));

  const bestSellingProducts = filteredSales.reduce((acc, sale) => {
    sale.cart.forEach(item => {
      if (!acc[item.name]) {
        acc[item.name] = 0;
      }
      acc[item.name] += item.qty;
    });
    return acc;
  }, {});

  const bestSellersData = Object.entries(bestSellingProducts).map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

    const paymentMethodsData = Object.entries(paymentTotals).map(([method, total]) => {
        const percent = parseFloat(((total / paymentTotalSum) * 100).toFixed(2));
        return {
          name: method,
          value: percent,
          label: `${percent}%`
        };
      });

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F'];

  const handlePrintTable = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(displayedSales.map(s => ({
      Date: new Date(s.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' }),
      Receipt: s.receiptId,
      Total: s.totalPrice,
      Discount: s.discountType === '%' ? `${s.discount}%` : `฿${s.discount}`,
      Net: s.discountedPrice,
      Method: s.paymentMethod,
      Cashier: s.cashier
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');
    XLSX.writeFile(wb, 'sales_summary.xlsx');
  };

  return (
    <>
      <Head>
        <title>Sales Summary</title>
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #sales-table, #sales-table * {
              visibility: visible;
            }
            #sales-table {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
      </Head>
      <div className="bg-violet-600 text-white flex justify-between items-center px-6 py-3">
        <h1 className="text-xl font-semibold">📈รายงานการขาย</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm">พนักงาน: <strong>{fullName || 'ไม่ทราบชื่อ'}</strong></span>
          <button onClick={() => router.push('/main')} className="bg-white text-violet-600 px-4 py-1 rounded">กลับสู่เมนูหลัก</button>
        </div>
      </div>
      <div className="p-6">
        <div className="bg-white p-4 rounded shadow" id="sales-table">
          <div className="flex justify-between mb-4 gap-2">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="border px-2 py-1 rounded text-sm"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-2 py-1 rounded text-sm"
            />
            <input
              type="text"
              placeholder="Search by receipt ID"
              value={receiptFilter}
              onChange={(e) => {
                setReceiptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-2 py-1 rounded text-sm"
            />
          </div>
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Receipt ID</th>
                <th className="p-2 text-left">Total</th>
                <th className="p-2 text-left">Discount</th>
                <th className="p-2 text-left">Net</th>
                <th className="p-2 text-left">Payment</th>
                <th className="p-2 text-left">Cashier</th>
              </tr>
            </thead>
            <tbody>
              {displayedSales.map((sale, i) => (
                <tr
                  key={i}
                  className="border-b cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedSale(sale)}
                >
                  <td className="p-2">{new Date(sale.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}</td>
                  <td className="p-2">{sale.receiptId}</td>
                  <td className="p-2">฿{sale.totalPrice}</td>
                  <td className="p-2">{sale.discountType === '%' ? `${sale.discount}%` : `฿${sale.discount}`}</td>
                  <td className="p-2 font-bold">฿{sale.discountedPrice}</td>
                  <td className="p-2">{sale.paymentMethod}</td>
                  <td className="p-2">{sale.cashier || 'N/A'}</td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr><td colSpan="7" className="text-center p-4 text-gray-500">No sales data found</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-4">
            <p className="text-sm font-semibold">Total Net: ฿{totalDisplayedAmount.toLocaleString()}</p>
            <h3 className="text-sm font-semibold mt-2">Total by Payment Method:</h3>
            <ul className="text-sm">
              {Object.entries(paymentTotals).map(([method, amount]) => (
                <li key={method}>{method}: ฿{amount.toLocaleString()}</li>
              ))}
            </ul>
          </div>
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

        {selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Receipt Details</h3>
              <p><strong>Receipt ID:</strong> {selectedSale.receiptId}</p>
              <p><strong>Date:</strong> {new Date(selectedSale.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })}</p>
              <p><strong>Cashier:</strong> {selectedSale.cashier}</p>
              <p><strong>Payment Method:</strong> {selectedSale.paymentMethod}</p>
              <div className="mt-4">
                <h4 className="font-semibold">Items</h4>
                <ul className="text-sm list-disc list-inside">
                  {selectedSale.cart.map((item, idx) => (
                    <li key={idx}>{item.name} x{item.qty} - ฿{item.qty * item.price}</li>
                  ))}
                </ul>
              </div>
              <div className="text-right mt-4">
                <button onClick={() => setSelectedSale(null)} className="text-sm text-violet-600">Close</button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button onClick={handlePrintTable} className="bg-blue-600 text-white px-4 py-2 rounded">
            🖨️ Print Table
          </button>
          <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded">
            📄 Export Excel
          </button>
        </div>

        <div className="p-6">
        <div className="bg-white p-4 mt-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Daily Summary Chart</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="horizontal">
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 mt-6 rounded shadow">
          <h2 className="text-lg font-semibold mb-2">Top Selling Products</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bestSellersData} layout="horizontal">
              <XAxis dataKey="name" type="category" interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis type="number" />
              <Tooltip />
              <Bar dataKey="qty" fill="#34d399" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        </div>
        <div className="bg-white p-4 mt-6 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">Payment Method Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
            <Pie
          data={paymentMethodsData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ label }) => label}
        >
          {paymentMethodsData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
