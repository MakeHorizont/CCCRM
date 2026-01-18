
import React, { useState, useRef, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { XMarkIcon, QrCodeIcon } from './Icons';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
  title?: string;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onScan, title = "Сканирование метки" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      if (!isOpen) return;
      setIsInitializing(true);
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsInitializing(false);
      } catch (err) {
        setError("Не удалось получить доступ к камере. Убедитесь, что разрешения даны.");
        setIsInitializing(false);
      }
    };

    if (isOpen) {
        startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  const simulateScan = () => {
      // Mock logic: return a random SKU or ID for testing
      const mockCodes = ['HI001', 'HI005', 'TMP001', 'CHIP002'];
      const randomCode = mockCodes[Math.floor(Math.random() * mockCodes.length)];
      onScan(randomCode);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg" zIndex="z-[100]">
      <div className="flex flex-col items-center space-y-4">
        {error ? (
          <div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200">
            <p className="font-bold">{error}</p>
            <Button variant="secondary" className="mt-4" onClick={onClose}>Закрыть</Button>
          </div>
        ) : (
          <div className="relative w-full aspect-square max-w-sm bg-black rounded-3xl overflow-hidden border-4 border-zinc-700 shadow-2xl">
            {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 z-10">
                    <LoadingSpinner size="lg" />
                </div>
            )}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* Scanner HUD Overlay */}
            <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-sky-400 rounded-lg relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white -ml-1 -mt-1"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white -mr-1 -mt-1"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white -ml-1 -mb-1"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white -mr-1 -mb-1"></div>
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50 animate-pulse"></div>
                </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-2 w-full max-w-sm">
            <p className="text-xs text-brand-text-muted text-center italic">
                Наведите камеру на QR-код партии или материала для автоматического ввода данных.
            </p>
            <Button 
                variant="secondary" 
                fullWidth 
                className="bg-sky-500/10 text-sky-500 border-sky-500/20" 
                onClick={simulateScan}
            >
                Симулировать успешное сканирование
            </Button>
            <Button variant="ghost" fullWidth onClick={onClose}>Отмена</Button>
        </div>
      </div>
    </Modal>
  );
};

export default ScannerModal;
