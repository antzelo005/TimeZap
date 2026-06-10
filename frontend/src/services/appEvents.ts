type Listener = () => void;

const dashboardListeners = new Set<Listener>();
const notificationListeners = new Set<Listener>();

export function notifyDashboardChanged(): void {
  dashboardListeners.forEach((listener) => listener());
}

export function subscribeDashboardChanged(listener: Listener): () => void {
  dashboardListeners.add(listener);
  return () => dashboardListeners.delete(listener);
}

export function notifyNotificationsChanged(): void {
  notificationListeners.forEach((listener) => listener());
}

export function subscribeNotificationsChanged(listener: Listener): () => void {
  notificationListeners.add(listener);
  return () => notificationListeners.delete(listener);
}
