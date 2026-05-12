/**
 * O'quvchi kelgan sanasiga qarab shu oy uchun to'lov miqdorini hisoblaydi.
 * @param {Date} joinDate - O'quvchi kelgan sana
 * @param {number} monthlyPrice - Bir oylik to'lov miqdori
 * @param {string} targetMonth - Hisoblanayotgan oy (YYYY-MM formatida)
 * @returns {number} - Hisoblangan to'lov miqdori
 */
const calculateProRataFee = (joinDate, monthlyPrice, targetMonth) => {
  const date = new Date(joinDate);
  const joinYear = date.getFullYear();
  const joinMonth = date.getMonth() + 1; // 1-12
  const joinDay = date.getDate();

  const [targetYear, targetMonthNum] = targetMonth.split('-').map(Number);

  // Agar o'quvchi kelajakda keladigan bo'lsa (tanlangan oydan keyin)
  if (joinYear > targetYear || (joinYear === targetYear && joinMonth > targetMonthNum)) {
    return 0;
  }

  // Agar o'quvchi o'tgan oylarda kelgan bo'lsa, to'liq to'lov
  if (joinYear < targetYear || (joinYear === targetYear && joinMonth < targetMonthNum)) {
    return monthlyPrice;
  }

  // Agar o'quvchi aynan shu oyda kelgan bo'lsa, qolgan kunlarga qarab hisoblaymiz
  if (joinYear === targetYear && joinMonth === targetMonthNum) {
    const daysInMonth = new Date(targetYear, targetMonthNum, 0).getDate();
    const remainingDays = daysInMonth - joinDay + 1;
    
    // Pro-rata hisoblash
    const feePerDay = monthlyPrice / daysInMonth;
    return Math.round(feePerDay * remainingDays);
  }

  return monthlyPrice;
};

module.exports = { calculateProRataFee };
