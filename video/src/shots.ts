// Размеры скриншотов (px). Сгенерировано из public/shots.
export const SHOTS = {
  "analytics-full": {
    "w": 2880,
    "h": 4254
  },
  "analytics": {
    "w": 2880,
    "h": 1800
  },
  "complete-dialog": {
    "w": 2880,
    "h": 1800
  },
  "mobile-order": {
    "w": 1170,
    "h": 2532
  },
  "mobile-overview": {
    "w": 1170,
    "h": 2532
  },
  "new-order": {
    "w": 2880,
    "h": 1800
  },
  "order-1041-full": {
    "w": 2880,
    "h": 4162
  },
  "order-1041": {
    "w": 2880,
    "h": 1800
  },
  "orders": {
    "w": 2880,
    "h": 1800
  },
  "overview-full": {
    "w": 2880,
    "h": 2966
  },
  "overview-tooltip": {
    "w": 2880,
    "h": 1800
  },
  "overview": {
    "w": 2880,
    "h": 1800
  }
} as const;
export type ShotName = keyof typeof SHOTS;
