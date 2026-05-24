import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, ImagePlus, MapPin, RotateCcw } from 'lucide-react';
import { api, uploadWithStream } from '../lib/api.js';
import { useLocation } from '../hooks/useLocation.js';
import { useI18n } from '../context/I18nContext.jsx';
import AppLayout from '../components/AppLayout.jsx';
import BottomNav from '../components/BottomNav.jsx';
import ScanAnimation from '../components/ScanAnimation.jsx';

export default function UploadPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const { location, requestLocation } = useLocation();

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ step: 0, total: 7, message: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFile = async (selected) => {
    if (!selected) return;
    setError('');
    setResult(null);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    await requestLocation();
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append('file', file);
    if (location) {
      formData.append('latitude', String(location.latitude));
      formData.append('longitude', String(location.longitude));
      formData.append('gps_accuracy', String(location.accuracy));
    }
    return formData;
  };

  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setError('');
    setProgress({ step: 0, total: 7, message: 'Starting upload...' });

    const formData = buildFormData();
    let completed = false;

    const streamed = await uploadWithStream(formData, {
      onProgress: (data) => setProgress(data),
      onComplete: (data) => {
        completed = true;
        setResult({ ...data, id: data.id || data.receipt_id });
        setProgress({ step: 7, total: 7, message: 'Manifested! ✅' });
      },
      onError: (data) => {
        const message =
          typeof data === 'string'
            ? data
            : data?.message || (data instanceof Error ? data.message : '');
        if (message) setError(message);
      },
    });

    if (!streamed || !completed) {
      try {
        setProgress({ step: 2, total: 7, message: 'AI is scanning...' });
        const data = await api.uploadReceipt(formData);
        setResult(data);
        setProgress({ step: 7, total: 7, message: 'Manifested! ✅' });
        completed = true;
      } catch (err) {
        setError(err.message || 'Upload failed');
        setUploading(false);
        return;
      }
    }

    setUploading(false);
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setResult(null);
    setProgress({ step: 0, total: 7, message: '' });
    setError('');
    setUploading(false);
  };

  return (
    <>
      <AppLayout>
        <div className="px-5 pt-2 pb-4 space-y-6">
          <header>
            <h1 className="font-display text-2xl font-bold">📸 {t('upload.title')}</h1>
            <p className="text-sm text-ink/60 dark:text-dark-text/60 mt-1">{t('upload.subtitle')}</p>
          </header>

          {!preview && (
            <div className="space-y-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => cameraInputRef.current?.click()}
                className="w-full touch-target rounded-2xl gradient-primary text-white p-8 shadow-xl shadow-primary/30 flex flex-col items-center gap-3"
              >
                <Camera className="h-10 w-10" />
                <span className="font-display text-lg font-bold">{t('upload.takePhoto')}</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full touch-target glass-card rounded-2xl p-6 flex items-center justify-center gap-3"
              >
                <ImagePlus className="h-6 w-6 text-primary" />
                <span className="font-medium">{t('upload.chooseGallery')}</span>
              </motion.button>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {!uploading && !result && (
                <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-black/5 dark:bg-white/5">
                  <img src={preview} alt="Receipt preview" className="w-full h-full object-cover" />
                </div>
              )}

              {!uploading && !result && (
                <div className="flex items-center gap-2 text-sm text-ink/60 dark:text-dark-text/60">
                  <MapPin className="h-4 w-4" />
                  {location
                    ? `${t('upload.gpsLocked')} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
                    : t('upload.gpsUnavailable')}
                </div>
              )}

              {(uploading || result) && (
                <ScanAnimation
                  imageUrl={preview}
                  active
                  progress={progress}
                  result={result}
                />
              )}

              {error && (
                <p className="text-danger text-sm bg-danger/10 rounded-xl px-3 py-2">{error}</p>
              )}

              {!uploading && !result && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 touch-target glass-card rounded-2xl py-3 font-medium flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" /> {t('upload.retake')}
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={handleUpload}
                    className="flex-[2] touch-target rounded-2xl gradient-primary text-white py-3 font-display font-semibold shadow-lg shadow-primary/25"
                  >
                    {t('upload.scan')}
                  </motion.button>
                </div>
              )}

              {result && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex-1 touch-target glass-card rounded-2xl py-3 font-medium"
                  >
                    {t('upload.scanAnother')}
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/receipt/${result.id}`)}
                    className="flex-[2] touch-target rounded-2xl bg-secondary text-white py-3 font-display font-semibold"
                  >
                    {t('upload.viewDetails')}
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>
      </AppLayout>
      <BottomNav />
    </>
  );
}
