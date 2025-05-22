// 📁 utils/sku.js
export function generateSKU() {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000); // สุ่ม 4 หลัก
  return `SKU-${ymd}-${rand}`;
}
