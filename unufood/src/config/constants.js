// UNUFood - Application Constants
// Central configuration for app-wide settings

export const APP_CONFIG = {
  name: 'UNUFood',
  version: '2.0.0',
  storage_key: 'unufood_state_v2',
};

export const OPERATIONAL_HOURS = {
  open: '07:00',
  close: '10:00',
  delivery_time: '11:30 WIB',
};

export const FEES = {
  platform_fee: 1000,
  partner_commission: 0.10, // 10%
};

export const USER_ROLES = {
  CUSTOMER: 'customer',
  PARTNER: 'partner',
  ADMIN: 'admin',
};

export const ORDER_STATUS = {
  VERIFIED: 'verified',
  COOKING: 'cooking',
  DELIVERY: 'delivery',
  READY: 'ready',
  PICKED_UP: 'picked_up',
};

export const PAYMENT_METHODS = {
  QRIS: 'qris',
  GOPAY: 'gopay',
  SHOPEEPAY: 'shopeepay',
  DANA: 'dana',
};

export const DROPOFF_LOCATIONS = [
  {
    id: 'FTI',
    name: 'Fakultas Teknologi Informasi (FTI)',
    point: 'Lobby Gedung FTI Lt. 1',
    icon: '💻'
  },
  {
    id: 'FEB',
    name: 'Fakultas Ekonomi & Bisnis (FEB)',
    point: 'Gazebo Selatan Gedung FEB',
    icon: '📊'
  },
  {
    id: 'FKIP',
    name: 'Fakultas Keguruan & Ilmu Pendidikan (FKIP)',
    point: 'Meja Piket Hall Utama FKIP',
    icon: '📚'
  },
  {
    id: 'REKTORAT',
    name: 'Gedung Rektorat & Administrasi',
    point: 'Drop-Point Pos Keamanan Rektorat',
    icon: '🏛️'
  },
  {
    id: 'HALAL_CENTER',
    name: 'Halal Center & Laboratorium Terpadu',
    point: 'Selasar Gedung Lab Terpadu',
    icon: '🔬'
  }
];
