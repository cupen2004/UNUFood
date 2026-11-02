// UNUFood - Utility Formatters
// Currency, date, and other formatting functions

export const formatRp = (num) => {
  return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
};

export const formatSeconds = (totalSeconds) => {
  if (totalSeconds <= 0) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const generateOrderId = () => {
  return `ORD-${Date.now().toString().slice(-10)}`;
};

export const generatePickupCode = (facultyId) => {
  const randomHex = Math.floor(1000 + Math.random() * 9000);
  return `UNU-${facultyId}-${randomHex}`;
};
