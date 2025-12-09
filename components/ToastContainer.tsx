import React from 'react';
import { useStore } from '../store';
import Toast from './Toast';

const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useStore();

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </>
  );
};

export default ToastContainer;
