import { useServerStatus as useServerStatusContext } from '../contexts/ServerStatusContext';

export const useServerStatus = () => {
  return useServerStatusContext();
};


