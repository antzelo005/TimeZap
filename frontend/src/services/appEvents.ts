type Listener = () => void;

const dashboardListeners = new Set<Listener>();

export function notifyDashboardChanged(): void {
  dashboardListeners.forEach((listener) => listener());
}

export function subscribeDashboardChanged(listener: Listener): () => void {
  dashboardListeners.add(listener);
  return () => dashboardListeners.delete(listener);
}
